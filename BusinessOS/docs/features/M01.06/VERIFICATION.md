# M01.06 verification

**Result** `PASS_REVIEW_REQUIRED`. Local evidence from 24 November 2026, Asia/Kolkata. Windows, Node.js 22.22.2, pnpm 9.4.0, Prisma 7.8.0, PostgreSQL 17.10, Redis 7.4.11 and BullMQ 5.81.6. The databases, queues, credentials and Tenant A/B records were disposable fixtures.

| Check | Command and observed result |
|---|---|
| Worker build and unit | `pnpm.cmd --filter @businessos/worker test:unit` compiled the worker and passed six Jest tests. `pnpm.cmd --filter @businessos/worker typecheck` passed. |
| Lint and boundaries | `pnpm.cmd run lint` and `pnpm.cmd exec eslint tests/outbox --max-warnings 0` passed. |
| PostgreSQL schema | `pnpm.cmd --filter @businessos/database db:validate` passed. The integration runner applied the full additive chain on a clean database and passed `prisma migrate status` plus schema drift comparison. |
| Outbox integration | `node --test tests/outbox/isolation.test.mjs` passed OUT-01 through OUT-06 on PostgreSQL and a physical BullMQ queue. |
| Predecessor regressions | `pnpm.cmd --filter @businessos/database test:postgres` passed all five M01.04 integration cases with the new migration present. `node --test --test-concurrency=1 tests/outbox/isolation.test.mjs tests/execution-context/isolation.test.mjs` passed both suites, including all six M01.05 cases. |
| Frozen lockfile | `pnpm.cmd --filter businessos --filter @businessos/worker... --filter @businessos/database... install --lockfile-only --frozen-lockfile --offline --store-dir 'D:/.pnpm-store'` passed. |
| CI and scans | Workflow YAML parsed and its job and service configuration was reviewed locally. Hosted Testcontainers CI and standalone secret scanning are `NOT_RUN`. [Workflow](../../../../.github/workflows/businessos-m0106-outbox.yml) |
| Timing and qualification | The final local M01.06 integration command took 20.68 seconds, including migrations and fault recovery. The test configuration used a 350 ms lease, 75 ms reconciliation grace, 45 ms base backoff, three consumer attempts and a 450 ms BullMQ lock. Representative load, query plans and production SLOs are `NOT_RUN` and remain under G-11. |
| Controls | Independent review, human merge authorization and hosted CI are pending. Durable data is preserved during rollback. [Implementation and rollback](IMPLEMENTATION_EVIDENCE.md) |

## Acceptance results

| Case | Observed result |
|---|---|
| OUT-01 | Interrupting the producer rolled back the aggregate version, source probe and event. Returning the same source key returned the same event. The polling runtime dispatched the accepted event, and BullMQ drove one projection and one receipt. PostgreSQL blocked envelope edits and retained exact synthetic integer and decimal values. |
| OUT-02 | An abandoned lease was reclaimed. An enqueue accepted by Redis and followed by a connection failure recovered without a second add. A removed queue job was recreated in the same generation. A late enqueue acknowledgement could not overwrite completed state. After an authorized failed attempt and proof expiry, the replacement proof kept the generation and received the remaining two BullMQ attempts. |
| OUT-03 | A separate worker sent a fault-barrier signal after PostgreSQL committed and then held the job active. The test killed that process before acknowledgement, started another worker, and observed BullMQ redelivery return `DEDUPED`. Two additional concurrent deliveries also deduped. The database still had one inbox receipt and one projection. |
| OUT-04 | Tenant fields, mismatched job identity and sibling branch authority were denied without changing delivery state or attempts. The worker quarantined unknown schema and malformed payload with redacted `INVALID_EVENT` history. The sibling branch checksum stayed unchanged. |
| OUT-05 | Two dispatchers claimed the leading stream events. The next version waited for completion while an independent tenant progressed. A precommit exception rolled back receipt and effect before an actual BullMQ retry succeeded. Three failed attempts produced zero effects, one durable dead-letter record and a blocked downstream event in that stream. |
| OUT-06 | Scoped CLI output hid the other tenant's event. A denied operator could not replay. Concurrent requests with the same authorized key recorded one audit and advanced to one new generation. The old proof was denied. The replay preserved the envelope and committed one effect. A new replay request after completion conflicted. |

The Windows host had no Docker runtime. Local verification used checksum-verified portable PostgreSQL and Redis builds on IPv4 loopback. Both service processes stopped after verification. The install succeeded and reported deprecated transitive packages. Node emitted its experimental VM-modules warning for Jest. [Portable Redis source and digest](https://github.com/redis-windows/redis-windows/releases/tag/7.4.11)
