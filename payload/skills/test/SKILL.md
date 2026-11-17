---
name: test
description: >
  Run the complete test suite. Use on /test, "corre los tests", "coverage".
---

# /test — @qa-sr (standards/testing.md)

1. Unit → integration (testcontainers) → contract (OpenAPI) → E2E (Playwright/Maestro).
2. Flag ON/OFF suites, RLS isolation suites, preset smokes.
3. Optional `/test load`: k6 against declared latency budgets (staging or prod-like only).
4. Coverage report; actionable items for failures; flaky tests flagged and quarantined.
