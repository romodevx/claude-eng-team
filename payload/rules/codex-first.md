## Codex First (token budget, every project)

Codex (ChatGPT plan) does the hands-on work; Claude plans, verifies and decides.
Single entry point: `~/.claude/bin/codex-task <mode> <effort> [repo-dir] < brief`.
Codex already loads every rule here (generated `~/.codex/AGENTS.md`) and the repo's CLAUDE.md.

### Delegate first
- `impl` — any code change, TDD included (red → green → refactor inside Codex).
- `explore` — locating/understanding code that would take Claude more than ~3 file reads.
- `review` — second opinion on the uncommitted diff, BEFORE the tech-lead/security gates.
  Pass a brief naming the risks to check (the built-in no-brief review misses more).
- `docs` — README, ADR, module docs from decisions already made.
Applies to subagents too: an implementation subagent delegates its coding to codex-task.

### Never delegate
Planning and the owner's checkpoints · gate verdicts (tech-lead, security) · visible `/qa`
· git commits/push/merge · docker, testcontainers, integration/E2E runs · deploys, flags in
shared environments · anything touching secrets or real data.

### Effort (gpt-6-luna; the plan's quota is small)
- `low`: mechanical — renames, copy changes, wiring, simple tests, explore lookups.
- `medium` (default): normal feature or bugfix work.
- `high`: money, RLS/authz, state machines, concurrency, migrations, tricky algorithms.
- `xhigh`: only after a `high` attempt failed on the same task.

### The brief (Codex has none of Claude's conversation)
Self-contained: goal, exact paths, acceptance criteria, which tests to write first, the
commands to run, constraints and what NOT to touch. Long `impl` runs go in the background
(`run_in_background`); one `impl` per working tree at a time.

### After Codex returns — trust nothing, verify
1. Read the printed report and `git diff` — not the JSONL log (only when debugging).
2. Run the tests yourself, plus the integration/E2E suites Codex is not allowed to run.
3. Small corrections: fix directly. Real rework: one follow-up `impl` with precise feedback;
   after 2 failed rounds, take over.
4. Commit atomically yourself (conventional commits, on a branch — git-workflow.md).

### Exit codes
- `0` done → verify as above. `2` usage/refused (e.g. protected branch) → fix the call.
- `3` CODEX_UNAVAILABLE (quota) → say in one line "Codex sin cuota hasta HH:MM; sigo yo" and
  continue the SAME task from the current working tree; don't redo what Codex finished.
  The marker `~/.codex/.quota-exhausted-until` skips Codex until the reset.
- `1` other failure → read the tail; retry once if transient, otherwise do it yourself.

### Relevo automático (Claude sin cuota → Codex)
- Claude keeps `.claude/handoff.md` current on every multi-step task (format in CLAUDE.md).
  Set `Status: waiting-approval` at every checkpoint so Codex never runs past one.
- When a turn fails on `rate_limit`/`billing_error`, the StopFailure hook
  (`~/.claude/hooks/codex-fallback.py`) launches `codex-task impl medium` in the background
  with the handoff as brief, only on a non-protected branch with `Status: in-progress`, at most
  once per 30 min, and notifies the owner. Every failure is logged to
  `~/.claude/state/stopfailure.log`.
- Codex continues implementation only: no commits, merges, deploys, schema changes or new
  decisions; it appends a "Codex session" section to the handoff.
- When Claude is back, the SessionStart hook flags unreviewed `.claude/codex-fallback-*.log`:
  review and verify like any Codex run (steps above), commit, then rename the log `*.reviewed`.
