## Context budget (every project)
Every turn re-reads the whole conversation, so tokens go to long sessions, subagents and output read:
- **Reviews by tier** (git-workflow.md): Claude review agents run once per story/epic, not per
  subtask. Never re-run a review on a diff it already approved.
- **Compact at boundaries:** when a story merges or a plan is approved, update
  `.claude/handoff.md` and ask the owner for `/compact`. Don't wait for a full context.
- **Report per story**, not per step: full summaries only at checkpoints and story end.
- **Read less output:** quiet test reporters, `| tail -n 80`, only failed logs,
  `git diff --stat` first, files read by line range.
- **Subagents:** brief them with paths, not pasted content. They answer in ≤ 30 lines and write
  the detail to `.claude/reviews/<id>.md`.
- **Background work:** one blocking watch per job (`standards/ci-local.md`); never poll.
