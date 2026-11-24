# M01.07 verification

**Result** `PASS_REVIEW_REQUIRED`. Checked on 24 November 2026, Asia/Kolkata, on Windows with Node.js 22.22.2, pnpm 9.4.0, Jest 30.5.2, Supertest 7.3.2 and Gitleaks 8.30.1. The provider, tenants, sessions, credentials, CSRF tokens and signing keys were synthetic.

| Check | Command and result |
|---|---|
| Build and strict TypeScript | `pnpm.cmd --filter @businessos/api test:auth` compiled the API and passed nine Jest cases. `pnpm.cmd --filter @businessos/api typecheck` passed. |
| Lint and dependency boundaries | `pnpm.cmd run lint` and `pnpm.cmd exec eslint tests/security scripts/security --max-warnings 0` passed. An initial lint pass caught a missing Node console import in the scan runner. The import and the focused checks passed after correction. |
| Loopback and contract regression | `node --test tests/security/http.test.mjs tests/contracts/http.test.mjs infra/local/host-smoke.test.mjs` passed six AUTH cases and seven existing contract and host cases. |
| Tenant-context regression | `node --test tests/execution-context/isolation.test.mjs` with `M0104_ADMIN_URL` pointing to dedicated local PostgreSQL 17.10 passed all six M01.05 cases. The test stopped the disposable cluster after verification. |
| Secret scan | `node scripts/security/scan-secrets.mjs` used the checksum-verified Windows binary. Gitleaks detected the generated positive control and passed the 761-file source snapshot. The script suppressed raw scanner output and removed the temporary sample and snapshot. |
| Frozen lockfile | `pnpm.cmd --filter businessos --filter @businessos/api... install --lockfile-only --frozen-lockfile --offline --store-dir 'D:/.pnpm-store'` passed. |
| Timing | The final loopback and contract command took 5.16 seconds. The PostgreSQL regression command took 12.02 seconds. The verification budget is 1000 ms by default, with the deadline case configured to 50 ms. Representative latency and load qualification are `NOT_RUN` and require G-11 evidence. |
| CI and review | The workflow YAML and the pinned Linux checksum command were inspected locally. Hosted CI, independent security review and live G-01 provider qualification are pending. [Workflow](../../../../.github/workflows/businessos-m0107-security.yml) |
| Persistence and rollback | New schema, events and UI checks are `NOT_APPLICABLE`. Rollback retains previously recorded revocation decisions and requires an authorized key snapshot. [Implementation and recovery](IMPLEMENTATION_EVIDENCE.md) |

## Acceptance results

| Case | Observed result |
|---|---|
| AUTH-01 | Protected bootstrap loaded the requested secret using the tenant-session purpose. Each synthetic identity received its own subject and membership. Provider claims could not establish tenant or platform rights. |
| AUTH-02 | Missing configuration, missing material, malformed material and provider outage produced distinct redacted outcomes. Protected startup stopped, and the standalone shell refused protected mode without configured adapters. |
| AUTH-03 | Malformed, expired, wrong-audience, wrong-purpose and unbound credentials received 401. Revoking Tenant A's session did not affect Tenant B. An unavailable session authority returned 503. Passing a forged tenant header into an M01.05-scoped route failed. |
| AUTH-04 | Rotation accepted the permitted overlap, retired the previous version, and immediately rejected a compromised version. A failed refresh kept the last authorized snapshot. Indeterminate key status returned 503. Known revocation of the entire set denied authentication. |
| AUTH-05 | Bearer and cookie routes accepted only their configured credential source. Duplicate Authorization, duplicate session cookies, mixed sources, missing or foreign Origin and another session's CSRF token were denied. The valid cookie mutation executed once. Loopback requests simulated a configured immediate HTTPS proxy and verified HSTS and other headers. An untrusted proxy header did not establish HTTPS. |
| AUTH-06 | Provider exceptions included nested synthetic sensitive data and a client-supplied request ID. Security logs and error details contained no raw provider exception, credential, secret or reference. Gitleaks detected a generated positive control without printing findings. |

The loopback tests used trusted-proxy metadata to exercise HTTPS policy. The authentication and secret-store adapters were supplied explicitly by the harness. The scan workflow uses the pinned Linux release. Local verification used the Windows asset from the same Gitleaks release. [Release assets](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)
