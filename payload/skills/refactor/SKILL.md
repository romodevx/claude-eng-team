---
name: refactor
description: >
  Canon-driven refactoring led by Tech Lead. Use on /refactor, "limpia", "mejora la calidad",
  "deuda técnica".
---

# /refactor

1. @tech-lead: smells against Clean Code/SOLID/Go idioms and the standards; plan; Big O wins.
2. @qa-sr: green baseline first (characterization tests where coverage is missing).
3. Small increments on subtask branches, tests green after each; review tier 1 per PR,
   @code-reviewer on the whole refactor (`standards/review.md`).
   With `review_tier: strict` in the project's CLAUDE.md: @code-reviewer on each subtask PR too.
4. @tech-lead final review; @doc-writer if public interfaces changed.
