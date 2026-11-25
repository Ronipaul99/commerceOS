# M01.09 verification

**Status** `BLOCKED` pending independent approval of the current PR #2 head and a passing hosted rehearsal and release gate. Hosted native integration passed and strict branch protection is active on `main`. The dependency gate passed after remediation on 25 November 2026. Baseline checks ran on 24 November 2026, Asia/Kolkata, on Windows with Node.js 22.22.2 and pnpm 9.4.0. The reference revision was `d4031a6e0d51a82c819e406509924a4241585020`.

| Check | Command and observed result |
|---|---|
| Lint and strict types | `pnpm.cmd run lint` passed, checking 85 modules and 224 dependencies. `pnpm.cmd exec eslint scripts/release tests/release --max-warnings 0` passed. `pnpm.cmd run typecheck --concurrency=2` passed all 13 workspace tasks in 19.451 seconds. |
| Unit | `pnpm.cmd --filter @businessos/database test:unit`, `pnpm.cmd --filter @businessos/execution-context test:unit`, `pnpm.cmd --filter @businessos/api test:auth`, `pnpm.cmd --filter @businessos/worker test:unit` and `pnpm.cmd --filter @businessos/file-jobs test:unit` passed. |
| Release and HTTP regressions | `node --test tests/release/controls.test.mjs tests/contracts/http.test.mjs tests/security/http.test.mjs infra/local/host-smoke.test.mjs tests/files/embedded.test.mjs` passed 29 tests in 9.782 seconds, including 10 release controls and five file scenarios backed by embedded PostgreSQL 17.5. |
| Native database and queue integration | `pnpm.cmd --filter @businessos/database test:postgres` passed six tests in 55.120 seconds. `node --test --test-concurrency=1 tests/execution-context/isolation.test.mjs tests/outbox/isolation.test.mjs tests/files/integration.test.mjs` passed 20 tests in 62.313 seconds. Dedicated PostgreSQL 17.10 and Redis 7.4.11 ran on IPv4 loopback. The matrix proved native migration compatibility, drift and restore, tenant and branch isolation, BullMQ redelivery and replay, and private file upload, scan and download. Both fixture processes stopped after the run. |
| Contract and migration history | `pnpm.cmd --filter @businessos/api build`, `node scripts/contracts/generate.mjs --check --base-ref d4031a6e0d51a82c819e406509924a4241585020` and `node scripts/release/preflight.mjs` with `M0109_BASE_SHA` set to the same revision passed. Six historical migrations matched, with zero new migrations and rollout revision 1. |
| Secret scan | `node scripts/security/scan-secrets.mjs` with checksum-verified Gitleaks 8.30.1 passed the synthetic-secret positive control and scanned 793 BusinessOS source files successfully. The scanner kept finding output redacted. |
| Baseline dependency audit | Before remediation, `pnpm.cmd audit --audit-level high --json` reported three high, ten moderate and zero critical findings. `node scripts/release/gate.mjs audit .turbo/m0109-audit.json` rejected this report with `DEPENDENCY_RISK` and exit 1. [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) · [effect](https://github.com/advisories/GHSA-7589-6fvf-x4pw) · [mysql2](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) |
| Targeted static analysis | `node scripts/release/sast.mjs` passed on 58 app source files. The synthetic unsafe execution fixture was reported without running it. |
| Workflow and launcher | The workflow parsed as YAML. Static inspection covered scoped triggers, read-only permissions, immutable action references and aggregate gate prerequisites. `bash -n infra/release/build-rehearsal.sh` passed using Git for Windows Bash. Direct execution of `node scripts/release/staging.mjs` outside GitHub-hosted staging exited 1 with `DISPOSABLE_STAGING_REQUIRED`. |
| Actual GitHub and Docker release | `NOT_RUN`. This workspace has no Docker executable, and there is no hosted run or approved live staging target. OCI image build and upload, BuildKit provenance from an actual build, protected branch enforcement and a container-backed smoke/rollback remain unverified. The local orchestration tests exercised the same sequence through synthetic adapters. |
| Independent review and performance | `PENDING` independent human review and PR evidence. Local suite durations describe this machine only. Production load, container base-image CVE qualification and release timing are `NOT_RUN`. Approved shared-stage topology and capacity evidence remain under G-11. |

## Acceptance checks

| Case | Observed result |
|---|---|
| REL-01 | Failed, missing, cancelled and skipped controls blocked release. Unrelated changes bypassed the scoped matrix and unknown scope was denied. Self, bot, stale and missing review cases failed. A current independent fixture review passed. Missing advisory output and high or critical findings blocked the dependency guard. The live advisory check also blocked. |
| REL-02 | Narrow additive SQL passed. Altered history, destructive statements, table defaults, unique indexes on existing tables, changed rollout history and malformed revisions were denied. The current working tree preserved the reviewed migration history. |
| REL-03 | Separate synthetic tenants kept stable cohorts across branch and session changes. Unregistered or disabled flags and requests without issued scope or a feature entitlement were denied. The checked-in baseline enables no flags. |
| REL-04 | Simulated rollout performed prior smoke, migration, prior compatibility smoke, candidate smoke, rollback and roll-forward. An unhealthy candidate restored the prior image and failed the release check. A migration failure never activated the candidate. The artifact check bound source, image and archive checksum and rejected missing provenance. |
| REL-05 | Local workspace, native integration and HTTP regression checks passed as recorded above. Browser UI, monetary and quantity calculations and new domain events are `NOT_APPLICABLE` to release control. |

Rollback keeps the expanded schema and restores the verified prior immutable image. A subsequent flag disable records a new reviewed rollout revision. [Implementation evidence](IMPLEMENTATION_EVIDENCE.md) · [Design](DESIGN.md)

## Dependency remediation trial

In the earlier temporary BusinessOS copy, pinning `prisma`, `@prisma/client` and `@prisma/adapter-pg` to `7.10.1` and adding the root pnpm override `@prisma/config>effect: 3.22.1` resolved `deepmerge-ts@8.0.2`, `effect@3.22.1` and `mysql2@3.24.4`. The registry audit found zero high, zero critical and four moderate advisories. [Prisma 7.10.1 release](https://github.com/prisma/orm/releases/tag/7.10.1) · [Effect advisory](https://github.com/advisories/GHSA-7589-6fvf-x4pw)

pnpm 9.4.0 returned exit 1 for the moderate-only JSON report. The M01.09 gate now validates the report and exit status together. It accepts valid findings below the threshold, rejects high or critical findings and blocks missing, invalid or failed audit reports.

The trial Windows frozen install hit a native compiler error in `cpu-features`. A scoped offline frozen install with `--ignore-scripts` succeeded in the temporary copy. `pnpm.cmd --filter @businessos/database db:validate`, `db:generate` and `test:unit` then passed with Prisma 7.10.1, including all six database unit tests. The 10 release-control tests and focused lint passed in the working tree at that stage.

## Closeout step 1 on the working branch

On 25 November 2026, the database manifest pinned the three Prisma packages to `7.10.1`, the root manifest added `@prisma/config>effect` at `3.22.1`, and the lockfile recorded the resolved dependency graph. This evidence and the M01.09 tracker row record the closeout step. [Database manifest](../../../packages/database/package.json) · [Root manifest](../../../package.json) · [Lockfile](../../../pnpm-lock.yaml) · [Tracker](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/WORK_ITEM_STATUS.csv)

| Check | Command and actual result |
|---|---|
| Scoped lockfile resolution | `pnpm.cmd --filter @businessos/database... install --lockfile-only --no-frozen-lockfile --ignore-scripts --store-dir 'D:/.pnpm-store'` passed using the pinned pnpm 9.4.0. Structural comparison with the pre-change lockfile proved that only the database importer and the Prisma dependency graph changed. It confirmed `deepmerge-ts@8.0.2`, `effect@3.22.1` and `mysql2@3.24.4`, with all three affected older snapshots absent. The comparison also confirmed that unrelated workspace importer and snapshot versions were preserved. |
| Live advisory audit and gate | `pnpm.cmd audit --audit-level high --json` returned exit 1 with four moderate, zero high and zero critical findings. `node scripts/release/gate.mjs audit .turbo/m0109-dependency-fix/audit.json 1` accepted the UTF-8 report and exited 0. Existing gate severity handling stayed in force. |
| Frozen install and Prisma checks | `pnpm.cmd --filter @businessos/database... install --frozen-lockfile --ignore-scripts --store-dir 'D:/.pnpm-store'` passed on Windows. `pnpm.cmd --filter @businessos/database db:validate` and `pnpm.cmd --filter @businessos/database db:generate` passed. The generated client identified itself as Prisma `7.10.1`. |
| Database unit suite | `pnpm.cmd --filter @businessos/database test:unit` passed all six tests in 2.182 seconds. |
| Native migration suite | `pnpm.cmd --filter @businessos/database test:postgres` passed all six reported tests in 45.272 seconds. The fixture runner set `M0104_ADMIN_URL` to a fresh password-authenticated PostgreSQL 17.10 cluster bound to IPv4 loopback. The suite exercised staged migration and restore, schema drift, repeatable seed, role privileges, tenant and branch separation, replay, concurrent updates, and transaction rollback and retry behavior. The dedicated cluster stopped after the run. |

At the end of Step 1, hosted CI, staging migration and smoke, rollback and roll-forward rehearsal, branch protection enforcement, and independent review were pending.

## Closeout step 3 initial GitHub qualification

Checked on 25 November 2026, Asia/Kolkata. GitHub confirmed `main` as the integration target at base SHA `d4031a6e0d51a82c819e406509924a4241585020`. The authorized publication from an isolated checkout created `businessos/m01-09-closeout-20261125` at `0dc322bbf8e179a86cac9dd450d93eb6c7f7da09`. The candidate diff contains 19 allowlisted M01.09 and Step 1 files. It includes Prisma `7.10.1` and the targeted `effect` override. GitHub returned the same candidate SHA for the published branch. [Candidate commit](https://github.com/Ronipaul99/commerceOS/commit/0dc322bbf8e179a86cac9dd450d93eb6c7f7da09) · [Open the scoped PR](https://github.com/Ronipaul99/commerceOS/pull/new/businessos/m01-09-closeout-20261125)

| Check | Actual result |
|---|---|
| Candidate dependency audit | `pnpm.cmd audit --audit-level high --json` returned exit 1 with four moderate, zero high and zero critical findings for the isolated candidate. `node scripts/release/gate.mjs audit <candidate-audit.json> 1` exited 0. The working-tree M01.10 dependency changes were excluded from the candidate lockfile. |
| Local checks on the exact candidate | `pnpm.cmd --filter businessos --filter @businessos/api... install --offline --frozen-lockfile --ignore-scripts --store-dir 'D:/.pnpm-store'` and `pnpm.cmd --filter @businessos/api build` passed in the isolated checkout. `node scripts/contracts/generate.mjs --check --base-ref d4031a6e0d51a82c819e406509924a4241585020`, `node scripts/release/preflight.mjs` and `node scripts/release/sast.mjs` passed. Preflight found six baseline migrations, zero additions and rollout revision 1. Static analysis checked 56 sources. `node --test tests/release/controls.test.mjs tests/contracts/http.test.mjs tests/security/http.test.mjs infra/local/host-smoke.test.mjs` passed all 23 tests in 15.169 seconds. |
| Pull request and Actions | The requester retained PR creation. GitHub returned no open PR for the candidate branch and no workflow runs for its SHA. The workflow activates on PR and PR review events. Hosted quality, supply-chain, native integration and aggregate jobs remain `NOT_RUN`. |
| Independent approval | `PENDING`. The requester identified their own account as the intended PR author. No independent reviewer was designated or recorded. The current-head review guard requires an approved review by a different authorized human. |
| Disposable rehearsal | `NOT_RUN`. No hosted image build, provenance artifact, staging migration, prior or candidate smoke, rollback or roll-forward evidence exists for the candidate. The rehearsal depends on the hosted prerequisites and current-head approval. |
| Branch protection | GitHub returned `protected: false` for `main` and zero active branch rules at the time of the check. The strict required status check and stale-approval enforcement remain pending repository administrator authorization and registration of the check from a PR run. |

## PR #2 review and enforcement

On 25 November 2026, GitHub confirmed the open fixture follow-up targets `main` at `f093fd22cb25d6c17160a0b3a482a7750875a2e5` from head `04d091c3b2ea354280556729830e12df660c2efd`. [PR #2](https://github.com/Ronipaul99/commerceOS/pull/2)

| Check | Verified result |
|---|---|
| Hosted verification | Scope, lint, types, unit tests, contracts, supply chain and native integration passed on the current head. Native integration exercised PostgreSQL migrations and restore, tenant and branch isolation, BullMQ recovery and all five file-job scenarios. [Release run](https://github.com/Ronipaul99/commerceOS/actions/runs/45643130794) · [Native integration](https://github.com/Ronipaul99/commerceOS/actions/runs/45643130794/job/139307004587) |
| Independent review | GitHub confirmed `officialamibey-spec` has write access and is a different account from the PR author. The earlier approval applied to `d4d300afd64dabe6e0ed6da9737ffe66e3fa5d70` and GitHub now lists it as dismissed. A fresh review request is pending on PR #2. [Earlier review](https://github.com/Ronipaul99/commerceOS/pull/2#pullrequestreview-6060174578) · [PR reviewers](https://github.com/Ronipaul99/commerceOS/pull/2) |
| Branch protection | GitHub's branch protection API confirmed protected `main`, strict required checks, and `BusinessOS release gate` bound to the GitHub Actions app (15368). Protection applies to administrators and requires one approval, stale review dismissal, approval from someone other than the last pusher, and applicable code-owner review. GitHub reports PR #2 as blocked. [Branch settings](https://github.com/Ronipaul99/commerceOS/settings/branches) |
| Hosted rehearsal and release | The review job returned `REVIEW_REQUIRED`. The disposable staging and rollback job was skipped, and the aggregate gate returned `RELEASE_CHECK_FAILED_REVIEW`. A fresh independent approval and a passing rehearsal and aggregate gate are still required. [Aggregate job](https://github.com/Ronipaul99/commerceOS/actions/runs/45643130794/job/139308333987) · [Skipped rehearsal](https://github.com/Ronipaul99/commerceOS/actions/runs/45643130794/job/139308335999) |
