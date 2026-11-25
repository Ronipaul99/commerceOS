# M01.10 operational runbook

## Open the local report

The API and worker write structured error observations to process stdout. Errors are limited to one log per operation per second while counters retain every recorded outcome. Set `BUSINESSOS_TELEMETRY_LOCAL=1` only in a disposable or access-controlled diagnostic environment to include success spans. Use the existing service log controls to save a bounded sample. Open the report from the BusinessOS root after building the telemetry package.

```powershell
pnpm.cmd --filter '@businessos/telemetry' build
Get-Content .turbo/telemetry-local.jsonl | node scripts/telemetry/report.mjs
Get-Content .turbo/telemetry-local.jsonl | node scripts/telemetry/report.mjs '<32-character-trace-id>'
```

The first view groups activity, errors, denials and measured mean duration by service and operation. The second shows trace and span identifiers with their parent relationships. Input is limited to 10,000 lines. Success samples and a service-complete capture are required for interpretable latency and success rates. Default stdout is error-only. Trace history kept in the process is bounded to 256 observations. The in-process metrics use aggregate counters, histograms and queue gauges. No tenant-facing view, network collector or paging destination is enabled.

## Triage

| Evidence | Owner role | First response |
|---|---|---|
| `/health` fails | Platform On-call | Confirm process and listening socket before diagnosing readiness. Correlate with the last compatible release and recent process errors. |
| `/ready` returns 503 and `DATABASE_UNAVAILABLE` or `DATABASE_OUTBOX_FAILED` appears | Data Recovery On-call | Verify the authorized PostgreSQL endpoint and runtime connectivity. Compare probe and transaction errors. Check current migration and locks using approved operator access. Preserve the outbox and inbox. |
| `REDIS_UNAVAILABLE`, `REDIS_COMMAND_FAILED` | Platform On-call | Verify Redis connectivity, recent restarts and queue depth. Leave durable leases and retry settings in effect. Observe whether the existing relay recovers after Redis is healthy. |
| `OUTBOX_QUEUE_STALLED`, `FILE_QUEUE_STALLED` | Platform On-call | Check worker uptime, processing duration, lock renewal and broker health. Restore processing and confirm the worker reacquires the job. Verify existing deduplication before operator replay. |
| `OUTBOX_JOB_FAILED`, `FILE_JOB_FAILED`, `OUTBOX_DEAD_LETTER` | Platform On-call | Distinguish an attempt from a terminal failure. Inspect existing authorized outbox or file-job status. Resolve the dependency first and use the existing scoped replay or cancellation flow only if eligible. |
| `STORAGE_UNAVAILABLE` | Platform On-call | Verify the configured storage service independently. Preserve private objects and pending work while the dependency recovers. |
| Personal data or credentials observed | Security On-call | Restrict access and stop the affected diagnostics collection. Follow authorized incident containment and rotation. Preserve only approved evidence and involve the privacy owner under G-12. |

## Staging ownership and approvals

On 25 November 2026, Roni paul confirmed they are the sole operator. Use the role associated with each incident in the triage table. All three staging roles currently have the same named contact. The staging destination and permission to send test notifications remain pending.

| Role | Named contact |
|---|---|
| Platform On-call | Roni paul |
| Data Recovery On-call | Roni paul |
| Security On-call | Roni paul |

| Decision | Approval authority | Required evidence |
|---|---|---|
| G-11 staging environment and workload | Platform lead and Product | Record the approved isolated environment, deployment SHA or digest containing M01.10, access reference, test window and permitted fault boundaries. Set numeric alert thresholds after observing representative staging or pilot data. |
| G-18 collector, exporter and alert routing | Architecture and Product | Record the approved collector/exporter configuration, the staging-only routing rule and destination, and permission to send test notifications. ADR-024 records Roni paul's 24 November 2026 approval of OpenTelemetry as the toolchain. Staging collector/exporter and routing selections remain pending. |
| G-12 access and retention | Privacy/Legal and Security | Record who can access traces and diagnostic artifacts, where evidence is stored and how long it is retained. |

