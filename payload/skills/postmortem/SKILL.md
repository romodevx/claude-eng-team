---
name: postmortem
description: >
  Blameless postmortem after an incident or failed release. Use on /postmortem, "postmortem",
  "qué pasó en el incidente", after a /hotfix or a rollback.
---

# /postmortem <incident> — @devops-sr with @doc-writer

1. Template `~/.claude/templates/postmortem.md` → `docs/postmortems/YYYY-MM-DD-<slug>.md`.
2. Timeline from logs/alerts/commits; impact incl. SLO/error budget consumed.
3. Root causes via 5 whys on systems and process — never people.
4. Action items (prevent/detect/mitigate) with owner and due date → backlog; runbook updates.
5. Lessons into `lessons-learned/` and agent memories via `/feedback`.
