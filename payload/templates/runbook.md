# Runbook — <service>
- Owner: <agent/person> · Last reviewed: YYYY-MM-DD · SLOs: <availability, latency>
- Dashboards: <links> · Logs: <query> · Traces: <link> · Deploy/rollback: <commands>

## Architecture in one paragraph
<what it does, dependencies (DB, cache, queues, third parties) and their timeouts/breakers>

## Alerts
| Alert | Meaning | First checks | Mitigation | Escalation |
|---|---|---|---|---|
| <SLO burn-rate fast> | <budget burning > 14×> | <dashboards, recent deploys, dependency health> | <flag off / rollback> | <owner> |

## Common failures
### <symptom>
- Diagnose (read-only): <commands/queries>
- Mitigate (needs owner's yes if it deploys/deletes/changes schema): <steps + rollback>

## Restore from backup (PITR)
<exact steps, target RPO/RTO, last restore drill date and result>

## Dependencies & contacts
<third-party status pages, support channels>
