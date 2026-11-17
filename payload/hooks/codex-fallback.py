#!/usr/bin/env python3
"""Hand the current task to Codex when Claude runs out of quota, and hand it back.

  codex-fallback.py stopfailure   (StopFailure hook, matcher rate_limit|billing_error)
      If the project has .claude/handoff.md with "Status: in-progress", launch
      `codex-task impl` in the background with that handoff as the brief and notify
      the owner. Never on dev/main/master; at most once per DEBOUNCE window.
  codex-fallback.py sessionstart  (SessionStart hook)
      If Codex worked while Claude was away, tell Claude to review it first.

Policy: ~/.claude/rules/codex-first.md ("Relevo automático"). Opt-out: CLAUDE_CODEX_FALLBACK=off.
"""
import datetime
import json
import os
import pathlib
import re
import subprocess
import sys

CLAUDE_DIR = pathlib.Path(__file__).resolve().parent.parent  # wherever the team is installed
CODEX_TASK = os.environ.get("CODEX_TASK_BIN", str(CLAUDE_DIR / "bin" / "codex-task"))
EVENT_LOG = pathlib.Path(os.environ.get("CODEX_FALLBACK_EVENT_LOG", CLAUDE_DIR / "state" / "stopfailure.log"))
PROTECTED = {"dev", "main", "master"}
DEBOUNCE_SECONDS = 30 * 60
HANDOFF = ".claude/handoff.md"
LOG_GLOB = "codex-fallback-*.log"
EXCLUDES = (HANDOFF, ".claude/" + LOG_GLOB, ".claude/codex-fallback.lock")

BRIEF = """Claude Code ran out of quota in the middle of the task described in the handoff
below. Continue it from where it stopped, on the current branch.

- Do ONLY the next steps that are implementation work already decided in the plan.
- STOP before anything needing the owner's approval or a new decision: merges, deploys,
  schema changes on shared databases, data deletion, new dependencies, scope changes.
- TDD as always (failing test first). Do not commit; Claude reviews and commits on return.
- Before you finish, append to .claude/handoff.md a section "## Codex session {ts}" with:
  steps done, tests and their result, files touched, what remains, open questions.

----- HANDOFF (.claude/handoff.md) -----
{handoff}
----- git status -----
{status}
"""


def git(cwd, *args):
    out = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, timeout=5)
    return out.stdout.strip() if out.returncode == 0 else ""


def notify(title, message):
    if os.environ.get("CLAUDE_NOTIFY") == "off":
        return
    script = f'display notification {json.dumps(message)} with title {json.dumps(title)}'
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=5)


def exclude_from_git(root):
    exclude = pathlib.Path(root) / ".git/info/exclude"
    if not exclude.parent.is_dir():
        return
    current = exclude.read_text() if exclude.exists() else ""
    missing = [p for p in EXCLUDES if p not in current]
    if missing:
        exclude.write_text(current.rstrip("\n") + "\n" + "\n".join(missing) + "\n")


def log_event(payload):
    EVENT_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {"at": datetime.datetime.now().isoformat(timespec="seconds"),
             "error": payload.get("error"), "cwd": payload.get("cwd"),
             "message": (payload.get("last_assistant_message") or "")[:300]}
    with EVENT_LOG.open("a") as fh:
        fh.write(json.dumps(entry) + "\n")


def skip_reason(root, branch, handoff_text, lock):
    if os.environ.get("CLAUDE_CODEX_FALLBACK") == "off":
        return "disabled by CLAUDE_CODEX_FALLBACK=off"
    if not root:
        return "not a git repository"
    if branch in PROTECTED or not branch:
        return f"protected or detached branch '{branch}'"
    if not re.search(r"^Status:\s*in-progress\b", handoff_text, re.MULTILINE | re.IGNORECASE):
        return "no in-progress handoff"
    if lock.exists() and (datetime.datetime.now().timestamp() - lock.stat().st_mtime) < DEBOUNCE_SECONDS:
        return "Codex fallback already launched recently"
    return ""


def on_stop_failure(payload):
    log_event(payload)
    cwd = payload.get("cwd") or os.getcwd()
    root = git(cwd, "rev-parse", "--show-toplevel")
    branch = git(cwd, "branch", "--show-current") if root else ""
    handoff_path = pathlib.Path(root or cwd) / HANDOFF
    handoff_text = handoff_path.read_text() if handoff_path.exists() else ""
    lock = pathlib.Path(root or cwd) / ".claude/codex-fallback.lock"

    reason = skip_reason(root, branch, handoff_text, lock)
    if reason:
        notify("Claude sin cuota", f"Relevo a Codex no lanzado: {reason}.")
        return

    exclude_from_git(root)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    brief = BRIEF.format(ts=stamp, handoff=handoff_text, status=git(root, "status", "--short"))
    log_path = pathlib.Path(root) / ".claude" / f"codex-fallback-{stamp}.log"
    lock.touch()
    with log_path.open("w") as log:
        proc = subprocess.Popen([CODEX_TASK, "impl", "medium", root],
                                stdin=subprocess.PIPE, stdout=log, stderr=subprocess.STDOUT,
                                start_new_session=True, text=True)
        proc.stdin.write(brief)
        proc.stdin.close()
    notify("Claude sin cuota → Codex continúa",
           f"{pathlib.Path(root).name} @ {branch}. Log: .claude/{log_path.name}")


def on_session_start(payload):
    cwd = payload.get("cwd") or os.getcwd()
    root = git(cwd, "rev-parse", "--show-toplevel")
    if not root:
        return
    logs = sorted((pathlib.Path(root) / ".claude").glob(LOG_GLOB))
    if not logs:
        return
    names = ", ".join(f".claude/{p.name}" for p in logs)
    print(json.dumps({
        "systemMessage": f"Codex avanzó la tarea mientras Claude no tenía cuota ({names}).",
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                f"Codex continued the task while Claude was out of quota. Logs: {names}. "
                "BEFORE anything else: tell the owner, read .claude/handoff.md (Codex appended a "
                "session section) and the logs, review `git diff`, run the tests yourself plus the "
                "integration/E2E suites, fix or redo what is wrong, then commit per the rules. "
                "When reviewed, rename each log to *.reviewed so this notice stops."
            ),
        },
    }))


def main():
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        payload = {}
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "stopfailure":
        on_stop_failure(payload)
    elif mode == "sessionstart":
        on_session_start(payload)


if __name__ == "__main__":
    main()
