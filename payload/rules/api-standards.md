## API Standards (always) — detail in `~/.claude/standards/api.md`
- Spec-first: `docs/api/openapi.yaml` (OpenAPI 3.1) written and linted BEFORE implementation;
  frontend clients, mocks and API docs are GENERATED from it — single source of truth.
- Explicit versioning (`/v1`); breaking changes need a new version and an ADR.
- Cursor pagination on every list endpoint (opaque cursor + limit); no unbounded lists.
- One error envelope reused everywhere (RFC 9457 problem+json); every endpoint declares
  schemas with examples, error responses and its security scheme.
- Idempotency-Key header on state-changing endpoints; per-user rate limits answering
  `429` with `Retry-After`.
- Contract tests on every endpoint and between services.
