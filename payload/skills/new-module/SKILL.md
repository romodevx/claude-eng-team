---
name: new-module
description: >
  Executes the full Module Cycle for one module as an epic: spec → threat model → OpenAPI
  contract → data+RLS → backend TDD in Go → web/mobile frontend → feature flag → QA → gates →
  docs, delivered through story branches. Use whenever the user says /new-module, "siguiente
  módulo", "next module", "build the X module", or names a module from MODULES.md.
---

# /new-module — Module Cycle (an epic delivered with /story)

Order (standards/module-workflow.md), each step announced with agent + skill + why:
1. **Spec** — @product-owner: stories + acceptance criteria; flag key `module_<name>`.
2. **Threat model** — @security if user data/auth/payments.
3. **Contract** — @architect: extend `docs/api/openapi.yaml` (versioned, cursor pagination,
   problem+json); lint green.
4. **Data** — @db-sr: expand/contract migrations, RLS + isolation tests. Owner approves schema.
5. **Backend** — @backend-sr: TDD; resilience, idempotency, cache, rate limits.
6. **Frontend** — @frontend-sr (web) / @mobile-sr (mobile): TDD; generated client; useFlag;
   may start from the OpenAPI mock after step 3.
7. **Flag** — registered OFF in a migration; percentage rollout configured.
8. **QA** — @qa-sr: pyramid, flag ON/OFF, RLS, load budgets for critical endpoints.
9. **Gates** — tier 1 on each subtask PR, @code-reviewer on the story PR (`standards/review.md`);
   @tech-lead ∥ @security module gate.
10. **Docs** — @doc-writer.
Steps 3–10 run as `/story` deliveries (story branch, subtask PRs, PR to dev with owner's yes).
On any gate failure, loop back to the owning step.
