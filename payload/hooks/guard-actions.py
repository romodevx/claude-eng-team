#!/usr/bin/env python3
"""PreToolUse(Bash) guard: the owner's approvals, enforced before any command runs.

  deny  -> a new commit on dev/main/master (commit, cherry-pick, revert, am, rebase, also after
           a `git checkout main` earlier in the same command or through a git alias), a force
           push to them, deleting them on the remote (Rule 0).
  ask   -> installing new third-party software (ALWAYS, in every mode); push/merge into a
           protected branch, deploys, data deletion, migrations on a shared/remote database.
  allow -> everything when the project's autonomy is `auto` (except deny and installs).
Per-project autonomy lives in <repo>/.claude/autonomy: `auto` | `review` (absent = default).

Commands are read like a shell reads them (tokens, quotes, `;`/`&&`/`|` segments, heredocs,
`sh -c`, `$(...)`), never with backtracking regexes over the whole text: the guard runs in
linear time, so a long command cannot time the hook out and slip through.
Opt-out for a single session: CLAUDE_GUARD=off (owner only).
"""
import json
import os
import re
import itertools
import shlex
import subprocess
import sys

PROTECTED = ("dev", "main", "master")
SEPARATORS = {";", "&&", "||", "|", "|&", "&", "(", ")", "()", "((", "))", ";;", ";&", ";;&", "<(", ">("}
OPENERS = {"(", "<(", ">("}  # a process substitution is a subshell too
WRAPPERS = {"command", "builtin", "nohup", "time", "exec", "doas", "caffeinate", "corepack", "coproc"}
# Reserved words that start a command inside a group, condition or loop: `{ git commit; }`,
# `if ...; then npm i x; fi`, `for p in a; do npm i $p; done`, `! git commit`.
RESERVED = {"{", "}", "!", "if", "then", "else", "elif", "while", "until", "do"}
# wrapper -> its options that take a value (the value is a separate word)
VALUE_WRAPPERS = {
    "nice": {"-n", "--adjustment"},
    "stdbuf": {"-i", "-o", "-e"},
    "ionice": {"-c", "-n", "-p"},
    "timeout": {"-s", "--signal", "-k", "--kill-after"},
    "xargs": {"-n", "-I", "-i", "-L", "-l", "-P", "-d", "-s", "-E", "-e", "-a", "--arg-file",
              "--max-args", "--max-procs", "--delimiter", "--replace", "--max-lines"},
    "parallel": {"-j", "--jobs", "-S", "--sshlogin", "--delay", "-N", "-n", "-L", "-I", "--colsep",
                 "-C", "--joblog", "--results", "--timeout", "-a", "--arg-file"},
}
INPUT_FED = {"xargs", "parallel"}  # they append words read at run time
PARALLEL_INPUTS = {":::", "::::", ":::+", "::::+"}
FIND_EXEC = {"-exec", "-execdir", "-ok", "-okdir"}
XARGS_INPUT = "<xargs-input>"  # stands for the words xargs appends at run time
SHELLS = {"sh", "bash", "zsh", "dash", "ksh", "fish"}
INTERPRETERS = SHELLS | {"python", "python3", "node", "perl", "ruby", "php"}
DB_CLIENTS = {"psql", "mysql", "mariadb", "sqlite3", "sqlcmd", "cockroach", "duckdb", "clickhouse-client"}
MAX_DEPTH = 3

REMOTE_TARGET_RE = re.compile(
    r"\b(prod|production|staging|stg)\b"
    r"|://[^\s/@]*@(?!(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal|db|postgres)[:/\s])",
    re.IGNORECASE,
)
SQL_DANGER_RE = re.compile(r"\b(DROP\s+(TABLE|SCHEMA|DATABASE)|TRUNCATE)\b", re.IGNORECASE)
DELETE_RE = re.compile(r"\bDELETE\s+FROM\b", re.IGNORECASE)
WHERE_RE = re.compile(r"\bWHERE\b", re.IGNORECASE)
HEREDOC_RE = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_]\w*)\1")
SUBST_RE = re.compile(r"\$\(([^()]*)\)|`([^`]*)`")
# A download that IS the program: `bash -c "$(curl …)"`, `python3 -c "$(curl …)"`, `eval $(curl …)`,
# `source <(curl …)`, `bash <(curl …)`, `sh <<< "$(curl …)"`. Bounded gaps keep it linear.
_FETCH = r"(\$\(|`|<\()\s*(curl|wget)\b"
_INTERP = r"(?<![\w.-])((ba|z|da|k)?sh|python[\d.]*|node|perl|ruby|php)(?![\w.-])"  # not deploy.sh
# Only options between the interpreter and the download: after a script name or `-m mod`,
# the download is that program's data (`python3 -m json.tool <(curl …)`).
_FLAGS = r"(\s+[-+][oO]\s+\S+|\s+[-+][A-Za-z]+(?=\s))*?"
DOWNLOAD_RUN_RE = re.compile(
    rf"(\beval|\bsource|(^|[\s;&|(])\.)\s+[\"']?{_FETCH}"
    rf"|(^|[;&|]|\b(then|do|else))\s*[\"']?{_FETCH}"  # `$(curl …)` as the command itself
    rf"|{_INTERP}{_FLAGS}\s+[-+][A-Za-z]*[ceEr]\s+[\"']?{_FETCH}"
    rf"|({_INTERP}|\bsource){_FLAGS}\s+<\(\s*(curl|wget)\b"
    rf"|{_INTERP}{_FLAGS}\s*<<<\s*[\"']?{_FETCH}")
DB_RESET_TARGET_RE = re.compile(r"(db[-_:]?(reset|wipe|drop)|reset[-_:]?db)$", re.IGNORECASE)

# Total segments one judgement may read (aliases and `sh -c` included): past it, the guard
# asks instead of risking the hook's 15 s timeout.
SEGMENT_BUDGET = 2000
ASK_LIMIT = ("ask", "This command is too complex for the guard to judge; confirm it yourself.", "limit")
OPERATORS = sorted(["&&", "||", ";;&", ";;", ";&", "|&", ">>", "<<<", "<<", ">|", ">&", "<&", "&>>", "&>", "<>",
                    "<(", ">(",
                    "((", "))", "()", ";", "&", "|", "(", ")", "<", ">"], key=len, reverse=True)
ASK_INSTALL = ("ask", "Installing third-party software from the web always needs the owner's confirmation.", "install")


