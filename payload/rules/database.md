## Data (always) — detail in `~/.claude/standards/data.md`
- The database is chosen per problem in an ADR (data model, query patterns, volume,
  consistency, multi-tenancy). Relational + RLS → PostgreSQL preferred.
- Normalize first; denormalize only with measured evidence. Constraints and FKs in the DB.
- Row Level Security on every table with user data: ENABLE + FORCE from the first migration;
  per-operation policies on `current_setting('app.current_*')`; app role is not owner and not
  BYPASSRLS; session vars set with `SET LOCAL` inside each transaction; isolation tests.
- Multi-tenancy isolation is an explicit ADR decision: schema-per-tenant, `tenant_id` + RLS,
  or database-per-tenant.
- Transactions: explicit boundaries and explicit isolation level per use case.
- Migrations: versioned, expand/contract, zero downtime, no destructive change in one step;
  never AutoMigrate in shared environments. Local migrations run freely; on a shared/remote
  database they need owner approval.
- Indexes from real queries, validated with EXPLAIN ANALYZE; right index type per pattern.
- Backups with PITR and scheduled, tested restores.
