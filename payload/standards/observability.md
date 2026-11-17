# Standard: Observability & Operations
Owner: devops-sr (SRE/Platform) · Applies to every deployable service

- Logs: structured JSON (Go `slog`), levels, request/trace id on every line, no secrets/PII.
- Metrics: RED (rate, errors, duration) per endpoint and USE (utilization, saturation, errors)
  per resource; business KPIs from the PM's success metrics.
- Traces: OpenTelemetry SDK, W3C trace context propagated across HTTP/gRPC/queues; sampled.
- SLOs per user-facing service (e.g. availability 99.9%, p95 latency budget) with error
  budgets; alerts are multi-window burn-rate alerts on SLOs — not on CPU. Every page links a
  runbook. Error budget exhausted → feature freeze for reliability work.
- Runbooks: `docs/runbooks/<service>.md` — dashboards, alerts and their meaning, common
  failures, rollback, restore-from-backup steps, escalation.
- Incidents: blameless postmortem within 5 business days (`/postmortem`): timeline, impact,
  root causes (5 whys), what went well, action items with owners and dates.
- Progressive delivery: canary or percentage rollout (flags or traffic split) with automatic
  rollback on SLO burn; rollback procedure documented and rehearsed.
- Infrastructure as code (Terraform/OpenTofu or Pulumi) for every cloud resource; environments
  reproducible from code; no click-ops. State remote and locked; plans reviewed in PRs.
- Capacity & cost: capacity plan for expected peak × 2; cost per environment tracked with
  budgets and alerts; right-size after load tests.
