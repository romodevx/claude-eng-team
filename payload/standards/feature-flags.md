# Feature Flags & Progressive Delivery
- Every module ships behind a flag `module_<name>` (snake_case), default OFF, registered in a
  migration. Server-side check is the security boundary (disabled routes → 404); the frontend
  check is UX only, through a single FlagsProvider/useFlag — never scattered conditionals.
- Presentation presets (named flag sets) show exactly the modules I choose for a demo; every
  preset has an E2E smoke.
- Gradual rollout: flags support percentage and cohort targeting (stable hash of user/tenant
  id); deploys go canary or by percentage with automatic rollback on SLO burn, and a written
  rollback step. Rollback = flag off first, redeploy second.
- Enabling a flag in staging/production requires the module's security and tech-lead gates
  and my confirmation.
- Permanently-GA modules: remove the dead flag (scheduled tech-debt task).
