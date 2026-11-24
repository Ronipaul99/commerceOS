# M01.04 implementation evidence

| Item | Record |
|---|---|
| Scope and trace | Database migrations and transaction toolkit. Master blueprint sections 16.3 and 17. M01 platform baseline. [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.04.md) |
| Approval and risk | HIGH. Roni paul approved the reviewed design on 24 November 2026. Independent review is pending before merge. [Design approval](APPROVAL.md) |
| Toolkit | `runTransaction` provides a bounded serializable transaction with fresh attempts, jitter and a caller deadline. The classifier accepts confirmed serialization/deadlock signals. Exact value helpers validate signed BIGINT amounts and NUMERIC(20,6) input strings before storage. [Toolkit](../../../packages/database/src/index.ts) |
| Database | Four checked-in fixture migrations establish UUIDs, timestamptz, scoped keys, exact values and version checks, then expand, backfill and enforce the policy revision. The composite tenant/branch foreign key and unique scoped source key protect fixture writes. [Prisma schema](../../../packages/database/fixtures/schema.prisma) · [SQL migrations](../../../packages/database/fixtures/migrations) |
| Operator path | Testcontainers provisions PostgreSQL for CI by default. The runner creates uniquely named fixture databases. Prisma deploy uses a direct migration role, the probe and application queries use a limited runtime role, and the fixture seed can be repeated. It records stage results and database error codes. [Fixture harness](../../../packages/database/fixtures/verify-postgres.mjs) · [CI workflow](../../../../.github/workflows/businessos-m0104-database.yml) |
| API, UI and events | NOT_APPLICABLE. The checked path is an internal database toolkit and operator-run fixture suite. |
| Security | IPv4 loopback and dedicated fixture credentials gate the PostgreSQL entry points. The tests exercise denied DDL, migration history, fixture mutation and cross-scope references. The runtime credential shares fixture tables, with tenant and branch restrictions enforced by scoped commands and composite keys. |
| Operational decisions | G-11 covers production capacity and performance budgets. Fixture budgets are 5 seconds for retried operations and 200 ms for the lock-timeout case. [Decision register](../M00.05/DECISIONS_LOG.md#gate-register) |
| Review | Independent reviewer and PR are pending. [Verification](VERIFICATION.md) |

## Repeat the verification

Use Node 22 and pnpm 9.4.0. With a local Docker engine, the PostgreSQL command starts and stops its own Testcontainers instance. On a Docker-free host, provision a dedicated PostgreSQL 17 cluster bound to `127.0.0.1`. Create the `m0104_admin` database and same-name role, with permission to create roles, databases and snapshots in that disposable cluster. Set `M0104_ADMIN_URL` using the cluster's credential and port. [ADR-024](../../adr/ADR-024.md) · [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/)

```powershell
pnpm.cmd --filter businessos --filter @businessos/database... install --frozen-lockfile
pnpm.cmd --filter @businessos/database typecheck
pnpm.cmd --filter @businessos/database test:unit
pnpm.cmd --filter @businessos/database test:postgres
```

The Jest suite checks the toolkit's primitives and retry policy. The integration runner validates and generates Prisma, seeds Tenant A/B, deploys staged and clean migrations, compares the final Prisma schema, and checks database constraints and concurrent transactions. The runner closes its clients and drops its generated databases and roles. When supplying a loopback URL, the operator stops that dedicated cluster after the run.

## Rollout and recovery

Apply the baseline and additive expansion before running the backfill. Verify unchanged source keys, tenant and branch references, currencies, amounts and quantities. Repeat the backfill, confirm every remaining value has an explicit policy mapping, and switch to the revision-aware writer before enforcing the required field. If the final step fails, stop and inspect migration history and the unmapped rows. Keep applied migrations immutable.

Before tightening, the older fixture writer remains compatible. After tightening, use the revision-aware writer or a forward repair. The disposable restore exercise clones the pre-tightening database, restores older write compatibility, and reapplies the committed migration chain. Use the recorded gate and separate approval for any live rollout or restore.
