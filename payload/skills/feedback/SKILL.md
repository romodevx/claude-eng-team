---
name: feedback
description: >
  Give feedback to a specific agent or the whole team; agents persist it in their
  user-scoped memory so it applies across ALL projects. Use on /feedback,
  "quiero dar feedback", "mejora al agente", "no vuelvas a".
---

# /feedback — Cross-Project Feedback

`/feedback <agent|team> <feedback>`

1. If for one agent: the agent records it in its persistent user memory
   (~/.claude/agent-memory/) under "## User Feedback" with date, feedback,
   action taken — and adjusts behavior in EVERY project from now on
2. If for the team: each relevant agent records it; also log in the current
   project's docs/team-improvements/FEEDBACK-[date].md
3. Confirm to the user exactly what changed
