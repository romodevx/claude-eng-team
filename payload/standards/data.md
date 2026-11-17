# Standard: Data & Databases
Owner: db-sr (DBA/Data) · Decided with: architect · Checked by: code-reviewer, security

## Choosing the database (ADR required)
Analyse and write down: data model (relational/document/graph/time-series/KV), dominant
query patterns (OLTP/OLAP, point/range/full-text/geo), volume and growth, read/write ratio,
consistency needs (strong/eventual, transactions across entities), latency targets, and
multi-tenancy requirements. Compare ≥ 2 options with trade-offs and operational cost.
Relational data with RLS → PostgreSQL preferred. Redis for cache/rate limits/ephemeral state.

## Modeling
- Normalize to 3NF first. Denormalize (materialized views, read models, JSONB) only with
  measured evidence (EXPLAIN ANALYZE + load test) recorded in the PR.
- PKs: UUIDv7 (or bigint identity) — never business data. Constraints, FKs, CHECKs, NOT NULL
  in the DB. Money: integer minor units or NUMERIC, never float. Timestamps: timestamptz UTC.
- Audit columns (created_at, updated_at, created_by); soft delete only where the domain
  needs it.

## Multi-tenancy (explicit ADR)
| Model | When |
|---|---|
| `tenant_id` + RLS (default) | many tenants, shared schema, moderate isolation needs |
| schema per tenant | per-tenant customization, tens–hundreds of tenants |
| database per tenant | regulatory/contractual isolation, noisy-neighbor risk |

## Row Level Security (every table with user/tenant data)
- `ENABLE` + `FORCE ROW LEVEL SECURITY` in the table's first migration.
- Policies per operation (SELECT/INSERT/UPDATE/DELETE) on
  `current_setting('app.current_tenant_id', true)` / `app.current_user_id`.
- App role: not owner, not superuser, not BYPASSRLS. Migrations run as a separate owner role.
- Backend sets `SET LOCAL app.current_*` inside every transaction (GORM: in the tx callback).
- Isolation tests per table: user/tenant A cannot SELECT/UPDATE/DELETE/INSERT rows of B.

## Transactions
- Explicit boundaries in the use case (Unit of Work); no implicit autocommit chains for
  multi-writes. Isolation level declared per use case: READ COMMITTED default, REPEATABLE
  READ / SERIALIZABLE (with retry on 40001) for invariants across rows. Short transactions; no
  network calls inside.

## Indexes & queries
- Index from real query patterns; verify with `EXPLAIN (ANALYZE, BUFFERS)` on realistic volume;
  keep the plan in the PR for critical queries. Right type: btree, GIN (jsonb/full-text),
  GiST (ranges/geo), BRIN (append-only time series), partial and covering indexes.
- No N+1 (explicit Preload/joins); no `SELECT *` on hot paths; keyset (cursor) pagination.

## Migrations — expand/contract, zero downtime
1. Expand: add nullable column/new table/new index `CONCURRENTLY`; deploy code that writes both.
2. Migrate: backfill in batches (idempotent, resumable, throttled).
3. Switch reads; verify. 4. Contract: drop old column in a LATER release.
- Never rename/drop/change type in one step; never lock big tables (set `lock_timeout`).
- Tools: golang-migrate or Atlas; versioned files; every migration reviewed with its
  rollback path. Schema changes need owner approval.

## Backups & recovery
- PITR enabled (WAL archiving / managed PITR) with retention per environment (prod ≥ 14 days).
- Scheduled restore drills (at least monthly) into an isolated environment, measured against
  RPO/RTO targets in the runbook. A backup never restored is not a backup.
