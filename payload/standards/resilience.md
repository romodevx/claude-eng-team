# Standard: Scalability & Resilience
Owner: architect · Applied by: backend-sr, mobile-sr, devops-sr · Checked by: code-reviewer

## Scale-out by default
- Services are stateless: sessions, files, locks and queues live in external stores
  (Postgres/Redis/object storage/broker). Any instance can serve any request.
- Horizontal scaling first (replicas + load balancer); vertical only with evidence.
- Configuration per 12-factor: env vars / secret manager; one build artifact for every env.
- Graceful shutdown: stop accepting, drain in-flight work, honor SIGTERM within the grace period.

## Outbound calls (every HTTP/gRPC/DB/queue call)
- Deadline on every call via `context.WithTimeout`; no call without one. Default budgets are
  declared per dependency (e.g. internal 500 ms, third-party 2 s) and documented.
- Retries only for idempotent operations and transient errors (5xx, timeouts, 429 honoring
  `Retry-After`): exponential backoff with full jitter, max attempts ≈ 3, total time inside the
  caller's deadline. Never retry 4xx validation errors.
- Circuit breaker per dependency (e.g. sony/gobreaker): open on error-rate threshold, half-open
  probes, fallbacks defined (cached value, degraded response, or fast fail).
- Bulkheads: bounded pools/semaphores per dependency so one slow dependency can't exhaust all.

## Idempotency & consistency
- `Idempotency-Key` on every state-changing endpoint: store key + request hash + response for
  ≥ 24 h; same key + same body → same response; same key + different body → 422.
- Consumers are idempotent (dedupe by message id / natural key; upserts).
- Cross-service consistency:
  - **Transactional outbox**: write the business change and the event in one DB transaction;
    a relay publishes; consumers dedupe. Never "write DB then publish" without outbox.
  - **Sagas** (orchestrated by default) with explicit compensating actions for multi-service
    workflows; state persisted; timeouts per step.
  - Queues: at-least-once delivery assumed; DLQ with alerting; poison-message handling.

## Caching (whenever business rules allow staleness)
- Cache-aside by default; every key has an explicit TTL (with jitter) and a documented
  staleness budget. Key naming: `<service>:<entity>:<id>:v<schema>`.
- Stampede protection: singleflight (`golang.org/x/sync/singleflight`) per key, early
  probabilistic refresh or lock-based recompute for hot keys.
- Invalidation is controlled: on write, delete (not update) the key after commit, or via
  outbox events. Never cache per-user data under a shared key; tenant id is part of the key.
- Never cache authorization decisions longer than the session/token lifetime.

## Rate limiting
- Per user (or API key / tenant) on every endpoint; per IP on unauthenticated ones.
- Algorithm: token bucket (bursty APIs) or sliding window (strict quotas), backed by Redis
  for multi-instance correctness.
- Response `429 Too Many Requests` + `Retry-After` + `RateLimit-*` headers; limits documented
  in the OpenAPI contract.

## PR checklist
- [ ] Deadlines on all outbound calls  - [ ] Retries only where idempotent, with jitter
- [ ] Breaker + fallback per dependency  - [ ] Idempotency key on writes
- [ ] Outbox/saga where crossing services  - [ ] Cache TTL + stampede + invalidation
- [ ] Rate limit with 429/Retry-After  - [ ] No in-process state that breaks scale-out
