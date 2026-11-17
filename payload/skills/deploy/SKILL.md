---
name: deploy
description: >
  Release and deployment pipeline dev → staging (if it exists) → production with QA, security
  and hardening gates, owner confirmation at every merge and deploy, progressive rollout and
  rollback. Use on /deploy, "ship it", "a producción", "release".
---

# /deploy

Every deploy and every merge into dev/main/master needs the owner's explicit yes.
1. Read the project CLAUDE.md: environments; staging exists? If not recorded → ask the owner.
2. @qa-sr: full suite incl. flag ON/OFF, RLS, load budgets for critical endpoints.
3. @security: pre-deploy review (gate checklist, newly enabled flags).
4. @devops-sr: hardening gates (no source maps, OpenAPI lint, SAST/SCA clean, container scan),
   immutable artifact, rollback command written.
5. **Ask** → deploy to staging (or dev env when there is no staging); @qa-sr smoke + presets.
6. Release PR `dev` → `main`/`master` (SemVer tag, CHANGELOG by @doc-writer). **Ask** to merge.
7. **Ask** → production deploy: canary/percentage rollout, watch SLO burn-rate; automatic
   rollback on breach. Report each step.
8. First deploy of a new project: `/projects register`.
