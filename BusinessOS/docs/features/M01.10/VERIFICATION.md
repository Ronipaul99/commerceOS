# M01.10 verification

**Status** `PASS_REVIEW_REQUIRED` for the local engineering baseline. Hosted closeout Step 4 is `BLOCKED`. Verified on 25 November 2026, Asia/Kolkata, on Windows with Node 22.22.2 and pnpm 9.4.0. Fixtures used fictional Tenant A/B only. The M01 platform release remains gated.

| Check | Actual result |
|---|---|
| Builds and types | `pnpm.cmd --filter @businessos/api build`, `pnpm.cmd --filter @businessos/worker build`, and `pnpm.cmd run typecheck --concurrency=2` passed, with 14 of 14 typecheck tasks. |
| Lint and formatting | `pnpm.cmd run lint`, `pnpm.cmd exec eslint tests/telemetry scripts/telemetry --max-warnings 0`, `git diff --check` and `git diff --cached --check` passed. Dependency-cruiser found no violations across 89 modules and 242 dependencies. The first focused lint run found two undeclared Node globals in the native test. Explicit `globalThis` references fixed both. |
| Reproducible install | `pnpm.cmd --filter @businessos/api... --filter @businessos/worker... install --lockfile-only --offline --frozen-lockfile --ignore-scripts --store-dir 'D:/.pnpm-store'` passed. Existing web snapshots and direct dependency versions were preserved. |
| Contracts and health | `node scripts/contracts/generate.mjs --check --base-ref d4031a6e0d51a82c819e406509924a4241585020` and `node scripts/release/preflight.mjs` passed. The preflight compared six existing migrations and one additive migration. Public responses and generated clients are unchanged. |
| Telemetry, API and security regressions | `node --test tests/telemetry/controls.test.mjs tests/contracts/http.test.mjs tests/security/http.test.mjs infra/local/host-smoke.test.mjs` passed all 16 tests in 13.772 seconds. The focused three telemetry tests also passed with generic OpenTelemetry sampling disabled and the generic span attribute cap set to zero. The bounded in-process sampler retained its own measurements. |
| Native acceptance | `node --test tests/telemetry/native.test.mjs` passed four reported tests, including OBS-01 through OBS-03, in 38.710 seconds. PostgreSQL 17.10, Redis 7.4.11, Prisma migrations/verification, real HTTP and a physical BullMQ queue ran on isolated loopback. Dedicated fixture services stopped after the run. |
| Native regressions | `pnpm.cmd --filter @businessos/database test:postgres` passed all six reported tests in 52.506 seconds. `node --test --test-concurrency=1 tests/telemetry/native.test.mjs tests/execution-context/isolation.test.mjs tests/outbox/isolation.test.mjs tests/files/integration.test.mjs` passed all 24 reported tests in 82.541 seconds after the final instrumentation changes. This covered existing schema compatibility, tenant/branch isolation, outbox delivery and private file processing with the additive migration. The fixture processes stopped afterward. |
| Secret scan | `node scripts/security/scan-secrets.mjs` with checksum-verified Gitleaks 8.30.1 passed the redacted synthetic positive control and scanned 804 BusinessOS files successfully. |
| Baseline dependency scan | The original `pnpm.cmd audit --audit-level high --json` returned exit 1 with zero critical, three high and ten moderate findings. No OpenTelemetry package was listed with high or critical severity. M01 closeout Step 1 later cleared the three high findings in the Prisma chain. [M01.09 verification](../M01.09/VERIFICATION.md) |
| Hosted and review | Human review, hosted image build, actual operator rotation, collector/exporter, alert paging and stage/production load are `NOT_RUN` or pending their approval gates. No PR, production evidence or external validation is recorded. |

## Acceptance observations

| Case | Observed result |
|---|---|
| OBS-01 | One authorized scoped HTTP fixture command committed one outbox event. The HTTP, append, dispatch, worker and DB apply spans joined with the server-generated trace. Client trace headers and scope overrides could not select a trace or tenant. Unauthorized requests failed, duplicate input reused the same event, and sibling scope was unchanged. |
| OBS-02 | PostgreSQL rejected a query during worker projection and rolled back its receipt and effect. The failed BullMQ delivery produced an error signal owned by Platform On-call and the database metric routed to Data Recovery On-call. Captured diagnostics excluded the test token, raw query reference, HTTP query, personal-data canary and raw tenant/branch identifiers. Sink failure did not alter the underlying result. |
| OBS-03 | A worker stopped after committing, and the replacement detected an actual BullMQ stall and continued processing. Metrics and the coded alert showed the failure. Redelivery preserved one receipt and one effect. The local report grouped fault samples and displayed parent/span links without accepting arbitrary log fields. |
| OBS-04 | Malformed durable parents could not join a trace. The SDK retained 256 trace observations and a fixed set of metric labels. Liveness and readiness contract tests passed. Browser UI, new public routes and new monetary or quantity rules are `NOT_APPLICABLE`. |

