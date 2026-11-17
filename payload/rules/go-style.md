---
paths:
  - "**/*.go"
  - "**/go.mod"
---
## Go Style Rules (The Go Programming Language + Effective Go)
- gofmt + golangci-lint clean, always
- Errors: explicit handling; wrap with %w; sentinel/typed errors in domain;
  never ignore returned errors
- context.Context: first parameter, propagated end to end; honor cancellation
- Interfaces: small, defined where consumed, discovered not pre-designed
- Composition over inheritance; no getters/setters cargo cult
- Goroutines: owner is responsible for lifecycle; use errgroup; no leaks
- Project layout: Clean Architecture (domain/ usecase/ adapter/ infra/);
  domain imports NOTHING from frameworks (including GORM)
- GORM default (pgx/sqlc only via ADR): WithContext always; explicit Preload (no N+1); versioned migrations
  (never AutoMigrate in shared envs); transactions for multi-writes;
  RLS session vars set per transaction
- Benchmarks (testing.B) + pprof when performance is a requirement
- Every outbound call has a context deadline; retries/circuit breakers per
  `~/.claude/standards/resilience.md`. Config from env (12-factor), never constants.
- Observability: slog structured logs, OpenTelemetry traces/metrics, request IDs propagated.
