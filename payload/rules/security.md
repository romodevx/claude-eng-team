## Security (mandatory on every change) — detail in `~/.claude/standards/security.md`
- STRIDE threat model BEFORE any feature touching user data, authentication or payments
  (`/threat-model`). Reviews against OWASP ASVS (level 2 default; L3 for payments/health).
- Validate ALL input at the boundary against the contract; parameterized queries only;
  CSRF on cookie-authenticated state changes; cookies Secure+HttpOnly+SameSite.
- No secret, private key or credential in code, repo, images or client bundles. Secrets from a
  vault or encrypted env; credentials rotated on a schedule and on any suspected leak.
- Production web and mobile builds: minified/obfuscated and WITHOUT source maps.
- CI: SAST (semgrep/gosec/CodeQL), dependency scan (govulncheck, npm audit/osv-scanner), secret
  scan (gitleaks); scheduled dependency updates (Renovate/Dependabot).
- RLS as defense-in-depth below application authz. Never log secrets or PII.
- The security agent gates every module flag and every deploy (BLOCK authority).
- Skills: security skills only if `skill-inspector` → APPROVE. None approved → report it,
  don't install.
