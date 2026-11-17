# Standard: APIs
Owner: architect · Applied by: backend-sr · Checked by: qa-sr (contract), code-reviewer

- Spec-first: `docs/api/openapi.yaml` (OpenAPI 3.1) is written, reviewed and linted
  (redocly/spectral) BEFORE implementation; CI fails on lint errors or drift.
- Generated from the contract: server stubs/validation (oapi-codegen or kin-openapi), web and
  mobile clients (openapi-typescript/orval), mock server (Prism), reference docs (Redoc/Scalar).
- Versioning: URI major version (`/v1`). Additive changes only within a version; a breaking
  change = new version + ADR + deprecation window with `Deprecation`/`Sunset` headers.
- Pagination: cursor-based on every list (`?limit=&cursor=`, response `next_cursor`), opaque
  base64 cursors over a stable sort key; max limit enforced. No offset pagination on large sets.
- Errors: RFC 9457 `application/problem+json` envelope, stable `type`/`code`, correlation id;
  every endpoint documents its 4xx/5xx responses with examples.
- Security: every operation declares its security scheme; authz per object (no IDOR).
- Writes: `Idempotency-Key` header; `ETag`/`If-Match` for optimistic concurrency where updates
  can race.
- Rate limits: documented per endpoint; `429` + `Retry-After`.
- Contract tests: provider responses validated against the spec in CI; consumer-driven contract
  tests (Pact or schema-based) between services.