# ---------------------------------------------------------------- shell reading

def split_heredocs(cmd):
    """Return (command without heredoc bodies, [(owning line, body, delimiter quoted)]). O(lines)."""
    lines, kept, bodies, i = cmd.split("\n"), [], [], 0
    while i < len(lines):
        line = lines[i]
        kept.append(line)
        i += 1
        for match in HEREDOC_RE.finditer(line):
            body = []
            while i < len(lines) and lines[i].strip() != match.group(2):
                body.append(lines[i])
                i += 1
            i += 1  # the closing delimiter
            bodies.append((line, "\n".join(body), bool(match.group(1))))
    return "\n".join(kept), bodies


def tokenize(text):
    """Shell-like tokens; separators and redirections come out as their own tokens."""
    lexer = shlex.shlex(text.replace("\n", " ; "), posix=True, punctuation_chars=";&|()<>")
    lexer.whitespace_split = True
    lexer.commenters = ""
    try:
        tokens = list(lexer)
    except ValueError:  # unbalanced quotes: fall back to whitespace
        return text.replace("\n", " ; ").split()
    return [part for tok in tokens for part in split_operators(tok)]


def split_operators(tok):
    """shlex glues punctuation runs (`;(`, `)&&`, `|(`): split them into shell operators."""
    if not tok or not set(tok) <= set(";&|()<>") or tok in OPERATORS:
        return [tok]
    parts, i = [], 0
    while i < len(tok):
        op = next(o for o in OPERATORS if tok.startswith(o, i))
        parts.append(op)
        i += len(op)
    return parts


class Segment(tuple):
    """One simple command: (argv, piped from the previous one, files it writes, herestring,
    subshell depth change before it: +1 after `(`, -1 after `)`)."""
    argv = property(lambda self: self[0])
    piped = property(lambda self: self[1])
    written = property(lambda self: self[2])
    herestring = property(lambda self: self[3])


def segments(tokens, marks=None):
    """[Segment], redirections removed. With `marks` (a list), `(` and `)` are appended to it
    in order, interleaved with segment indexes, so callers can scope `cd` to subshells."""
    out, argv, piped, written, here, i = [], [], False, [], None, 0

    def flush():
        if argv:
            out.append(Segment((argv, piped, written, here)))
            if marks is not None:
                marks.append(len(out) - 1)

    while i < len(tokens):
        tok = tokens[i]
        if tok in SEPARATORS:
            flush()
            if marks is not None and tok in OPENERS | {")"}:
                marks.append("(" if tok in OPENERS else ")")
            argv, piped, written, here = [], tok in ("|", "|&"), [], None
        elif set(tok) <= set("<>&|") and ("<" in tok or ">" in tok):  # also `>|`
            if argv and argv[-1].isdigit():
                argv.pop()  # the fd number of `2>&1`
            if i + 1 < len(tokens):
                i += 1  # the redirection target (a file, the fd of `>&2`, a herestring)
                if tok == "<<<":
                    here = tokens[i]
                elif ">" in tok and not tokens[i].isdigit():
                    written.append(tokens[i])
        else:
            argv.append(tok)
        i += 1
    flush()
    return out


def unwrap(argv):
    """Drop env assignments and wrappers: `env X=1 sudo -E npm i x` -> `npm i x`.
    `xargs cmd` becomes `cmd <xargs-input>`: the words it appends are unknown, so a bare
    `xargs npm i` is judged as an install, not as a lockfile restore."""
    while argv:
        head = os.path.basename(argv[0])
        if argv[0] in RESERVED or re.match(r"^[A-Za-z_]\w*=", argv[0]):
            argv = argv[1:]
        elif argv[0] == "function":
            argv = argv[2:]  # `function f { ...`: the name, then the body
        elif head == "env":
            argv = unwrap_env(argv[1:])
        elif head == "sudo":
            argv = argv[1:]
            while argv and argv[0].startswith("-"):
                argv = argv[2:] if argv[0] in ("-u", "-g", "-C", "-p") else argv[1:]
        elif head in WRAPPERS:
            argv = argv[1:]
            while argv and argv[0].startswith("-"):
                argv = argv[1:]
        elif head in VALUE_WRAPPERS:
            argv = skip_options(argv[1:], VALUE_WRAPPERS[head])
            if head == "timeout" and argv:
                argv = argv[1:]  # the duration
            if head == "parallel":
                cut = next((i for i, a in enumerate(argv) if a in PARALLEL_INPUTS), len(argv))
                argv = argv[:cut]
            if head in INPUT_FED and argv:
                argv = argv + [XARGS_INPUT]
        else:
            return argv
    return argv


def unwrap_env(args):
    """Options and assignments of `env`; `-S 'npm i x'` splits its string into words."""
    while args and (args[0].startswith("-") or re.match(r"^[A-Za-z_]\w*=", args[0])):
        arg = args[0]
        split = None
        if arg in ("-S", "--split-string") and len(args) > 1:
            split, args = args[1], args[2:]
        elif arg.startswith("--split-string="):
            split, args = arg.split("=", 1)[1], args[1:]
        elif arg.startswith("-S") and len(arg) > 2:
            split, args = arg[2:], args[1:]
        else:
            args = args[2:] if arg in ("-u", "--unset", "-C", "--chdir", "-P", "-L", "-U") else args[1:]
        if split is not None:
            return tokenize(split) + args
    return args


def skip_options(args, value_flags):
    i = 0
    while i < len(args) and args[i].startswith("-") and args[i] != "-":
        if args[i] == "--":
            return args[i + 1:]
        i += 2 if args[i] in value_flags else 1
    return args[i:]


def program(argv):
    return os.path.basename(argv[0]) if argv else ""


def positionals(args, value_flags=()):
    """Non-option arguments, skipping the values of flags that take one."""
    out, skip = [], False
    for arg in args:
        if skip:
            skip = False
        elif arg == "--":
            continue
        elif arg.startswith("-"):
            skip = arg in value_flags
        else:
            out.append(arg)
    return out


# ---------------------------------------------------------------- git

def git_out(cwd, *args):
    """stdout of a read-only git query, '' on any failure."""
    try:
        out = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, timeout=3)
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


DETACHED = "(detached HEAD)"
MAX_ALIAS_DEPTH = 10
ALIAS_TOO_DEEP = "<alias-too-deep>"


