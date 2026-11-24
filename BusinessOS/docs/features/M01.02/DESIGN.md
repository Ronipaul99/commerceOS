# M01.02 Local development and test environments

## 1. Scope and boundaries

Master §§16 and 21 define the container-based local environment, tenant-safe test data and acceptance evidence. Developers and QA start a reproducible API, PostgreSQL, Redis and local storage stub; configure only a loopback API port; and use either the persistent local project or an isolated test project. No live business process, tenant account, provider or staging deployment is enabled. [M01.02 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.02.md) · [RG0](../../RG0_SIGNOFF.md) · [ADR-024](../../adr/ADR-024.md)

## 2. Primary and alternate journeys

Start with the launcher, wait for dependencies and seeded fixtures, then check API liveness and readiness. QA uses `test` to exercise repeatable migrations, independent disposable resources, reset and reseed. Stop normally with volumes intact, or explicitly confirm a local reset. Failed setup exits nonzero. Re-run after diagnosis without deleting volumes by default. UI, business actions and role workflows are NOT_APPLICABLE.

## 3. Domain ownership

PostgreSQL owns the isolated fixture schema, Redis handles the smoke queue, and the stub owns one synthetic object. API health reports status without returning data or credentials. Business inventory, orders, money and events retain their existing owners. The smoke queue carries no business effects.

## 4. Persistence

The fixture migration owns only `local_fixture` in the expected local or test database. Fictional tenant IDs A/B and branch codes A1/B1/B2 are constrained. A branch marker references `(tenant_id, code)` and permits the same marker alias across tenants. The migration uses a transaction, advisory lock and idempotent inserts. It is not the application Prisma migration baseline. Reset recreates project-owned Postgres and Redis volumes. Money/quantity columns, application backfills and Prisma migration tooling are NOT_APPLICABLE.

## 5. Contracts

`GET /health` returns HTTP 200 with `{"status":"ok"}`. `GET /ready` returns HTTP 200 with `{"status":"ready"}` when configured local probes pass and HTTP 503 with `{"status":"not_ready"}` otherwise. Probe failures expose no host or provider details. Existing `GET /` remains the API identity response. The unexposed storage stub supports health and GET/PUT of one fixed synthetic object. Business OpenAPI generation, pagination and generated client changes are NOT_APPLICABLE.

## 6. Security and privacy

Accept local Docker transports only. Compose owns its project, network and volumes. Ignore inherited Compose project/env overrides and do not forward credential or database configuration into services. The test override clears published ports and attaches the API only to the internal data network. Reject an invalid port or unconfirmed reset before invoking Docker. Keep fixture data synthetic, prevent mismatched tenant/branch links and avoid business credential reads. Current API probes are fixed to local service names.

## 7. Scale and recovery

Use bounded socket/HTTP checks and Compose wait windows. Writes are limited to fixtures and smoke resources. A failed database migration rolls back. Repeat tests on fresh volumes to separate reproducibility from warm state. Production capacity, recovery objectives and cloud topology are governed by G-11.

## 8. Verification plan

Build and typecheck the API, run host smoke with Node's test runner, inspect Compose and environment boundaries, then run the disposable Compose smoke through reset. Record each result and Docker availability in [verification](VERIFICATION.md). Domain, UI and load tests are outside this work item.

## 9. Operations

Use the [runbook](RUNBOOK.md) for boot, migrations, smoke and staging handoff. Exit codes and existing Docker/Node diagnostics support troubleshooting. This item selects pinned local image versions and an in-repository stub with no external storage dependency. It does not run a deployment or select a staging provider.

## 10. Decision log

| State | Decision |
|---|---|
| CONFIRMED | Use the approved NestJS/PostgreSQL/Redis/container baseline and fictional Tenant A/B. |
| PROPOSED | Use a private in-memory object stub and direct SQL for only the local fixture schema. |
| BLOCKED | G-11 staging topology and runtime acceptance without a local Docker engine. |
