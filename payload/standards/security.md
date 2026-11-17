# Standard: Security
Owner: security (Security Engineer, BLOCK authority) · Applies to every change

## Threat modeling (STRIDE) — before building
Required before any feature touching user data, authentication/authorization or payments
(`/threat-model`). Output `docs/security/threat-model-<feature>.md`: data-flow diagram, trust
boundaries, STRIDE table (threat → mitigation → test), residual risks accepted by the owner.

## Verification against OWASP ASVS (current 5.x)
- Chapter checklist mapped to our stack: `asvs-checklist.md`.
- Level 2 by default; Level 3 for payments, health or high-value data.
- Each module's gate maps relevant ASVS chapters (authn, session, access control, validation,
  crypto, errors/logging, data protection, API, config) to evidence (tests, config, code).

## Secrets
- Nothing secret in code, repo history, images, CI logs or client bundles. gitleaks pre-commit
  and in CI. Runtime secrets from a vault (Vault, AWS/GCP Secret Manager, Doppler, 1Password)
  or encrypted env (SOPS/age) — never plain .env in shared environments.
- Rotation: scheduled (≤ 90 days for long-lived credentials; prefer short-lived/OIDC tokens,
  e.g. GitHub OIDC to cloud) and immediate on suspected exposure, with a runbook.

## Builds
- Web: minified, tree-shaken, no source maps shipped; CI scans artifacts for `*.map` and
  `sourceMappingURL`.
- Mobile: Hermes bytecode; Android R8/ProGuard minify + obfuscation; iOS release stripped;
  source maps/dSYMs uploaded only to the crash reporter; no secrets in the app bundle (assume
  the binary is public); certificate pinning for high-risk apps.

## CI & dependencies
- SAST: gosec/golangci-lint security linters + semgrep (or CodeQL) on every PR.
- SCA: govulncheck, npm audit / osv-scanner; container scan (trivy/grype) on images.
- Scheduled updates: Renovate (preferred) or Dependabot, grouped weekly, auto-merge only
  patch updates of dev dependencies with green CI. Versions pinned; lockfiles committed.

## Standing rules
- AuthN: OIDC/OAuth2 or proven libraries; passwords argon2id/bcrypt; MFA for admin roles.
- Sessions/tokens short-lived; cookies Secure+HttpOnly+SameSite; CSRF on cookie auth.
- Authz checked per object in the use case; RLS as defense in depth.
- Logs: never secrets/PII; security events audited (login, permission change, exports).
- Encryption in transit (TLS 1.2+) and at rest.

## Skills
Only skills with a `skill-inspector` APPROVE verdict are installed; security skills have no
exceptions. If none qualifies, report it and build in-house.