class Repo:
    """Branch per repository: read once from git, then followed through the command
    (`git checkout main && cd src && git commit` commits on main). Keys are repository roots,
    so a subdirectory or `git -C .` sees the same branch. Aliases are read once per root."""

    def __init__(self):
        self._branches = {}
        self._worktrees = set()  # created by this command; they do not exist on disk yet
        self._roots = {}
        self._aliases = {}
        self.inherited_config = {}
        self.budget = SEGMENT_BUDGET

    def root(self, cwd):
        path = os.path.normpath(cwd)
        for candidate in [path, *self._ancestors(path)]:
            if candidate in self._worktrees:
                return candidate
        existing = next((d for d in [path, *self._ancestors(path)] if os.path.isdir(d)), path)
        if existing not in self._roots:
            self._roots[existing] = git_out(existing, "rev-parse", "--show-toplevel") or existing
        return self._roots[existing]

    @staticmethod
    def _ancestors(path):
        while os.path.dirname(path) != path:
            path = os.path.dirname(path)
            yield path

    def branch(self, cwd):
        key = self.root(cwd)
        if key not in self._branches:
            self._branches[key] = git_out(key, "branch", "--show-current")
        return self._branches[key]

    def aliases(self, cwd):
        key = self.root(cwd)
        if key not in self._aliases:
            listing = git_out(key, "config", "--get-regexp", r"^alias\.")
            pairs = (line.split(None, 1) for line in listing.splitlines())
            self._aliases[key] = {p[0].lower(): (p[1] if len(p) > 1 else "") for p in pairs}
        return self._aliases[key]

    def switch(self, cwd, sub, args):
        """Track `git checkout|switch` within the command being judged."""
        target = self._switch_target(cwd, sub, args)
        if target:
            self._branches[self.root(cwd)] = target

    def add_worktree(self, cwd, args):
        """`git worktree add <path> [<branch>]`: a later `cd <path>` lands on that branch."""
        created = next((args[i + 1] for i, a in enumerate(args[:-1]) if a in ("-b", "-B")), None)
        words = positionals(args, {"-b", "-B", "--reason"})
        if not words:
            return
        path = os.path.normpath(os.path.join(cwd, os.path.expanduser(words[0])))
        branch = created or (words[1] if len(words) > 1 else os.path.basename(path))
        self._worktrees.add(path)
        self._branches[path] = DETACHED if "--detach" in args else branch

    @staticmethod
    def _switch_target(cwd, sub, args):
        for i, arg in enumerate(args):
            if arg in ("-b", "-B", "-c", "-C", "--create", "--force-create", "--orphan") and i + 1 < len(args):
                return args[i + 1]
        if "--detach" in args or (sub == "switch" and "-d" in args):
            return DETACHED
        if "--" in args:
            if args.index("--") < len(args) - 1:
                return None  # `git checkout <tree> -- <paths>` restores files, it does not switch
            args = [a for a in args if a != "--"]
        words = ["-"] if "-" in args else positionals(args)
        if not words:
            return None
        name = words[0]
        if any(a in ("-t", "--track") or a.startswith("--track=") for a in args):
            return name.split("/", 1)[1] if "/" in name else name  # origin/main -> main
        if name == "-" or name.startswith("@{-"):
            return git_out(cwd, "rev-parse", "--abbrev-ref", "@{-1}") or None
        if name in PROTECTED or sub == "switch" or git_out(cwd, "rev-parse", "--verify", "--quiet", f"refs/heads/{name}"):
            return name
        return None  # a path: `git checkout README.md`


GIT_VALUE_OPTS = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}


def git_env_config(assigns):
    """Config git reads from the environment: GIT_CONFIG_COUNT/KEY_n/VALUE_n and
    GIT_CONFIG_PARAMETERS (`'alias.x'='commit'`)."""
    config = {}
    for n in range(int(assigns.get("GIT_CONFIG_COUNT", "0") or 0) if assigns.get("GIT_CONFIG_COUNT", "").isdigit() else 0):
        key = assigns.get(f"GIT_CONFIG_KEY_{n}")
        if key:
            config[key.lower()] = assigns.get(f"GIT_CONFIG_VALUE_{n}", "")
    for key, value in re.findall(r"'([^']+)'='([^']*)'", assigns.get("GIT_CONFIG_PARAMETERS", "")):
        config[key.lower()] = value
    return config


def git_split(argv, cwd, assigns=None):
    """(subcommand, args, cwd after -C, {key: value} from -c, --config-env and the env)."""
    assigns = assigns or {}
    i, config = 1, git_env_config(assigns)
    while i < len(argv) and argv[i].startswith("-"):
        if argv[i].startswith("--config-env="):
            key, _, var = argv[i].split("=", 1)[1].partition("=")
            config[key.lower()] = assigns.get(var, os.environ.get(var, ""))
        if argv[i] == "-C" and i + 1 < len(argv):
            target = os.path.expanduser(argv[i + 1])
            cwd = target if os.path.isabs(target) else os.path.join(cwd, target)
        if argv[i] == "-c" and i + 1 < len(argv) and "=" in argv[i + 1]:
            key, value = argv[i + 1].split("=", 1)
            config[key.lower()] = value
        i += 2 if argv[i] in GIT_VALUE_OPTS else 1
    return (argv[i] if i < len(argv) else ""), argv[i + 1:], cwd, config


def judge_push(args, branch):
    flags = [a for a in args if a.startswith("-")]
    short = "".join(f[1:] for f in flags if not f.startswith("--"))  # `-uf` = `-u -f`
    forced_flag = "f" in short or any(f == "--force" or f.startswith(("--force-with-lease", "--force-if-includes")) for f in flags)
    refs = positionals(args, {"--repo", "-o", "--push-option", "--receive-pack", "--exec"})[1:]
    deleting = "d" in short or "--delete" in flags
    for ref in refs:
        dst = ref.split(":")[-1].replace("refs/heads/", "")
        if (deleting or (ref.startswith(":") and len(ref) > 1)) and dst in PROTECTED:
            return "delete", dst
    if "--mirror" in flags:
        return "mirror", "every branch"
    if any(f in ("--all", "--branches") for f in flags):
        return ("deny" if forced_flag else "ask"), "every branch"
    targets = []
    for ref in refs or ["HEAD"]:
        plus = ref.startswith("+")
        dst = ref.lstrip("+").split(":")[-1].replace("refs/heads/", "")
        targets.append((branch if dst == "HEAD" else dst, plus))
    for dst, plus in targets:
        if "*" in dst:  # `+refs/heads/*:refs/heads/*` reaches every branch
            return ("deny" if forced_flag or plus else "ask"), "every branch"
        if dst in PROTECTED:
            return ("deny" if forced_flag or plus else "ask"), dst
    return None, None


