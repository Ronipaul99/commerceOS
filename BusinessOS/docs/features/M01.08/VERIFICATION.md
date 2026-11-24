# M01.08 verification

**Status** `BLOCKED` on native platform qualification. The scoped code and local functional checks are complete. Verified on 24 November 2026, Asia/Kolkata, using Windows, Node.js 22.22.2, pnpm 9.4.0, Prisma 7.8.0, Jest 30.5.2 and embedded PostgreSQL 17.5. All data and keys were synthetic.

| Check | Observed result |
|---|---|
| API and worker builds | `pnpm.cmd --filter @businessos/api build` and `pnpm.cmd --filter @businessos/worker build` passed. |
| Unit | `pnpm.cmd --filter @businessos/file-jobs test:unit` passed all four cases, covering media validation, strict base64, session/expiry-bound grants and encrypted conditional S3 requests and read limits. |
| TypeScript, lint and contract | `pnpm.cmd --filter @businessos/api-client typecheck`, `pnpm.cmd run lint`, `pnpm.cmd exec eslint tests/files --max-warnings 0` and `node scripts/contracts/generate.mjs --check` passed. Existing OpenAPI compatibility and the generated client passed in the HTTP suite. |
| Database schema and migration | `pnpm.cmd --filter @businessos/database db:validate` and `db:generate` passed. Embedded PostgreSQL applied all six checked-in SQL migrations. The mismatched tenant/branch/file foreign key failed with `23503`. |
| Loopback and regressions | `node --test tests/files/embedded.test.mjs tests/contracts/http.test.mjs tests/security/http.test.mjs infra/local/host-smoke.test.mjs` passed 19 tests. Five file cases used real NestJS HTTP and embedded PostgreSQL with an injected broker handoff, encrypted fixture storage and controlled scanner verdicts. |
| Frozen lock | `pnpm.cmd --filter businessos --filter @businessos/api... --filter @businessos/worker... --filter @businessos/database... install --lockfile-only --offline --frozen-lockfile --store-dir 'D:/.pnpm-store'` passed. |
| Timing | The five-case file suite took 5.61 seconds including embedded database startup and migration, and the combined command took 8.45 seconds. These are local test durations. Load and multi-session lock contention qualification remain open under G-11. |
| Native qualification | `node --test tests/files/integration.test.mjs` is implemented and `NOT_RUN`. This host lacks native PostgreSQL and Redis and has no available container runtime. Automatic approval review rejected downloading the portable fixture binaries because the session hit its usage limit, so neither download ran. Native Prisma deploy and drift verification, real Redis delivery, and hosted CI remain pending. |
| Review and other checks | Human review before merge is pending. Production storage and malware scanner qualification and standalone secret scanning are `NOT_RUN`. Browser UI, money, quantity and external events are `NOT_APPLICABLE`. [Implementation and rollback](IMPLEMENTATION_EVIDENCE.md) |

## Acceptance evidence

| Case | Observed result |
|---|---|
| FILE-01 | After creating a private intent, upload returned a queued job. Download was unavailable during quarantine. The authenticated worker fixture processed the signed reference, and the generated client downloaded the exact original bytes through a scoped 60-second grant. The anonymous request received 401. |
| FILE-02 | Traversal, Windows device names, control characters, surplus scope fields, an unsupported media type, malformed UTF-8, noncanonical base64, wrong decoded size and an oversized upload were rejected. Invalid requests created no additional stored object. |
| FILE-03 | Tenant A, an unassigned branch, and a non-owner with SELF access could not access those files or job resources. An altered signature and an expired grant received 404. A separate unit case rejected a different session for the same actor. |
| FILE-04 | Concurrent duplicate uploads returned the same job, changed bytes conflicted, and a cancelled job ignored stale delivery. Cancellation during an active scan prevented a subsequent clean verdict from publishing the file. Simulated scanner rejection left the file unavailable. |
| FILE-05 | A forged job delivery was denied. Three simulated unavailable scans exhausted the persisted attempt budget. A simulated broker failure left a recoverable lease. A fresh signed generation completed that job after the fixture advanced the lease. Actual BullMQ execution still requires the native qualification. |

The initial strict build flagged an ES2024 Promise helper, which was replaced with the workspace's ES2022-compatible construction. Focused lint caught unused directives and the intended control-character filter, after which the final lint passed.