## Performance observation

An in-process measurement called `telemetry.signal('http.request', 'ok')` 1,000 times for warm-up and 10,000 times in the measured loop. The elapsed `performance.now()` delta was 192.782 ms, or 19.278 µs per observation, with no log sink. The SDK counter retained all 11,000 observations and the trace ring held 256. These numbers measure the local instrumentation loop. Workload latency targets, pool sizing, alert thresholds, retention and hosted delivery remain open under G-11 and G-12. [SLO proposals and rollback](RUNBOOK.md)

## Closeout step 4 operational qualification

On 25 November 2026, the requester confirmed that the staging environment will be selected later and that Roni paul is currently the sole operator for Platform, Data Recovery, and Security on-call. This identifies the contact for all three roles. The response supplied no approved alert destination or permission to send a test notification.

| Approval or prerequisite | Verified state |
|---|---|
| G-11 staging and test boundary | `PENDING`. No staging deployment reference, approved test window or approval from Platform lead and Product was supplied. |
| G-18 telemetry configuration | OpenTelemetry as the engineering toolchain was approved by Roni paul as Founder/Product and Architect on 24 November 2026. No staging collector, exporter or alert delivery configuration was approved. [ADR-024](../../adr/ADR-024.md) |
| G-12 telemetry access and retention | `PENDING`. No staging access list, retention schedule or approval from Privacy/Legal and Security was supplied. [Decision register](../M00.05/DECISIONS_LOG.md) |
| M01.09 hosted prerequisite | The tracker remains `BLOCKED`. A fresh GitHub check found no open PR or workflow run for the published M01.09 candidate `0dc322bbf8e179a86cac9dd450d93eb6c7f7da09`. It contains the M01.09 release controls and the Step 1 dependency fix. The M01.10 API observability file was absent from that exact candidate. [Candidate](https://github.com/Ronipaul99/commerceOS/commit/0dc322bbf8e179a86cac9dd450d93eb6c7f7da09) · [M01.09 verification](../M01.09/VERIFICATION.md#closeout-step-3-github-qualification) |

| Hosted case | Actual result |
|---|---|
| Database failure delivery to Data Recovery On-call | `NOT_RUN`. Approved staging and the delivery route are pending. |
| Stalled queue delivery to Platform On-call | `NOT_RUN`. Approved staging and the delivery route are pending. |
| Failed job delivery to Platform On-call | `NOT_RUN`. Approved staging and the delivery route are pending. |
| Recovery, alert clearing and numeric thresholds | `NOT_RUN`. No approved staging observations or stateful alert rule were available. |

Hosted timestamps, trace IDs and receipt references remain unavailable. Step 4 was limited to local verification and GitHub evidence checks.

| Local fallback check | Actual result |
|---|---|
| Build and controls | `pnpm.cmd --filter '@businessos/telemetry' build` passed. `node --test tests/telemetry/controls.test.mjs` passed all three tests in 6.345 seconds, covering bounded trace propagation, failure isolation and CLI redaction. |
| Incident code mapping | An inline `node --input-type=module` fixture called `createTelemetry('worker')` and generated three local error observations. `node scripts/telemetry/report.mjs` grouped `DATABASE_OUTBOX_FAILED` under Data Recovery On-call and both `OUTBOX_QUEUE_STALLED` and `OUTBOX_JOB_FAILED` under Platform On-call. It omitted an injected synthetic debug field. This exercised in-process role labels and local reporting. |
| Native fault and recovery | The previously recorded OBS-02 and OBS-03 runs above show rollback of the failed projection and successful redelivery after a stall with one receipt and one effect. Step 4 used those recorded results for native fault evidence. |

The runbook now records the named routing contact, approval prerequisites, staging test sequence, evidence fields and rollback. [Staging drill and rollback](RUNBOOK.md)