def pr_base(args, cwd):
    """Base branch of the PR `gh pr merge` targets ('' if unknown)."""
    target = positionals(args, {"--subject", "-t", "--body", "-b", "--body-file", "-F", "--author-email", "-A", "--match-head-commit", "--repo", "-R"})
    cmd = ["gh", "pr", "view", *target[:1], "--json", "baseRefName", "-q", ".baseRefName"]
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=8).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


COMMITTING = {"commit", "cherry-pick", "revert", "am", "rebase"}
SEQUENCER_EXITS = {"--abort", "--quit", "--skip", "--show-current-patch", "--edit-todo"}


def expand_alias(sub, args, cwd, config, repo):
    """`git ci` -> ('commit', [...]); a `!`-alias -> its shell command. Follows chains
    (`a` -> `b` -> `commit`) and aliases defined with `git -c alias.x=...` on the line."""
    seen = set()
    while sub and sub not in seen and len(seen) < MAX_ALIAS_DEPTH:
        seen.add(sub)
        name = f"alias.{sub.lower()}"  # git alias names are case-insensitive
        alias = config.get(name) or repo.aliases(cwd).get(name, "")
        if not alias:
            return sub, args, None
        if alias.startswith("!"):
            return sub, args, alias[1:] + " " + " ".join(shlex.quote(a) for a in args)
        words = tokenize(alias)
        sub, args = (words[0] if words else ""), words[1:] + args
    if sub in seen:
        return "", args, None  # a loop: git refuses to run it
    return ALIAS_TOO_DEEP, args, None


def makes_commit(sub, args):
    if sub not in COMMITTING:
        return False
    if any(a in SEQUENCER_EXITS for a in args):
        return False
    return not (sub in ("cherry-pick", "revert") and any(a in ("-n", "--no-commit") for a in args))


def rewrites_protected(sub, args, cwd, branch):
    """`git branch -f main x`, `git branch -M x main` over an existing main, `git update-ref
    refs/heads/main x`: they move a protected branch without a commit on it."""
    if sub == "update-ref":
        words = positionals(args, {"-m"})
        return words[0].replace("refs/heads/", "") if words and words[0].startswith("refs/heads/") \
            and words[0].replace("refs/heads/", "") in PROTECTED else None
    if sub != "branch":
        return None
    words = positionals(args, {"-u", "--set-upstream-to", "-t", "--track"})
    if any(a in ("-f", "--force") for a in args) and words and words[0] in PROTECTED and words[0] != branch:
        return words[0]
    if any(a in ("-M", "-C") for a in args) and words:
        target = words[-1]
        exists = git_out(cwd, "rev-parse", "--verify", "--quiet", f"refs/heads/{target}")
        if target in PROTECTED and exists and (len(words) > 1 or target != branch):
            return target
    return None


def judge_git(argv, cwd, repo, depth=0, assigns=None):
    sub, args, cwd, config = git_split(argv, cwd, assigns)
    config = {**repo.inherited_config, **config}  # git passes -c down to `!`-aliases
    sub, args, shell_alias = expand_alias(sub, args, cwd, config, repo)
    if sub == ALIAS_TOO_DEEP:
        return ASK_LIMIT
    if shell_alias is not None:
        if depth >= MAX_DEPTH:
            return ASK_LIMIT
        saved, repo.inherited_config = repo.inherited_config, config
        try:
            return analyze(shell_alias, cwd, repo, depth + 1)
        finally:
            repo.inherited_config = saved
    if sub in ("checkout", "switch"):
        repo.switch(cwd, sub, args)
        return None
    if sub == "config":
        words = positionals(args, {"-f", "--file", "--blob", "--type", "--default"})
        if len(words) >= 2 and words[0].lower().startswith("alias."):
            repo.aliases(cwd)[words[0].lower()] = words[1]  # used later in the same command
        return None
    if sub == "worktree" and args[:1] == ["add"]:
        repo.add_worktree(cwd, args[1:])
        return None
    branch = repo.branch(cwd)
    rewritten = rewrites_protected(sub, args, cwd, branch)
    if rewritten:
        return "deny", f"Rule 0: '{rewritten}' only moves through a reviewed merge (git {sub}).", "rule0"
    on_protected = branch in PROTECTED
    if on_protected and makes_commit(sub, args):
        return "deny", f"Rule 0: no new commits on '{branch}' (git {sub}). Create a branch first (git checkout -b feature/...).", "rule0"
    if sub in ("fetch", "push") and positionals(args)[:1] == ["."]:
        moved = [r.lstrip("+").split(":")[-1].replace("refs/heads/", "") for r in positionals(args)[1:] if ":" in r]
        if any(dst in PROTECTED for dst in moved):  # `git fetch . x:main` moves local main
            return "deny", "Rule 0: a protected branch only moves through a reviewed merge.", "rule0"
    if sub == "push":
        decision, target = judge_push(args, branch)
        if decision == "delete":
            return "deny", f"Deleting the protected branch '{target}' on the remote is forbidden.", "rule0"
        if decision == "mirror":
            return "deny", "git push --mirror overwrites and deletes remote branches, protected ones included.", "rule0"
        if decision == "deny":
            return "deny", f"Force push to a protected branch ({target}) is forbidden.", "rule0"
        if decision == "ask":
            return "ask", f"Push into a protected branch ({target}) needs the owner's confirmation.", "approval"
    pulled = positionals(args, {"-X", "--strategy-option", "-s", "--strategy", "--depth", "-j", "--jobs", "-o", "--server-option"})[1:]
    if sub == "pull" and on_protected and any(r.split(":")[0] != branch for r in pulled):
        return "ask", f"Pulling another branch into protected branch '{branch}' needs the owner's confirmation.", "approval"
    if sub == "merge" and on_protected:
        return "ask", f"Merging into protected branch '{branch}' needs the owner's confirmation.", "approval"
    return None


# ---------------------------------------------------------------- installs

