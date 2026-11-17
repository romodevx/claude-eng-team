# OWASP ASVS 5.0.0 checklist (May 2025) — mapped to our stack
Source: https://github.com/OWASP/ASVS/tree/master/5.0/en · Owner: security
Level: L2 by default; L3 for payments, health or high-value data. For each chapter that
applies, the module gate records evidence (test, config, code path, scan) — "N/A" needs a reason.

| Chapter | Check in our stack | Typical evidence |
|---|---|---|
| V1 Encoding & Sanitization | Context-aware output encoding (React escapes; no `dangerouslySetInnerHTML` without sanitizer); parameterized SQL (GORM placeholders); no shell/template injection | semgrep clean, tests with payloads |
| V2 Validation & Business Logic | Input validated against OpenAPI schemas at the edge; business invariants in use cases; anti-automation/limits on business flows | contract tests, use-case tests, rate limits |
| V3 Web Frontend Security | CSP, HSTS, X-Content-Type-Options, frame-ancestors; cookie flags; no secrets/source maps in bundles; SRI for third-party scripts | header tests, artifact scan |
| V4 API & Web Service | Authz on every operation; content-type checks; HTTP method restrictions; GraphQL/WebSocket limits if used | contract + authz tests |
| V5 File Handling | Size/type limits, content sniffing, storage outside webroot, signed URLs, antivirus where needed | upload tests |
| V6 Authentication | OIDC/proven library; argon2id/bcrypt; MFA for admins; credential stuffing protection; secure recovery | auth tests, config |
| V7 Session Management | Short-lived sessions, rotation on login/privilege change, server-side revocation, idle/absolute timeouts | session tests |
| V8 Authorization | Deny by default; per-object checks in use cases (no IDOR); RLS as defense in depth; tenant isolation | authz matrix tests, RLS isolation tests |
| V9 Self-contained Tokens | JWT: pinned algorithms, `aud`/`iss`/`exp` validated, key rotation, no sensitive claims | token validation tests |
| V10 OAuth & OIDC | PKCE, exact redirect URIs, state/nonce, token storage (secure storage on mobile) | flow tests, config |
| V11 Cryptography | Vetted libraries only; no custom crypto; keys in KMS/vault; secure randomness | code review, gosec |
| V12 Secure Communication | TLS 1.2+ everywhere incl. internal; HSTS; certificate validation never disabled | config, scans |
| V13 Configuration | 12-factor config; secrets in vault with rotation; debug off in prod; dependency pinning + SCA; hardened containers | CI scans, IaC review |
| V14 Data Protection | Data classification; PII minimization; encryption at rest; no sensitive data in logs/URLs/caches; retention & deletion | data inventory, log review |
| V15 Secure Coding & Architecture | Threat model done; dependency hygiene; least privilege; safe concurrency (no TOCTOU on money/stock) | threat model doc, review |
| V16 Security Logging & Error Handling | Security events audited; problem+json errors without internals; logs tamper-resistant; alerts on abuse | log tests, alert config |
| V17 WebRTC | Only if the project uses WebRTC: TURN auth, media encryption, signaling authz | N/A unless used |
