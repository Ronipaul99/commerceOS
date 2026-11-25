# M01.10 observability baseline

## 1. Scope and boundaries

Master §§16.6 and 21.3. Platform and data recovery operators need to follow an approved command from API admission through its PostgreSQL transaction, durable outbox dispatch and BullMQ processing, then locate dependency and delivery failures. Use synthetic stock-led Tenant A/B only. Product entitlements, supported channels and item types keep their current behavior. No tenant-facing observations or new business capabilities. ADR-024 approves OpenTelemetry. M01.09 remains release-blocked and G-11 keeps hosted qualification open.

## 2. Operator and command journeys

The API starts a server-owned trace and records bounded request completion. A privileged synthetic command goes through the existing HTTP and scoped authorization path. Its outbox append stores an opaque OpenTelemetry trace parent in the same transaction and the worker reads that parent from the authorized database row. A failed request, DB transition, Redis operation, job and readiness result produce a bounded signal. Operations can link safe logs and trace records by the generated trace ID. Alert states come from local signal evaluation. No operator command gains new replay or cancellation rights. No browser or mobile asset is needed for this internal workflow.

## 3. Domain ownership

Existing API, outbox and file-job owners retain all authorization and writes. Telemetry observes operation boundaries and owns diagnostics only. The signed job reference, tenant and branch checks and durable inbox/outbox states stay authoritative. Historical events and invalid trace parents start independent local spans. Trace delivery and log/metric freshness are best effort.

## 4. Persistence and rollout

Add nullable `trace_parent VARCHAR(55)` to the existing outbox event fixture. It holds an internal W3C v00 parent identifier with fixed hexadecimal fields, no baggage, principal, tenant identifier or credentials. Insert atomically with the event. Runtime DB privileges already restrict the allowed update columns. Preserve existing `NULL` rows and current table/index/tenant constraints. The migration is additive and has no backfill. Apply it before starting the instrumented workers and retain it on application rollback. No money, quantity, idempotency key or resource-state meaning changes.

## 5. Contracts

Existing `GET /health` returns `200 {"status":"ok"}`. Existing `GET /ready` returns `200 {"status":"ready"}` when its configured probes succeed and `503 {"status":"not_ready"}` otherwise. Keep existing OpenAPI and generated clients. Internal telemetry allows only enumerated operations and outcomes, synthetic fixture trace identifiers and bounded numeric observations. No network route exposes telemetry, so pagination, request body schemas, UI states and public API authentication changes are not applicable.

## 6. Security and privacy

Unauthenticated callers see only existing coarse health. Business actors keep existing permissions. Restricted platform/data operations roles may inspect authorized diagnostics through the approved operational environment. Raw URL, headers, SQL, query values, stack/error text, source/body, job IDs, actors, secrets and tenant/branch IDs are excluded from exported diagnostic records. Ignore network trace headers on the public ingress. Parent continuation uses only data loaded from the durable current event, after the scoped worker authorization for consumption. Metric cardinality uses process role, finite operation and finite outcome labels with no per-tenant dimensions. Feature introduces no CSRF-protected mutation, webhook or public resource lookup.

## 7. Scale and recovery

Record duration and outcome without adding database round trips to commands. Stop capture at bounded buffer capacities. A subscriber or sink failure cannot affect HTTP, DB transactions or queue state. Observe stalls and failed attempts distinctly from terminal dead letters. Preserve the existing retry and ordering policies. A local event immediately opens an actionable diagnostic only for a declared fault class. Numeric paging rules and bucket targets require observed shared-stage/pilot measurements and signed G-11 thresholds. No SLO achievement or production load is claimed.

## 8. Verification plan

| Case | Expected proof |
|---|---|
| OBS-01 | Synthetic authorized HTTP command appends one event in PostgreSQL and BullMQ applies one projection. Producer, database and consumer trace share an internal ID. Repeat and Tenant B checks show unchanged isolation and replay behavior. |
| OBS-02 | Inject API, DB and queue failures with identifiable synthetic fields. Exact coded log, metric and trace appear with no raw data, and API status and transaction semantics stay intact. |
| OBS-03 | Stalled and failed jobs raise distinct local alerts with owning role. Reports expose aggregate observations and safe trace IDs only. |
| OBS-04 | Verify bounded cardinality, legacy row support, valid context, bad parent rejection, sink failure isolation, contract equality, lint and strict type checks. |

## 9. Operations

Keep an in-process OpenTelemetry baseline with bounded diagnostics and a local operator report. A provider or collector and external paging target require separate approval. The Platform On-call role owns API/Redis/queues, Data Recovery On-call owns database recovery, and Security On-call handles telemetry leakage. Actual staff, retention and secure retention location require operations/security review. Follow the M01.10 runbook. No deployment or feature entitlement changes.

## 10. Decisions

| State | Decision |
|---|---|
| CONFIRMED | ADR-024 selects OpenTelemetry. Master §§16.6 and 21.3 require measured readiness, redaction, dependency diagnostics and operational owners. |
| PROPOSED | Nullable internal trace parent and provider-neutral local capture. Use existing Prisma/BullMQ paths and application rollback on the additive schema. |
| BLOCKED for hosted qualification | G-11 shared environment and observed thresholds, G-12 retention, approved collector/exporter, actual on-call assignments and M01.09 release-gate evidence. |

[OpenTelemetry instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/) · [ADR-024](../../adr/ADR-024.md)
