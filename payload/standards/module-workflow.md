# Module Workflow
- Backlog: epics → stories (with acceptance criteria) → tasks → subtasks, in
  `docs/project-specs/` (MODULES.md lists modules and their flag keys).
- A module is a vertical slice delivered as one story/epic branch. Fixed order per module:
  spec → threat model (if user data/auth/payments) → OpenAPI contract → data + RLS →
  backend (TDD) → web/mobile frontend → flag → QA → gates (code-reviewer + tech-lead +
  security) → docs.
- Backend always precedes frontend; frontend may start from the OpenAPI mock server once the
  contract is frozen.
- A module is DONE only when tests pass and both gates approve; only then may its flag be
  enabled in shared environments.
- A disabled module must be invisible and removable without breaking the others.
