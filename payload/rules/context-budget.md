## Context budget (every project)
Every turn re-reads the whole conversation; spend it on purpose:
- **Reviews by tier** (git-workflow.md): full Claude reviewers once per story, not per subtask.
- **Compact at boundaries:** when a story merges or a plan is approved, update
  `.claude/handoff.md` and ask the owner for `/compact`.
- **Report per story**, not per step: full summaries only at checkpoints and story end.
- **Read less output:** quiet test reporters, `| tail -n 80`, only failed logs,
  `git diff --stat` first, files read by line range.
- **Subagents:** brief them with paths, not pasted content. They answer in ≤ 30 lines and write
  the detail to `.claude/reviews/<id>.md`.
- **Background work:** one blocking watch per job (`standards/ci-local.md`); never poll.
