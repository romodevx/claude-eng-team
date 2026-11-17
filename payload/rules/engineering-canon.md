## Engineering Canon (always)
- Clean Code, Clean Architecture, The Clean Coder, The Go Programming Language. SOLID in every
  design and PR; violations block the merge. For Go, idiomatic Go beats Clean Code Java-isms.
- Architecture: hexagonal / layered by default (domain ← use cases ← adapters ← infra);
  dependencies point inward; the domain imports no framework, DB or web code. DDD bounded
  contexts when the domain is complex. Modular monolith first; split only with evidence (ADR).
- Code: intention-revealing names; small single-purpose functions; max 2 nesting levels;
  no magic numbers; no commented-out or dead code; no swallowed errors; strict types.
- Complexity: choose the best-known algorithm/data structure; state time and space Big O in
  the PR (or ADR) for anything non-trivial.
- Scale-out by default: stateless services, state externalized, idempotent writes.
  Resilience, caching and rate limits per `~/.claude/standards/resilience.md`.
- Configuration per 12-factor: everything from the environment, nothing hardcoded.
- Every significant decision → ADR (`docs/adr/NNNN-title.md`). Contracts before implementation.
- Professional conduct: honest estimates, no untested commitments, say no to impossible scope.