JS_VALUE_FLAGS = {"--filter", "-F", "--prefix", "-C", "--dir", "--workspace", "--registry", "--cache", "--loglevel", "--cwd"}
NPM_INSTALL_VERBS = {"install", "i", "in", "ins", "inst", "insta", "instal", "isnt", "isnta", "isntal", "isntall", "add"}
JS_UPGRADE_VERBS = {"update", "up", "upgrade", "udpate", "upgrade-interactive"}
PIP_VALUE_FLAGS = {"-r", "--requirement", "-c", "--constraint", "-e", "--editable", "-i", "--index-url",
                   "--extra-index-url", "-t", "--target", "--prefix", "-f", "--find-links", "--root"}
SYSTEM_PMS = {("brew", "install"), ("brew", "reinstall"), ("brew", "upgrade"), ("brew", "tap"),
              ("apt", "install"), ("apt-get", "install"), ("dnf", "install"), ("yum", "install"),
              ("zypper", "install"), ("apk", "add"), ("port", "install"), ("snap", "install"),
              ("flatpak", "install"), ("cargo", "install"), ("cargo", "add"), ("cargo", "binstall"),
              ("gem", "install"), ("deno", "install"), ("deno", "add"), ("composer", "require"),
              ("poetry", "add"), ("pdm", "add"), ("pipx", "install"), ("pipx", "run"), ("pipx", "inject"),
              ("mas", "install"), ("asdf", "install"), ("mise", "install"), ("mise", "use"),
              ("bundle", "add"), ("volta", "install")}


def local_bin(name, cwd):
    """True if node_modules/.bin/<name> exists in cwd or a parent (npx would run it locally)."""
    name = re.sub(r"(?<=.)@[^/]*$", "", name).split("/")[-1]
    path = os.path.abspath(cwd)
    while True:
        if os.path.exists(os.path.join(path, "node_modules", ".bin", name)):
            return True
        parent = os.path.dirname(path)
        if parent == path:
            return False
        path = parent


def judge_npx(args, cwd):
    if any(a in ("-y", "--yes", "-p", "--package") or a.startswith("--package=") for a in args):
        return ASK_INSTALL
    pkgs = positionals(args, {"-c", "--call"})
    return None if not pkgs or local_bin(pkgs[0], cwd) else ASK_INSTALL


def judge_js(prog, args, cwd):
    if any(a in ("-g", "--global", "--location=global") for a in args):
        verbs = positionals(args, JS_VALUE_FLAGS)
        if verbs and verbs[0] in NPM_INSTALL_VERBS | {"global"}:
            return ASK_INSTALL
    value_flags = JS_VALUE_FLAGS | ({"-w"} if prog == "npm" else set())
    words = positionals(args, value_flags)
    if not words:
        return None
    verb, rest = words[0], words[1:]
    if verb in ("dlx", "x") or (prog == "yarn" and verb == "global"):
        return ASK_INSTALL
    if verb == "create" or (verb == "init" and rest):
        return ASK_INSTALL  # `npm init vite` = `npx create-vite`: downloads and runs it
    if verb in JS_UPGRADE_VERBS:
        return ASK_INSTALL  # pulls versions the lockfile does not have
    if verb == "exec" and prog == "npm":
        return judge_npx(args[args.index("exec") + 1:], cwd)
    if verb == "add" or (verb in NPM_INSTALL_VERBS and rest):
        return ASK_INSTALL
    return None


def judge_pip(args):
    if not args or args[0] != "install":
        return None
    if any(a in ("-U", "--upgrade") for a in args):
        return ASK_INSTALL  # newer versions than the project pinned
    pkgs = positionals(args[1:], PIP_VALUE_FLAGS)
    local = lambda p: p == "." or p.startswith(("./", "../", "/", "~")) or p.endswith((".whl", ".tar.gz", ".zip"))
    return ASK_INSTALL if any(not local(p) for p in pkgs) else None


def judge_python_module(args):
    """`python3 -I -X utf8 -m pip install x`: interpreter options may come before -m."""
    i = 0
    while i < len(args) and args[i].startswith("-") and args[i] != "-m":
        i += 2 if args[i] in ("-X", "-W") else 1
    return judge_pip(args[i + 2:]) if args[i:i + 2] == ["-m", "pip"] else None


def judge_install(argv, cwd):
    prog, args = program(argv), argv[1:]
    words = positionals(args)
    if prog in ("npx", "bunx"):
        return judge_npx(args, cwd)
    if prog in ("npm", "pnpm", "yarn", "bun"):
        return judge_js(prog, args, cwd)
    if re.fullmatch(r"python[\d.]*", prog):
        return judge_python_module(args)
    if re.fullmatch(r"pip[\d.]*", prog):
        return judge_pip(args)
    if prog == "uv":
        if args[:2] == ["pip", "install"]:
            return judge_pip(args[1:])
        if words[:1] == ["add"] or words[:2] == ["tool", "install"]:
            return ASK_INSTALL
    if prog == "uvx":
        return ASK_INSTALL
    if prog == "go" and words[:1] == ["run"] and any("@" in w for w in words[1:2]):
        return ASK_INSTALL  # `go run module@version` downloads and runs third-party code
    if prog == "go" and words[:1] in (["get"], ["install"]):
        targets = words[1:]
        if words[0] == "get" and targets:
            return ASK_INSTALL
        if any("@" in t or not t.startswith(".") for t in targets):
            return ASK_INSTALL
    if words and (prog, words[0]) in SYSTEM_PMS:
        return ASK_INSTALL
    if prog == "pacman" and any(a.startswith("-S") for a in args):
        return ASK_INSTALL
    if prog == "claude" and (words[:2] == ["plugin", "install"] or words[:2] == ["mcp", "add"]):
        return ASK_INSTALL
    if prog == "gh" and words[:2] == ["extension", "install"]:
        return ASK_INSTALL
    if prog == "code" and "--install-extension" in args:
        return ASK_INSTALL
    return None


# ---------------------------------------------------------------- deploys, schema, data

