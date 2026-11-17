---
name: adr
description: >
  Records an architecture decision as an ADR. Use on /adr, "registra la decisión", "documenta
  por qué elegimos", or whenever a significant technical decision (stack, database, pattern,
  dependency, breaking change) is made.
---

# /adr <title> — @architect (with @tech-lead)

1. Next number from `docs/adr/` (4 digits). Template: `~/.claude/templates/adr.md`.
2. Context with requirements; ≥ 2 options with pros/cons/cost (Big O where relevant); decision;
   consequences and how to reverse it.
3. Status `proposed` → present to the owner → `accepted` after approval.
4. Update `docs/adr/README.md` index; supersede older ADRs explicitly.
