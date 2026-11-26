---
name: new-project
description: >
  Starts a software project from scratch to production with the autonomous team. Use whenever
  the user says /new-project, "nuevo proyecto", "create new project", "start from scratch",
  "quiero construir", or describes a product idea — even without the slash command.
---

# /new-project — Project from scratch to production

Announce every step: `▶ <agent> · <skill> · <what> — <why>`. Keep `.claude/handoff.md`.

## 1. Discovery — @pm
Clarifying questions → PRD (problem, users, metrics, scope, non-goals) → MODULES.md with flag
keys. Port via `/projects suggest-port`, confirmed with the owner.

## 2. Stories — @product-owner
Epics → stories with Given/When/Then acceptance criteria; BACKLOG.md.

## 3. Architecture — @architect + @db-sr
Default stack (Go+GORM, React, React Native) unless the owner said otherwise — a
contradiction → ask. **Database analysis → ADR** (model, queries, volume, consistency,
tenancy). Multi-tenancy ADR. C4. `docs/api/openapi.yaml` skeleton. Resilience/caching/rate-limit
design. Threat model with @security if user data/auth/payments.

## 4. Plan — @project-manager + @eng-manager, debate run by @scrum-master
Plan with epics → stories → tasks → subtasks (branch per subtask), dependencies, critical path,
estimates, risks. Role debate recorded in DEBATE-<epic>.md.
**Ask the owner: does this project have a staging environment?** Record the answer.

## 5. PLAN CHECKPOINT
Present PRD, stories, architecture + ADRs, stack, plan, risks, open questions.
`Status: waiting-approval`. Wait for explicit approval.

## 6. Foundation (story branch `story/0-foundation` from dev; create dev from main if missing)
Parallel where files don't overlap:
- @devops-sr: repo setup from `~/.claude/templates/github/` (CI, CODEOWNERS, PR template,
  Renovate), branch protection, IaC skeleton, environments, observability wiring.
- @db-sr: first migration (feature_flags with % rollout, RLS groundwork), backups/PITR plan.
- @backend-sr: Go layout (domain/usecase/adapter/infra), health endpoint (TDD), flag
  middleware, config from env, slog/OTel, rate limit + idempotency middleware.
- @frontend-sr / @mobile-sr: React / Expo scaffold, FlagsProvider, generated API client,
  hardened builds (no source maps).
- @doc-writer: project CLAUDE.md from `~/.claude/templates/project-CLAUDE.md`, README, ADR index.
Each subtask: branch → PR to the story branch → review tier 1 (`standards/review.md`).

## 7. Foundation gates → merge to dev
@qa-sr + @code-reviewer on the whole story (tier 2); @tech-lead + @security gates. Ask the owner before merging the story into `dev`.
Then deliver modules with `/story` (or `/new-module`) per the plan, and `/deploy` when ready.
