# M01.05 verification

**Result** `PASS_REVIEW_REQUIRED`. Checked on 24 November 2026, Asia/Kolkata, with Windows, Node.js 22.22.2, pnpm 9.4.0, Prisma 7.8.0 and a disposable PostgreSQL 17.10 loopback cluster. All actors, tenants, branch assignments, grants and jobs were fictional.

| Check | Command and observed result |
|---|---|
| Build and strict types | `pnpm.cmd --filter @businessos/api build`, `pnpm.cmd --filter @businessos/api typecheck` and `pnpm.cmd --filter @businessos/execution-context typecheck` passed. The compiled API initialized under `node --no-experimental-strip-types`. |
| Lint and dependency rules | `pnpm.cmd run lint` and `pnpm.cmd exec eslint tests/execution-context --max-warnings 0` passed. |
| Unit | `pnpm.cmd --filter @businessos/execution-context test:unit` passed all 8 Jest cases. |
| SQL, HTTP and worker path | `node --test tests/execution-context/isolation.test.mjs` with `M0104_ADMIN_URL` set for the disposable loopback cluster passed all six subtests and their suite. Supertest called the NestJS guard over loopback, and the worker harness used the same compiled context package. |
| Existing contracts | `node --test tests/contracts/http.test.mjs infra/local/host-smoke.test.mjs` passed all seven tests, including generated client/schema drift, HTTP auth/error behavior and health/readiness. |
| Frozen lock | `pnpm.cmd --filter businessos --filter @businessos/api... --filter @businessos/database... install --lockfile-only --frozen-lockfile --offline --store-dir 'D:/.pnpm-store'` passed. |
| Hosted workflow | YAML parsed and the locked install and integration commands were checked. Hosted CI and the local Docker API image build are `NOT_RUN`. The host has no Docker runtime. [CI workflow](../../../../.github/workflows/businessos-m0105-context.yml) |
| Performance and scans | The final local integration runner completed in 11.27 seconds, including setup and migrations. Resolver budget is two seconds and the fixture transaction retry budget is five seconds. Representative workload, query plans, and standalone secret scanning are `NOT_RUN`. Production thresholds require G-11. |
| Rollback and review | Code and image recipe rollback is documented. The fixture databases and roles were removed and PostgreSQL stopped. Independent security review, human merge authorization and hosted CI are pending. [Implementation evidence](IMPLEMENTATION_EVIDENCE.md) |

## Acceptance results

| Case | Observed result |
|---|---|
| CTX-01 | A verified request read its own branch record and count. A job for the same scope used the request's causal identifier while recording its executing service and original actor. Context retained after an HTTP response or worker handler was rejected. |
| CTX-02 | Spoofed tenant and branch selectors in headers, query and nested JSON received 400. A guessed foreign record and an absent record shared the 404 envelope. B1 could not read or write B2 records. Checksums for tenants and branches were unchanged after those denials. |
| CTX-03 | The consumer rejected altered, expired, wrong-audience, missing-job and extra-scope references alongside valid deliveries. It also denied a stored job with a different branch from the authority. Unit cases covered missing service binding, invalid delegation and retired credentials. |
| CTX-04 | The query policy denied absent, forged and platform context. Unit tests rejected combinations of unrelated permission and scope grants and checked owner-bound SELF filters. Concurrent first delivery and replay shared one effect. Revocation between HTTP guard and SQL write produced 403. A revoked actor could not replay a previously accepted job. |
| CTX-05 | Prisma queries and transactions on real PostgreSQL applied tenant and branch predicates. The accepted branch update incremented its version once and the stale version wrote zero rows. The worker effect retained exact BIGINT and decimal values. A mismatched composite FK failed with `23503`. Tenant B and B2 checksums stayed unchanged. |
| CTX-06 | Audit entries kept causal attribution without bearer tokens, session or service binding details, signatures or raw job input. Existing health and identity routes and their error contracts passed. |

## Run notes

The initial TypeScript run flagged cross-package source imports and an overly narrow inferred UUID type. The package now builds JavaScript for the API runtime, the API compiler accepts the library's typed sources and correlation has an explicit string type. Initial ESLint flagged a missing Node Buffer import in the test. The builds and focused checks passed after correction.

The positive SQL and HTTP verification used a checksum-verified portable PostgreSQL instance bound to IPv4 loopback. It applied the M01.04 chain on a fresh disposable database and confined the extra authority table to that fixture. Running the same command without `M0104_ADMIN_URL` returned “Could not find a working container runtime strategy” during local Testcontainers startup.
