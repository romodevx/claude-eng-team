## Testing & TDD (NON-NEGOTIABLE)
- Order is always: failing test → minimal implementation → refactor under green. Production
  code without a prior failing test is a process violation: the work restarts. Hotfixes too.
- Pyramid: many unit (pure, no I/O), fewer integration (real DB via testcontainers), few E2E.
  Controlled test data: factories/fixtures, never production data.
- Contract tests for every endpoint against the OpenAPI document; consumer contract tests
  between services. Flag-aware suites: each module with its flag ON and OFF.
- RLS isolation tests for every user/tenant-scoped table (user A cannot read/write B).
- Load tests (k6) on critical endpoints before production, against declared latency budgets
  (p95/p99) and error rates.
- Deterministic only (no time/random/external state); every fixed bug leaves a regression test.
- Coverage ≥ 80% on business logic. **No task is done without passing tests.**
- Go: table-driven, testify, testcontainers-go. React/RN: Vitest or Jest + Testing Library;
  E2E with Playwright (web) and Maestro or Detox (mobile). Detail: `~/.claude/standards/testing.md`.
