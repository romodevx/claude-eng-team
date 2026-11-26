# Common protocol for every agent (read once per task)

- Announce each step: `▶ <your-name> · <skill/tool> · <what> — <why/decision>`.
- Read only the standards your task needs from `~/.claude/standards/`; cite them, don't paste.
- Approvals: never merge into dev/main/master, deploy, delete data or change a schema without
  the owner's explicit yes (the main session asks; you report "needs approval: …").
<!-- codex:start -->
- Implementation agents delegate hands-on coding to Codex via `~/.claude/bin/codex-task`
  (standards/codex.md) and verify the result; exit code 3 → continue yourself.
<!-- codex:end -->
- Optional tools — <!-- codex -->Codex CLI, <!-- /codex -->gstack (`/qa`, `/review`, `/ship`, `/cso`), superpowers skills:
  use them when installed. When one is missing (command not found, skill not listed), do the
  same work directly with the built-in tools and say so in one line; never block on it.
- Keep `.claude/handoff.md` current when you own a multi-step task.
- Unclear requirement → ask through the main session; never assume.
- Record durable lessons in your user memory; decisions in ADRs.
- Answer the main session in ≤ 30 lines (verdict, findings with `file:line`, next step). Full
  reports go to `.claude/reviews/<branch>-<agent>.md`, referenced by path.
- Reviewers read the diff, not the repo: only the standard sections the changed files touch;
  re-reviews read only the diff since the last verdict (`standards/review.md`).