def judge_ops(argv, text):
    prog, args = program(argv), argv[1:]
    words = positionals(args)
    first = words[0] if words else ""
    deploy = (
        (prog == "kubectl" and first in ("apply", "delete", "rollout", "scale"))
        or (prog == "helm" and first in ("install", "upgrade", "uninstall", "rollback"))
        or (prog in ("terraform", "tofu") and first in ("apply", "destroy"))
        or (prog == "pulumi" and first in ("up", "destroy"))
        or (prog in ("fly", "flyctl") and first == "deploy")
        or (prog == "vercel" and "--prod" in args)
        or (prog == "netlify" and first == "deploy" and "--prod" in args)
        or (prog in ("gcloud", "aws") and ("deploy" in words or "update-service" in words))
        or (prog == "eas" and first in ("submit", "update"))
        or (prog == "fastlane" and any(w in ("release", "deliver", "upload") or "upload" in w for w in words))
    )
    if deploy:
        return "ask", "Deploy/infrastructure change needs the owner's confirmation.", "approval"
    remote = REMOTE_TARGET_RE.search(text)
    migration = (
        (prog == "migrate" and any(w in ("up", "down", "goto", "force", "drop") for w in words))
        or (prog == "goose" and any(w in ("up", "down", "reset", "up-to", "down-to") for w in words))
        or (prog == "atlas" and first in ("schema", "migrate") and "apply" in words)
        or (prog == "prisma" and (words[:2] in (["migrate", "deploy"], ["migrate", "reset"], ["db", "push"])))
        or (prog == "alembic" and first in ("upgrade", "downgrade"))
        or (prog in ("sqlx", "sql") and words[:2] == ["migrate", "run"])
        or (prog in ("make", "just", "task", "npm", "pnpm", "yarn") and any("migrate" in w for w in words))
    )
    if migration and remote:
        return "ask", "Migration against a shared/remote database needs the owner's confirmation.", "approval"
    deletion = (
        prog == "dropdb"
        or (prog in ("docker", "docker-compose") and "down" in words and ("-v" in args or "--volumes" in args))
        or (prog == "docker" and words[:2] in (["volume", "rm"], ["volume", "prune"]))
        or (prog in ("make", "just", "task") and any(DB_RESET_TARGET_RE.search(w) for w in words))
        or (prog in ("npm", "pnpm", "yarn") and any(DB_RESET_TARGET_RE.search(w) for w in words))
        or (prog == "redis-cli" and any(w.upper() in ("FLUSHALL", "FLUSHDB") for w in words))
    )
    if deletion:
        where = "on a shared/remote database " if remote else ""
        return "ask", f"Deleting data {where}needs the owner's confirmation.", "approval"
    return None


def dangerous_sql(text):
    if SQL_DANGER_RE.search(text):
        return True
    return any(not WHERE_RE.search(stmt) for stmt in text.split(";") if DELETE_RE.search(stmt))


# ---------------------------------------------------------------- analysis

def short_flags(arg):
    """Letters of a short-option cluster (`-euc` or `+e` -> 'euc'/'e'), '' for anything else."""
    return arg[1:] if arg[:1] in ("-", "+") and not arg.startswith("--") and arg[1:].isalpha() else ""


SHELL_VALUE_FLAGS = {"-o", "+o", "-O", "+O", "--rcfile", "--init-file"}


def shell_script(argv):
    """The script of `sh -c '...'`, `bash -lc '...'`, `sh -ec '...'`; None if not one."""
    if program(argv) not in SHELLS:
        return None
    i = 1
    while i < len(argv):
        arg = argv[i]
        if arg in SHELL_VALUE_FLAGS:
            i += 2  # `bash -o pipefail -c ...`
            continue
        if "c" in short_flags(arg):
            return argv[i + 1] if i + 1 < len(argv) else ""
        if not arg.startswith(("-", "+")):
            return None  # `sh script.sh -c`: the -c belongs to the script
        i += 1
    return None


def reads_program_from_stdin(argv):
    """`... | bash`, `bash -s`, `sh <<< '...'`: a shell whose program comes from stdin."""
    return program(argv) in SHELLS and shell_script(argv) is None \
        and not positionals(argv[1:], SHELL_VALUE_FLAGS)


def heredoc_feeds_shell(line):
    """`bash <<'EOF'`, `sh -s <<EOF`, `cat <<EOF | bash`: the heredoc body is the program."""
    segs = segments(tokenize(line))
    owner = unwrap(segs[0].argv) if segs else []
    piped_shell = any(seg.piped and reads_program_from_stdin(unwrap(seg.argv)) for seg in segs[1:])
    return bool(owner) and (reads_program_from_stdin(owner) or piped_shell)


def join_continuations(cmd):
    """`git push \\<newline> --force` is one command, as the shell reads it."""
    return re.sub(r"\\\r?\n", " ", cmd)


