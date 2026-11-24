# M01.06 implementation evidence

| Area | Delivery |
|---|---|
| Trace and risk | Master sections 12, 16.3 and 21, with the event envelope from section 18.4. High risk. Roni paul approved the design on 24 November 2026. [Recorded approval](APPROVAL.md) · [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.06.md) |
| Data and boundaries | An additive Prisma migration extends the M01.04 fixture baseline with `outbox_events`, `inbox_dedupes`, `job_failures` and the synthetic projection. Composite foreign keys protect tenant and branch references. A trigger protects the event envelope from edits. Existing fixture data needs no backfill. [Migration](../../../packages/database/fixtures/migrations/20261124000500_outbox_foundation/migration.sql) |
| Producer and relay | The fixture owner locks its aggregate and appends `fixture.probe_recorded` v1 with the business write. The relay uses short PostgreSQL leases, `FOR UPDATE SKIP LOCKED`, one active event per aggregate stream, a bounded queue and tenant admission, and generation plus token fencing. BullMQ enqueue and observations run after the database transactions. [Storage](../../../apps/worker/src/outbox/store.ts) · [Relay](../../../apps/worker/src/outbox/relay.ts) |
| Worker and recovery | The worker uses M01.05 signed references and service bindings. It checks scope, current authorization, generation, proof and event payload. PostgreSQL commits the inbox receipt, scoped projection and completion together. Reconciliation uses the persisted attempts count after Redis loss or proof expiry. [Consumer](../../../apps/worker/src/outbox/consume.ts) |
| Dashboard and replay | The restricted CLI accepts an injected operator authorizer. Status and inspection expose bounded redacted results. Replay requires a separate permission, expected generation, allowed reason and branch-scoped request key. It writes an audit record and the new generation in the same transaction. [Operator entry point](../../../apps/worker/src/outbox/operator.ts) |
| Runtime and CI | The worker host can start and close the BullMQ consumer and polling relay through `startOutboxRuntime`. The PR workflow provisions test PostgreSQL and Redis. [Runtime](../../../apps/worker/src/outbox/runtime.ts) · [CI workflow](../../../../.github/workflows/businessos-m0106-outbox.yml) |
| Public API, UI and live providers | NOT_APPLICABLE. The event and CLI are internal and use fictional Tenant A/B fixtures. Live identity and signing-key custody follow M01.07 and G-01. |
| Open controls | Hosted CI and independent review are pending. Production capacity and privacy retention belong to G-11 and G-12. [Verification](VERIFICATION.md) |

## Contracts and operation

- This registration consumes one branch-scoped event version. A producer serializes its aggregate version and provides a scoped `probeRef` in the same transaction as the source effect. Each consumer receipt is unique across generations. A permanently invalid event records `INVALID_EVENT` and blocks its stream. Other tenants and independent streams can progress.
- `startOutboxRuntime` expects an injected Prisma-compatible database, BullMQ connection parameters, a queue prefix, verified relay and consumer credentials, key resolvers and the owner authorization lock. Redis receives the signed reference. The event payload, scope, attempts budget and effect live in PostgreSQL. Default backoff is exponential with jitter. Enqueue admission uses defaults of 8 rows per batch, 32 in-flight rows per consumer and 8 per tenant. The fixture qualification uses shorter intervals than these runtime defaults. [BullMQ retry and backoff](https://docs.bullmq.io/guide/retrying-failing-jobs)
- `runOperatorCli` accepts `status`, `list [cursor]`, `inspect <event-id>` and `replay <event-id> <generation> <reason> <request-key>`. The host supplies the authenticated scope and output writer. Exit statuses are 0 for an available result, 2 for invalid input, conflict or an unavailable record, 3 for denied authority, and 4 for unavailable services. Fault and retry history retain bounded reason codes. Operator inputs cannot select a different tenant or branch.
- The application can report bounded operational signals through its metric sink. Use the CLI's oldest pending age and observed time when comparing the database state to the queue. Operational alerts and capacity budgets require G-11. At-least-once delivery can include more than one attempt, while the durable receipt protects the database effect. [BullMQ stalled job behavior](https://docs.bullmq.io/guide/jobs/stalled)

## Reproduce and roll back

```powershell
pnpm.cmd --filter businessos --filter @businessos/worker... --filter @businessos/database... install --frozen-lockfile
pnpm.cmd --filter @businessos/worker test:unit
node --test tests/outbox/isolation.test.mjs
```

Set `M0106_REDIS_URL` to a dedicated Redis instance bound to `127.0.0.1` with an explicit port. The test uses a generated queue namespace and PostgreSQL through the M01.04 runner. For a Docker-free host, supply a dedicated cluster via `M0104_ADMIN_URL`. [M01.04 operator path](../M01.04/IMPLEMENTATION_EVIDENCE.md)

For rollback, stop the affected producer, stop new dispatch claims, and drain or fence the worker. Inspect the durable receipts and unresolved generations before resuming. Keep the additive schema and event history available for a compatible worker. Replay only eligible failures after remediation. Data removal requires the owning retention approval.
