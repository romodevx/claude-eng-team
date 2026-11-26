## Codex First (token budget) — full protocol: `~/.claude/standards/codex.md`
Codex does the hands-on work; Claude plans, verifies and decides. Entry point:
`~/.claude/bin/codex-task <impl|explore|review|docs> <low|medium|high|xhigh> [repo] < brief`.
- Delegate: code changes (TDD inside Codex), exploration beyond ~3 file reads, subtask reviews
  (with a brief naming the risks), docs from decisions already made. Subagents too.
- Never delegate: planning and owner checkpoints, gate verdicts, visible `/qa`, git
  commit/push/merge, docker/integration/E2E runs, deploys, secrets or real data.
- Effort: `low` mechanical · `medium` default · `high` money, authz/RLS, concurrency,
  migrations · `xhigh` only after `high` failed on the same task.
- The brief is self-contained (Codex has none of the conversation). After it returns: read the
  report and `git diff`, run the tests yourself, commit yourself.
- Exit `3` = no quota: say "Codex out of quota until HH:MM; continuing" and go on from the
  working tree. `2` fix the call. `1` retry once if transient.
- Back from a quota handoff: review unreviewed `.claude/codex-fallback-*.log` first.