def analyze(cmd, cwd, repo, depth=0):
    """All verdicts for a command string: [(decision, reason, kind)]."""
    cmd = join_continuations(cmd)
    verdicts = []
    if DOWNLOAD_RUN_RE.search(cmd):
        verdicts.append(ASK_INSTALL)
    stripped, bodies = split_heredocs(cmd)
    for line, body, quoted in bodies:
        if any(re.search(rf"\b{c}\b", line) for c in DB_CLIENTS) and dangerous_sql(body):
            verdicts.append(("ask", "Data deletion needs the owner's confirmation.", "approval"))
        if depth >= MAX_DEPTH:
            continue
        if heredoc_feeds_shell(line):
            verdicts += analyze(body, cwd, repo, depth + 1)  # `bash <<EOF ... EOF` runs the body
        elif not quoted:  # an unquoted body expands `$(...)` while it is read
            for inner in (m.group(1) or m.group(2) or "" for m in SUBST_RE.finditer(body)):
                verdicts += analyze(inner, cwd, repo, depth + 1)
    marks = []
    segs = segments(tokenize(stripped), marks)
    downloaded, cloned = set(), set()
    pipeline_has_download = False
    pipeline_has_db = False
    pipeline_sql = False
    stdin_text = None  # what `echo`/`printf` pipe into the next command
    dir_stack, subshells, cases = [], [], []
    for mark in marks:
        if mark == "(":
            subshells.append(cwd)
            continue
        if mark == ")":
            if cases and cases[-1] == len(subshells):
                continue  # `a)` closes a case pattern, not a subshell
            cwd = subshells.pop() if subshells else cwd  # a subshell's `cd` ends with it
            continue
        raw, piped, written, herestring = segs[mark]
        if raw[0] == "case":
            cases.append(len(subshells))
        elif raw[0] == "esac" and cases:
            cases.pop()
        repo.budget -= 1
        if repo.budget < 0:
            verdicts.append(ASK_LIMIT)
            return verdicts
        argv = unwrap(raw)
        if not argv:
            continue
        if not piped:
            pipeline_has_download = pipeline_has_db = pipeline_sql = False
        prog = program(argv)
        text = " ".join(raw)  # env assignments like APP_ENV=production still count
        fed = herestring if herestring is not None else (stdin_text if piped else None)
        stdin_text = " ".join(argv[1:]) if prog in ("echo", "printf") else None
        if fed and reads_program_from_stdin(argv) and depth < MAX_DEPTH:
            verdicts += analyze(fed, cwd, repo, depth + 1)  # `echo 'git commit' | bash`
        if prog in ("cd", "pushd") and positionals(argv[1:]):
            if prog == "pushd":
                dir_stack.append(cwd)
            cwd = change_dir(cwd, positionals(argv[1:])[0])
            continue
        if prog == "popd":
            cwd = dir_stack.pop() if dir_stack else cwd
            continue
        if prog == "find" and depth < MAX_DEPTH:
            for start in (i + 1 for i, a in enumerate(argv) if a in FIND_EXEC):
                inner = list(itertools.takewhile(lambda a: a not in (";", "+"), argv[start:]))
                verdicts += analyze(" ".join(shlex.quote(a) for a in inner), cwd, repo, depth + 1)
        if cloned and runs_cloned_code(argv, cwd, cloned):
            verdicts.append(ASK_INSTALL)
        if prog == "git":
            cloned |= cloned_dirs(argv, cwd)
        inner = shell_script(argv)
        if inner is not None and depth < MAX_DEPTH:
            if re.match(r"\s*(\$\(|`)\s*(curl|wget)\b", inner):
                verdicts.append(ASK_INSTALL)  # `bash -c "$(curl …)"`
            verdicts += analyze(inner, cwd, repo, depth + 1)
            continue
        if prog == "eval" and depth < MAX_DEPTH:
            verdicts += analyze(" ".join(argv[1:]), cwd, repo, depth + 1)
            continue
        for inner in (m.group(1) or m.group(2) or "" for m in SUBST_RE.finditer(text)):
            if depth < MAX_DEPTH:
                verdicts += analyze(inner, cwd, repo, depth + 1)
        # download | interpreter, or download to a file that a later segment executes
        if prog in ("curl", "wget"):
            pipeline_has_download = True
            downloaded |= download_targets(prog, argv[1:], written)
        elif piped and pipeline_has_download and prog in ("cat", "tee"):
            downloaded |= {os.path.basename(f) for f in written + (positionals(argv[1:]) if prog == "tee" else [])}
        elif piped and pipeline_has_download and runs_stdin_as_program(prog, argv[1:]):
            verdicts.append(ASK_INSTALL)
        elif downloaded and runs_file(argv, downloaded):
            verdicts.append(ASK_INSTALL)
        # SQL piped into or passed to a database client
        pipeline_has_db = pipeline_has_db or any(os.path.basename(a) in DB_CLIENTS for a in argv)
        pipeline_sql = pipeline_sql or any(dangerous_sql(a) for a in argv[1:])
        if pipeline_has_db and pipeline_sql:
            verdicts.append(("ask", "Data deletion needs the owner's confirmation.", "approval"))
        if prog == "git":
            assigns = dict(a.split("=", 1) for a in raw[:raw.index(argv[0])] if re.match(r"^[A-Za-z_]\w*=", a))
            verdict = judge_git(argv, cwd, repo, depth, assigns)
            if isinstance(verdict, list):  # a `!`-alias: every verdict of its shell command
                verdicts += verdict
                verdict = None
        elif prog == "gh" and positionals(argv[1:])[:2] == ["pr", "merge"]:
            base = pr_base(argv[3:], cwd)
            verdict = (("ask", f"Merging a PR into '{base or 'unknown base'}' needs the owner's confirmation.", "approval")
                       if base in PROTECTED or not base else None)
        else:
            verdict = judge_install(argv, cwd) or judge_ops(argv, text)
        if verdict:
            verdicts.append(verdict)
    return verdicts


CURL_VALUE_FLAGS = {"-o", "--output", "-H", "--header", "-d", "--data", "-u", "--user", "-X", "--request",
                    "-A", "--user-agent", "-e", "--referer", "-b", "--cookie", "-c", "--cookie-jar",
                    "-x", "--proxy", "-m", "--max-time", "-w", "--write-out", "-T", "--upload-file",
                    "-F", "--form", "--connect-timeout", "--retry", "-K", "--config", "-r", "--range"}
WGET_VALUE_FLAGS = {"-O", "--output-document", "-P", "--directory-prefix", "-o", "--output-file",
                    "-a", "--append-output", "-t", "--tries", "-T", "--timeout", "-U", "--user-agent",
                    "--header", "-e", "--execute"}


def url_file(url):
    return os.path.basename(url.split("?")[0].split("#")[0].rstrip("/"))


def download_targets(prog, args, written):
    """Files a curl/wget call leaves on disk (to see a later `sh <file>`)."""
    files = {os.path.basename(w) for w in written}
    value_flags = CURL_VALUE_FLAGS if prog == "curl" else WGET_VALUE_FLAGS
    out_flags = ("-o", "--output") if prog == "curl" else ("-O", "--output-document")
    files |= {os.path.basename(f) for f in output_files(args, out_flags, value_flags)}
    urls = [u for u in positionals(args, value_flags) if "://" in u or "." in u]
    remote_name = prog == "wget" and not any(a in out_flags for a in args)
    remote_name = remote_name or (prog == "curl" and any(
        a in ("-O", "--remote-name", "--remote-name-all") or (re.fullmatch(r"-[A-Za-z]+", a) and "O" in a)
        for a in args))
    if remote_name:
        files |= {url_file(u) for u in urls}
    return files - {"", "-", "/dev/null"}


def output_files(args, out_flags, value_flags):
    """`-o f`, `--output f`, `--output=f`, `-sSLo f`, `-sLof` (and wget's `-qO f`)."""
    short, long = out_flags
    for i, arg in enumerate(args):
        following = args[i + 1] if i + 1 < len(args) else ""
        if arg in out_flags:
            yield following
        elif arg.startswith(long + "="):
            yield arg.split("=", 1)[1]
        elif re.match(r"-[A-Za-z]", arg) and not arg.startswith("--"):
            for j, flag in enumerate(arg[1:], start=1):
                if flag == short[1]:
                    yield arg[j + 1:] or following
                    break
                if f"-{flag}" in value_flags:
                    break  # the rest of the word is that flag's value


