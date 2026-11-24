# M01.06 Transactional outbox and worker foundation

## 1. Scope and boundaries

**State** PROPOSED. **Implementation** Pending explicit M01.06 design approval and the M01.04/M01.05 runtime prerequisites. This item establishes how a domain transaction records an event, queues it through BullMQ, and applies a consumer effect once despite repeated delivery. QA uses an internal synthetic domain command and a PostgreSQL projection for fictional Tenant A and Tenant B. Operations needs a redacted delivery dashboard and controlled replay. Buyer channels, merchant automation rules, provider delivery and business inventory, finance and payroll policies are outside this slice. [M01.06 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.06.md) · [Master consistency rules](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#163-data-consistency-and-asynchronous-behavior)

## 2. Command, dispatch and consumer journeys

1. A scoped owner command changes its authoritative state and appends an immutable event in one PostgreSQL transaction. A failed transaction leaves neither change. The synthetic case records one branch-scoped probe and one event with a stable source key.
2. A dispatcher claims a bounded batch of ready events or expired leases in a short database transaction, sets an expiry and lease token, then commits. It sends a signed stored-event reference to BullMQ after releasing the database locks. An enqueue result is recorded only if the lease token and delivery generation still match.
3. The consumer verifies the signed reference and worker identity, reloads the authoritative event, and creates a fresh authorized context. It validates the schema and scope and applies the inbox receipt, consumer effect and durable completion state in a single PostgreSQL transaction. Queue acknowledgement follows commit.
4. A consumer crash after commit and before acknowledgement causes redelivery. An inbox receipt in the correct context makes the redelivery a no-op. A crash before commit leaves the effect and receipt absent. An enqueue timeout, dispatcher crash, or lost Redis job leaves durable dispatch state for the reconciler.
5. An operator inspects the redacted dashboard, identifies a failed delivery and requests replay with a reason and request key. Reauthorization and a guarded state transition determine whether a new delivery is eligible. The original event ID and inbox key remain stable. Duplicate or concurrent replay requests cannot schedule a second generation for the same failure.

## 3. Ownership and consistency

The producer domain owns state, event semantics and the decision to append an event. Event infrastructure owns delivery metadata, the dispatcher, consumer receipts and operator diagnostics. An authorized consumer invokes the target domain's public interface under the same transaction used for its receipt. Repositories remain private to their owning domains. The initial fixture registers one named consumer per event. Fan-out needs an explicit per-consumer delivery state design before additional subscribers are supported.

PostgreSQL owns the event and committed-effect facts. Redis tracks active delivery and timing, which can temporarily diverge from PostgreSQL. A dashboard reports when its counts were observed. The two systems can redeliver during recovery, so the invariant is one scoped committed effect for an event and consumer. A domain source key remains an additional guard against repeated business commands. [Domain ownership](../M00.02/DESIGN.md) · [Automation boundaries](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#121-separation-of-infrastructure-and-product-automation)

## 4. Persistence and delivery state

| Record | Proposed fields | Integrity and lookup |
|---|---|---|
| `outbox_events` | UUID event ID, tenant UUID and optional authorized branch UUID, immutable event type/schema version, aggregate identity/version, UTC occurrence time, correlation and causation IDs, JSON payload, registered consumer, state, next-attempt time, lease token/expiry, generation and enqueue attempts | Globally unique event ID and composite tenant/event reference. Branch scope uses the approved tenant-consistent FK. Index due work by state/next-attempt and expired claims by expiry. Unique producer source effect belongs to the domain command. |
| `inbox_dedupes` | Consumer, event UUID, tenant UUID, UTC completion time and optional opaque effect reference | Unique `(consumer,event_id)` across delivery generations. Tenant/event composite FK. Insert receipt before invoking the effect using a conflict-safe insert inside the same transaction. Roll back both on error. |
| `job_failures` | Tenant/event reference, consumer, generation, failure kind or replay record type, safe reason code, UTC timestamp, optional operator, replay request key and audit reference | Append-only operational history. Index tenant/event/generation. Uniqueness for the terminal failure per generation and approved replay command per request key. No raw payload or stack trace in the operator view. |

Proposed delivery states are READY, LEASED, ENQUEUED, COMPLETED and DEAD_LETTER. READY or expired LEASED is claimable. A worker can complete a matching generation before enqueue acknowledgement is recorded. Completion must win over a late dispatcher update. The reconciler checks ENQUEUED deliveries after a grace window, keeps healthy jobs in place and recreates a missing delivery with the same generation if there is no committed receipt. A confirmed exhausted or permanent failure moves to DEAD_LETTER and records the reason in the same PostgreSQL transaction. Reconcile failures missed by queue hooks from durable queue/job observations. Queue-side DLQ projection can be rebuilt from durable failure records.

Apply additive Prisma migrations after inspecting the M01.04 baseline. New tables begin empty. No business data backfill or quantity/money schema is planned. On rollback, stop new producers and drain or fence dispatch/consumption. Preserve events, receipts, audit history and unresolved failures. A prior compatible worker must keep the same receipt semantics. Destructive cleanup requires separate approval and retention review. [M01.04 migration design](../M01.04/DESIGN.md) · [PostgreSQL queue-style locking](https://www.postgresql.org/docs/17/sql-select.html)

## 5. Internal contracts and operator dashboard

The stored event uses master §18.4: `eventId`, `eventType`, `schemaVersion`, `tenantId`, `aggregateType`, `aggregateId`, `aggregateVersion`, `occurredAt`, `correlationId`, `causationId`, and `payload`. Branch scope is authoritative in the stored row and validated against the fixture payload where declared. Test sample `fixture.probe_recorded` v1 carries only an opaque `probeRef`. Its registered consumer updates a test projection under an authorized A1 or B1 context. Credentials, actor privileges and opaque storage links are absent. Require valid UUIDs, positive schema/aggregate versions, UTC timestamps and an allowlisted, size-bounded payload. Unknown schema or invalid payload goes to quarantine/dead letter before any effect.

The BullMQ job carries only the signed reference and immutable delivery metadata needed to resolve the stored event. Custom job IDs are stable per consumer/event/generation. Re-enqueueing an existing job ID is an optimization. PostgreSQL receipt uniqueness remains the correctness guard after queue job removal. [Master event envelope](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#184-event-contract-and-delivery-policy) · [BullMQ job ID behavior](https://docs.bullmq.io/guide/jobs/job-ids)

The first operator dashboard is a restricted CLI status/inspect view with counts by state, oldest pending age, last observed time, scoped event reference, safe failure reason and replay eligibility. Stable pagination uses timestamp and event ID. Show explicit empty, stale, unavailable and denied states. Replay is a separate audited operator command. There is no new public HTTP route or generated client. Browser UI and merchant automation screens are **NOT_APPLICABLE**.

## 6. Authorization and privacy

| Actor | Authority |
|---|---|
| Domain producer | Authorized actor and verified tenant/branch scope. Use server-owned aggregate and correlation references. |
| Dispatcher | Authenticate as an infrastructure service scoped to queue and operation. Claim delivery rows through an allowlisted interface. No direct business writes. |
| Consumer | Verify M01.05 signed reference and queue/service binding. Reload and match authoritative event, tenant, branch, consumer, generation, and operation. Reject forged, expired, wrong-scope or superseded delivery before a repository effect. |
| Operator | Require scoped inspect permission and distinct replay permission. Re-evaluate the target, failure, authorization and reason on execution. Platform access uses its separate approved identity boundary. |

Acquire the event row lock and validate the current eligible generation before touching the inbox. Compare routing/scope before checking an existing receipt. A prior receipt returns an authorized no-op without revealing another tenant's status. Replaying a completed event fails harmlessly and cannot erase a receipt. An unauthenticated or wrongly scoped job can emit a redacted denial signal only. It cannot alter the referenced event, retry budget or DLQ state. Never use a tenant selector from a queue message or operator input as proof of authority. Redact raw payloads, credentials and PII. Signing material is injected from the owning configuration boundary. Cookie, external webhook and private-file authorization are outside this slice. [M01.05 context design](../M01.05/DESIGN.md) · [M00.04 permission workbook](../M00.04/PERMISSION_WORKBOOK.md)

## 7. Ordering, backpressure and recovery

There is no global delivery order. For the initial ordered consumer, serialize producer aggregate version allocation and make only the earliest eligible committed event for a tenant/aggregate stream claimable. A prior incomplete or dead-lettered event blocks that stream until resolved. Independent aggregates and tenants can progress. A gap between versions is not proof of a lost event if some aggregate versions emit no event. Record and test the writer's ordering contract. Confirm sequence at application time under the same stream locking rule.

Use bounded claims, expiring leases, compare-and-set acknowledgement, exponential delay with jitter and bounded attempt counts. Retry dispatch failure only on its dispatch schedule. Allow BullMQ to own transient consumer retries within a generation. Validate the configured proof lifetime against the bounded retry schedule. For an expired reference, only an authorized reconciler may issue fresh proof from durable state, keeping the same generation and remaining retry budget. Persist terminal failure and use a fresh generation for only an authorized replay. Do not silently reset exhaustion. Pause claims before exceeding the configured queue/tenant capacity. G-11 owns production sizing, polling/timeout budgets, per-tenant fairness and SLOs. Instrument oldest event age, lease expiry, receipt dedupe, retry counts, terminal failure and Redis/PostgreSQL disagreement.

Do not make network calls inside a database write transaction. External side effects would need separate idempotency and reconciliation in their owning feature. On ambiguous commit, consult persisted state instead of assuming rollback. Replay preserves immutable event data. A correction needs a separate reviewed domain operation. Retention must cover the admitted replay interval and remains subject to G-12.

## 8. Verification plan

| ID | Planned check | Required result |
|---|---|---|
| OUT-01 | Run the synthetic command and dispatch through BullMQ | One committed domain row and event. One scoped consumer effect, receipt and completion. Interrupted producer transaction persists neither row nor event. |
| OUT-02 | Stop dispatcher before enqueue and after queue acceptance before acknowledgement | Lease or acknowledgement recovery converges on the same generation. Redis job loss can be reconciled without a second effect. |
| OUT-03 | Kill a worker process after PostgreSQL commit and before BullMQ acknowledgement, then redeliver concurrently | Tenant A's committed effect and receipt remain exactly one. A pre-commit failure rolls back both. |
| OUT-04 | Test unknown schema, malformed payload, stale generation and wrong tenant/branch/job context | Deny or quarantine with redacted diagnostic evidence before effects. Tenant B and the sibling branch stay unchanged. |
| OUT-05 | Run conflicting dispatchers and stream ordering, transient retries and permanent failure | Guarded claims avoid duplicate active ownership. In-order consumer behavior, capped retries, terminal state and recoverable DLQ evidence. |
| OUT-06 | Inspect and replay with wrong-scope operator and then with a valid grant and reason | Denied attempt has no side effect. Authorized replay is audited once, uses the same immutable event/receipt key, and cannot reapply a completed effect. |

Use isolated PostgreSQL and Redis with two synthetic tenants, fault barriers and a dedicated worker process for crash tests. Exercise `SKIP LOCKED` claims under separate sessions and capture actual outbox, inbox, effect and queue result counts. Unit-test schema validation, retry selection, redaction and authorization. Re-run app boundary checks as applicable. The M01.04 database and M01.05 context prerequisites are still at design stage, and the host lacks Docker, PostgreSQL and Redis tooling. All M01.06 runtime checks remain planned. [Local environment evidence](../M01.02/VERIFICATION.md)

## 9. Operations and rollback

Record correlated event and job IDs, generation, outcome and timing with scoped access. Metrics use bounded labels. On incident, stop new delivery to the affected consumer, inspect authoritative receipt and failure state, fix the root cause, then replay eligible events with audit. Keep database evidence intact while rebuilding Redis delivery state. Confirm compatible payload/schema versions before resuming after rollback. No deployment, retention cleanup, production restore or performance result is approved or claimed here.

## 10. Decision log

| State | Decision |
|---|---|
| CONFIRMED | RG0 and ADR-003/004 cover PostgreSQL/Prisma, Redis/BullMQ, the outbox and tenant isolation. Master §§16.3, 12 and 21 govern durable consistency, worker infrastructure and verification. |
| PROPOSED | Lease-based dispatcher, durable reconciliation, atomic receipt/effect, ordered single-consumer fixture, and scoped operator dashboard/replay. |
| BLOCKED | Explicit M01.06 design approval before code and independent review before merge. Real execution depends on the M01.04 transaction toolkit, M01.05 scoped execution context and isolated PostgreSQL/Redis. G-11 and G-12 govern production capacity and retention. |

[RG0 signoff](../../RG0_SIGNOFF.md) · [ADR-024](../../adr/ADR-024.md) · [Open gates](../M00.05/DECISIONS_LOG.md#gate-register)
