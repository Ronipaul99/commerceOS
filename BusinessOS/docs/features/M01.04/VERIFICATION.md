# M01.04 verification

**Result** `PASS_REVIEW_REQUIRED`. Verified locally on 24 November 2026 using Windows, Node.js 22.22.2, pnpm 9.4.0, Prisma 7.8.0 and a dedicated PostgreSQL 17.10 loopback cluster. Only fictional Tenant A/B data was used. Hosted CI and independent review are pending.

| Check | Run and result |
|---|---|
| Strict TypeScript | `pnpm.cmd --filter @businessos/database typecheck` passed. |
| ESLint and package boundaries | `pnpm.cmd run lint` passed across the workspace, including the dependency-boundary check. |
| Frozen lockfile | `pnpm.cmd --filter businessos --filter @businessos/database... install --lockfile-only --frozen-lockfile --offline --store-dir 'D:/.pnpm-store'` passed. |
| Prisma schema/client | `pnpm.cmd --filter @businessos/database db:validate` and `pnpm.cmd --filter @businessos/database db:generate` passed. The integration runner repeats both. |
| Unit | `pnpm.cmd --filter @businessos/database test:unit` passed all 6 Jest tests, covering numeric bounds, accepted and rejected retry signals, exhaustion, abort and fixture URL guards. |
| Real PostgreSQL | `pnpm.cmd --filter @businessos/database test:postgres` passed all 5 subtests plus the enclosing test. The runner used `prisma migrate deploy`, `prisma migrate status` and `prisma migrate diff --from-config-datasource --to-schema fixtures/schema.prisma --exit-code` with the fixture config. |
| Workflow | Parsed and inspected the workflow with the installed `js-yaml` package. Testcontainers 12.2.2 started the runtime discovery path locally and reported no working container runtime. Hosted GitHub Actions execution is `NOT_RUN`. [Workflow](../../../../.github/workflows/businessos-m0104-database.yml) |
| Security scans | The integrated permission and configuration checks passed. Standalone secret scanning is `NOT_RUN` because the local host has no configured scanner for this work item. |
| API, UI, queues and events | `NOT_APPLICABLE` to the internal toolkit and disposable operator path. |
| Performance | Final test runner elapsed time was 65.03 seconds for the full local PostgreSQL suite. The test used a 200 ms lock timeout and a 5-second retry budget. Representative query plans, throughput and latency qualification are `NOT_RUN`. Production targets remain subject to G-11. |
| Release and review | Hosted CI, independent reviewer, PR, and platform-baseline signoff are pending. [Work item evidence](IMPLEMENTATION_EVIDENCE.md) |

## Acceptance results

| Case | Observed result |
|---|---|
| DB-01 | An empty database applied all four migrations without Prisma schema drift. Two seed runs produced two tenants and three branches. The runtime role was denied DDL, migration history reads, probe deletion and edits to branch codes. |
| DB-02 | A scoped transaction on the expanded schema committed `9007199254740993` minor units and quantity `1.234567`. The backfill preserved values, currency, scope and source key. Replaying the operation after tightening returned the original row. Repeated backfill made no further change. An unmapped policy raised `23514` and rolled back the attempt to tighten. |
| DB-03 | Input rejected fractional and overflowing minor units, excess precision, NaN and invalid quantities. PostgreSQL rejected invalid stored quantity values and round-tripped the maximum signed BIGINT and maximum NUMERIC(20,6) inputs used by the fixture. |
| DB-04 | Scope checks rejected disallowed tenant and branch reads and updates. The composite FK rejected a mismatched pair with `23503`. Concurrent scoped replay created one effect, and changed reuse of that key failed. |
| DB-05 | A failed transaction left no effect and restored the previous version. A stale update affected zero rows. The adapter reported the lock timeout as `P2010/55P03` with one attempt, a deliberate deadlock as `P2010/40P01` with a successful retry, and a serialization conflict as `P2034` with exactly one committed retry effect. |
| DB-06 | Older writes succeeded before tightening and the revision-aware writer succeeded afterward. A disposable pre-tightening snapshot restored the older writer path and reapplied the final migration with the original row intact. |

## Run notes

The host had no Docker runtime or PostgreSQL CLI. A checksum-verified portable PostgreSQL 17.10 distribution provided `initdb.exe`, `pg_ctl.exe` and the server. Initial sandbox startup failed at restricted-token creation, and file-based PowerShell execution was disabled by local policy. The disposable cluster was initialized and managed by the approved PowerShell command in the normal user context. The suite closed its test clients and removed its generated fixture databases and roles, and the server reported a clean stop.

The first real PostgreSQL run failed DB-05 because the assertion expected `meta.code` for a raw lock error. The pinned Prisma adapter places the PostgreSQL SQLSTATE under `meta.driverAdapterError.cause.originalCode`. The classifier and assertions now handle that structured field, and the full suite passed after the correction and after adding post-backfill replay.

Installing the Jest and Testcontainers dependencies completed successfully. The Windows host lacked a compiler for optional SSH native bindings, and Jest reported Node 22's experimental VM module warning. The unit suite and loopback database suite completed successfully on that host.