For each decision, record the actual approver, approval date and evidence reference before hosted testing. Keep credentials in the approved secret store. M01.09 qualification remains a separate prerequisite for the release path. [M01.09 evidence](../M01.09/VERIFICATION.md) · [ADR-024](../../adr/ADR-024.md) · [Decision register](../M00.05/DECISIONS_LOG.md)

## Staging alert and recovery drill

Use the approved staging deployment and a disposable synthetic fixture. Capture healthy readiness and the initial queue and outbox state, then exercise each fault within the authorized boundary.

| Fault | Expected signal and role | Recovery evidence |
|---|---|---|
| Database projection fails | `DATABASE_OUTBOX_FAILED` reaches Data Recovery On-call. Correlate its redacted trace and confirm that the failed transaction left no committed receipt or projection. | Restore the fixture dependency and verify a subsequent successful operation and normal readiness. |
| A disposable outbox worker stalls | `OUTBOX_QUEUE_STALLED` reaches Platform On-call. Use the fixture's post-commit worker interruption and confirm the replacement observes the stall. | Confirm the replacement resumes delivery and the original event still has one receipt and one projection. |
| A controlled fixture job fails | `OUTBOX_JOB_FAILED` reaches Platform On-call. Record the failed attempt and distinguish it from a terminal dead letter. | Remove the fault and observe the allowed retry or recovery path and the resulting job state. |

For each case record the deployment reference, UTC timestamps, safe trace ID, alert code, approved destination and receipt reference, and the recovery result. Inspect the delivered payload for raw credentials, headers, SQL, personal data and tenant or branch identifiers. For a stateful alert rule, verify and record that the alert clears when recovery conditions are met. For an event-only route, record that recovery was verified and clearing is `NOT_APPLICABLE`. Retain evidence in the approved location. A local role label is diagnostic evidence and carries no delivery receipt.

## Proposed measurements and budgets

| Signal | Measurement | Approval boundary |
|---|---|---|
| HTTP readiness and error rate | Compare HTTP status outcomes and per-operation latency against the workload and maintenance schedule. | Master proposes 99.5% monthly pilot application availability. G-11 owns the final workload, window, exclusions and threshold. |
| Authenticated read and command duration | Collect stage histograms and distinguish operation family and errors before using a latency objective. | Master proposes p95 below 500 ms for authenticated reads and below 1.5 s for critical transactions under a defined pilot workload. The baseline HTTP metric groups requests, so endpoint-class SLO evaluation requires approved route classification and workload evidence. |
| Queue durations and recovery | Track queue depth, observed age when claimed, failures, stalls and dead letters. Compare durable enqueue-to-consume progress after a restart. | Master proposes worker eventual delivery within 60 seconds for normal conditions. Calibrate duration and depth alerts from observed stage and pilot data under G-11. |
| Retention and cost | Measure rate, size and volume with diagnostic success capture off and on. Limit metric dimensions and preserve bounded sampling. | Confirm protected destination, retention under G-12 and hosting budget under G-11 before forwarding. |

## Rollback

Restore the prior application image if telemetry causes operational issues and leave nullable `outbox_events.trace_parent` in the schema. Roll back API and worker application deployment with the existing release procedure. Older writers omit the column and older workers ignore it. Disable local success capture and verify existing health/readiness, durable event progression and inbox receipts on the previous revision. [M01.09 rollback procedure](../M01.09/IMPLEMENTATION_EVIDENCE.md)

If the staging drill misroutes an alert or exposes sensitive fields, pause the staging test route, restore the last approved routing configuration and confirm that queued test notifications are contained. Preserve approved evidence and have Security On-call review the payload before retrying. Verify health and synthetic outbox progression after any application rollback.
