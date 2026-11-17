# Standard: Testing
Owner: qa-sr (QA/SDET) · Applies to everyone · Gate: no task is done without passing tests

## Pyramid and tools
| Level | Go | React web | React Native |
|---|---|---|---|
| Unit (pure, no I/O, ms) | testing + testify, table-driven | Vitest + Testing Library | Jest + RN Testing Library |
| Integration (real deps) | testcontainers-go (Postgres, Redis, broker) | MSW against the generated client | MSW / Jest |
| Contract | kin-openapi validation, Pact/schema consumer tests | generated client types | generated client types |
| E2E (few, critical journeys) | — | Playwright | Maestro (default) or Detox |
| Load | k6 | Lighthouse CI (CWV budgets) | startup/bundle budgets |

## Rules
- TDD order (failing test first) — see rules/testing.md.
- Controlled test data: builders/factories per aggregate, seeded and deterministic; each test
  owns its data (transaction rollback or fresh container schema); never production data.
- Deterministic: inject clocks and random sources; no sleeps — wait on conditions.
- RLS isolation suite per user/tenant table. Flag ON/OFF suite per module. Preset smoke E2E.
- Every bug fixed → regression test that failed before the fix.

## Load testing (before production, critical endpoints)
- Each critical endpoint declares its budget in the plan: p95, p99 latency, error rate,
  throughput (e.g. p95 ≤ 200 ms, p99 ≤ 500 ms, errors < 0.1% at expected peak × 2).
- k6 scenarios: smoke, load (expected peak), stress (to breaking point), soak (≥ 1 h for
  services with caches/pools). Run against staging (or a prod-like env); results in the PR.
- Failing a budget blocks the release.

## CI scoping
- Run only the affected suites per path (Go packages changed, frontend app changed) on PRs;
  full suite on merge to `dev` and on release PRs. Coverage ≥ 80% business logic.