PROGRAM_FLAGS = {  # an inline program or module: stdin is data, not code
    "python": {"-c", "-m"}, "node": {"-e", "--eval", "-p", "--print"}, "perl": {"-e", "-E"},
    "ruby": {"-e"}, "php": {"-r"},
}
INTERPRETER_VALUE_FLAGS = {"-X", "-W", "--require", "-r", "-I", "-o", "-O"}


def runs_stdin_as_program(prog, args):
    """`curl ... | sh` runs the download; `curl ... | python3 -m json.tool` only reads it."""
    family = "python" if re.fullmatch(r"python[\d.]*", prog) else prog
    if family not in INTERPRETERS and family != "python":
        return False
    if family in SHELLS:
        if any("s" in short_flags(a) for a in args):
            return True
        return not any("c" in short_flags(a) for a in args) and not positionals(args, {"-o", "-O"})
    if any(a in PROGRAM_FLAGS.get(family, set()) for a in args):
        return False
    words = positionals(args, INTERPRETER_VALUE_FLAGS if family != "php" else set())
    return not words or words[0] == "-" or "-" in args


def runs_file(argv, downloaded):
    """`sh i.sh`, `./i.sh`, `source i.sh`, `. i.sh`, `chmod +x i.sh` on a downloaded file."""
    prog = program(argv)
    if os.path.basename(argv[0]) in downloaded:
        return True
    if prog == "chmod":
        return any(os.path.basename(a) in downloaded for a in argv[1:])
    if prog in INTERPRETERS | {"source", "."} or re.fullmatch(r"python[\d.]*", prog):
        script = positionals(argv[1:], INTERPRETER_VALUE_FLAGS)[:1]  # `python3 a.py data.json`
        return any(os.path.basename(a) in downloaded for a in script)
    return False


CLONE_VALUE_FLAGS = {"-b", "--branch", "-o", "--origin", "--depth", "-c", "--config", "--reference",
                     "--template", "-u", "--upload-pack", "--separate-git-dir", "--filter", "-j", "--jobs",
                     "--shallow-since", "--shallow-exclude"}
BUILDERS = {"make", "just", "npm", "pnpm", "yarn", "bun", "pip", "pip3", "go", "cargo", "uv", "poetry"}


def cloned_dirs(argv, cwd):
    """The directory `git clone <url> [dir]` creates."""
    sub, args, cwd, _ = git_split(argv, cwd)
    words = positionals(args, CLONE_VALUE_FLAGS) if sub == "clone" else []
    if not words:
        return set()
    name = words[1] if len(words) > 1 else re.sub(r"\.git$", "", url_file(words[0]).split(":")[-1])
    return {os.path.normpath(os.path.join(cwd, name))}


def runs_cloned_code(argv, cwd, cloned):
    """Running a script, a build or an install from a repository cloned in this command:
    `git clone <url> && cd y && ./install.sh` runs third-party code like `curl | sh` does."""
    inside = lambda path: any(path == d or path.startswith(d + os.sep) for d in cloned)
    resolve = lambda word: os.path.normpath(os.path.join(cwd, os.path.expanduser(word)))
    prog = program(argv)
    if "/" in argv[0] and inside(resolve(argv[0])):
        return True
    if prog in INTERPRETERS | {"source", "."} or re.fullmatch(r"python[\d.]*", prog):
        return any(inside(resolve(a)) for a in argv[1:] if not a.startswith("-"))
    return prog in BUILDERS and inside(os.path.normpath(cwd))


def change_dir(cwd, target):
    """Where `cd <target>` lands. `$VAR` and `~` are expanded; if a word is still unknown
    (`$(...)`, `-`, an unset variable) the current directory is the best guess."""
    target = os.path.expandvars(os.path.expanduser(target))
    if "$" in target or target.startswith(("-", "~")):
        return cwd
    return target if os.path.isabs(target) else os.path.join(cwd, target)


def project_dir(cmd, cwd):
    """`cd <dir> && ...` runs in <dir>: the project whose autonomy applies."""
    segs = segments(tokenize(split_heredocs(join_continuations(cmd))[0]))
    if segs:
        argv = unwrap(segs[0][0])
        if program(argv) in ("cd", "pushd") and positionals(argv[1:]):
            return change_dir(cwd, positionals(argv[1:])[0])
    return cwd


def autonomy_mode(cwd):
    """Per-project mode from <repo>/.claude/autonomy: 'auto', 'review' or '' (not chosen)."""
    try:
        out = subprocess.run(["git", "-C", cwd, "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, timeout=3)
        root = out.stdout.strip() or cwd
        with open(os.path.join(root, ".claude", "autonomy"), encoding="utf-8") as fh:
            words = fh.read().split()
    except (OSError, ValueError, subprocess.SubprocessError):  # ValueError: not UTF-8
        return ""
    mode = words[0].lower() if words else ""
    return mode if mode in ("auto", "review") else ""


def decide(cmd, cwd):
    """Return (decision, reason) or None to let the command through."""
    verdicts = analyze(cmd, cwd, Repo())
    for decision, reason, _ in verdicts:
        if decision == "deny":
            return decision, reason
    for decision, reason, kind in verdicts:
        if kind in ("install", "limit"):  # asks in every mode
            return decision, reason
    mode = autonomy_mode(project_dir(cmd, cwd))
    first_ask = next(((d, r) for d, r, _ in verdicts if d == "ask"), None)
    if mode == "review":
        return first_ask or ("ask", "Project autonomy = review: every command is confirmed.")
    if mode == "auto":
        return "allow", "Project autonomy = auto (.claude/autonomy)."
    return first_ask


def main():
    if os.environ.get("CLAUDE_GUARD") == "off":
        return
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return
    if payload.get("tool_name") != "Bash":
        return
    cmd = (payload.get("tool_input") or {}).get("command", "")
    cwd = payload.get("cwd") or os.getcwd()
    try:
        verdict = decide(cmd, cwd)
    except Exception as err:  # a guard that crashes must not let the command through
        verdict = ("ask", f"The guard could not judge this command ({type(err).__name__}); confirm it yourself.")
    if not verdict:
        return
    decision, reason = verdict
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }}))


if __name__ == "__main__":
    main()
