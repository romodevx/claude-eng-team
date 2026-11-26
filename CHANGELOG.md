# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com) and
[SemVer](https://semver.org).

## [0.2.0] — 2026-11-25

Less context spent per session, same gates. Upgrading: run `npx claude-eng-team` again.

### Changed (behavior)
- **Review tiers** (`standards/review.md`). Subtask PRs into a story branch get one light
  review — `codex-task review` with a risk brief, or the new `subtask-reviewer` agent without
  Codex — instead of qa-sr + code-reviewer every time. Subtasks touching auth/authz, money, RLS,
  migrations or crypto still get code-reviewer. qa-sr + code-reviewer (+ tech-lead/security)
  run once per story PR to `dev`; tech-lead + security still gate every module. Re-reviews read only the diff since the last verdict.
  `review_tier: strict` in a project's CLAUDE.md restores the 0.1.0 behavior.
- **Agent models:** code-reviewer, qa-sr, doc-writer, scrum-master and subtask-reviewer run on
  `sonnet`; architect, security and tech-lead on `opus`. The rest inherit the session model.
- **Always-loaded rules cut from ~24.7 KB to under 13 KB** (paid on every turn). The detailed
  codex, qa-browser, ci-local, module-workflow and feature-flags rules moved to
  `~/.claude/standards/` and are read on demand; documentation folded into the canon. The
  upgrade removes the old rule files it installed.
- Agents answer in ≤ 30 lines and keep full reports in `.claude/reviews/`.

### Added
- `rules/context-budget.md`: compact at story boundaries, report per story, read less output,
  one background watch per job.
- `standards/ci-local.md` gained "Watching CI runs and deploys" (no polling, summaries first).
- `subtask-reviewer` agent (17 agents).
- `test/budget.test.js` fails when the always-loaded set passes 13,000 bytes;
  `test/review-tiers.test.js` locks the tiers and models.

## [0.1.0] — 2026-11-17

### Added
- 16 role agents, always-loaded rules, on-demand standards, templates and team commands.
- `guard-actions` hook: Rule 0 blocks, approvals, per-project autonomy (`auto`/`review`),
  installs of new third-party software always confirmed.
- Optional Codex CLI delegation and automatic quota handoff.
- `npx claude-eng-team` installer: non-destructive (backups, settings merge, CLAUDE.md
  import), `uninstall`, `doctor`, `credits`; third-party skills fetched from their authors at
  pinned commits.
- The guard reads commands like a shell does (tokens, segments, heredocs, `sh -c`, `$(…)`) in
  linear time. Rule 0 also covers cherry-pick, revert, am and rebase, a `git checkout main`
  earlier in the same command, git aliases, and deleting a protected branch on the remote.
  Installs hidden behind `timeout`, `xargs`, `/usr/bin/env`, `python -I -m pip`,
  `go run mod@version` or a downloaded-then-executed script still ask.
- `--dry-run` lists every file and what would happen to it (new, replaced and backed up,
  import, merge). `doctor` exits non-zero when a check fails. An install that stops halfway
  explains how to resume or roll back.
- `--no-codex` leaves no Codex mention in the installed docs; `CLAUDE_CONFIG_DIR` installs
  point every doc and script at that directory.
- The guard also reads reserved words and groups (`if`, `for`, `{ }`, `!`, functions), heredocs
  fed to a shell, `sh -lc`, `find -exec`, `parallel`, `env -S`, `corepack`, chained and
  command-line git aliases, and follows the branch across subdirectories, `--track`, new
  worktrees and `cd $VAR`. Mirror and glob force pushes, `git branch -f main` and
  `git update-ref refs/heads/main` are blocked. `npm update`, `npm create`, an interpreter
  running `$(curl …)` and code from a fresh `git clone` ask. A guard error asks instead of
  letting the command through.
- `uninstall` also removes the download cache (now under the target home or
  `$XDG_CACHE_HOME`) and every folder the install created. `--dry-run` marks unchanged files
  and files you edited (`keep`). `doctor` names a missing guard and no longer runs `codex` or
  `claude` to detect them.
