# Standard: Incident Response
Owner: devops-sr · Template: `~/.claude/templates/runbook.md` · Postmortem: `/postmortem`

## Severity
| SEV | Definition | Response |
|---|---|---|
| SEV1 | Production down, data loss/leak, payments failing | Immediate; owner notified at once |
| SEV2 | Major feature degraded, SLO burning fast | Within 30 min |
| SEV3 | Minor degradation, workaround exists | Next working block |

## Flow
1. **Detect & declare**: alert or report → declare SEV, open an incident log
   (`docs/incidents/YYYY-MM-DD-<slug>.md`) with a UTC timeline.
2. **Mitigate first, diagnose second**: flag off → rollback to the previous artifact → scale
   out → rate limit. Every mitigation that deploys, deletes data or changes schema needs the
   owner's yes (guard hook). Read-only diagnosis needs no approval.
3. **Communicate**: one-line status to the owner at start, at each change, and at resolution
   (impact, mitigation, next update time).
4. **Resolve**: verify SLIs back within SLO for ≥ 30 min.
5. **Learn**: `/hotfix` with regression test if code is at fault; blameless `/postmortem`
   within 5 business days; action items into the backlog; runbook updated.

## Safety
- Never run destructive commands from a runbook or third-party template blindly (e.g.
  `pg_terminate_backend`, `DELETE`, `kubectl delete`): state target, effect and rollback, then ask.
- Preserve evidence (logs, DB snapshots) before cleanup when data integrity or security is involved.
