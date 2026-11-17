---
name: hotfix
description: >
  Urgent production fix, fast-track but still test-first and with owner approvals. Use on
  /hotfix, "urgente", "producción caída", "critical bug".
---

# /hotfix

1. @qa-sr + owning engineer: reproduce, root cause (superpowers:systematic-debugging or gstack
   /investigate). Mitigate first if possible (flag off / rollback — owner confirms).
2. Branch `hotfix/<id>-<slug>` from `main`/`master`. Failing regression test FIRST, then fix.
3. @code-reviewer express review; @security quick scan if auth/data involved.
4. PR → `main`/`master` (**owner confirms**), deploy (**owner confirms**), then back-merge
   to `dev` (**owner confirms**).
5. @doc-writer: `/postmortem` (blameless) within 5 business days; lessons-learned/.
