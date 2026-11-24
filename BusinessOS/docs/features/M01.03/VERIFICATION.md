# M01.03 Verification

**Status** PASS_REVIEW_REQUIRED

**Checked** 24 November 2026, Asia/Kolkata. Node.js 22.22.2 and pnpm 9.4.0 on Windows.

| Check | Actual result |
|---|---|
| C01 Workspace and API build | PASS. Frozen offline install linked the existing shared contracts package. `pnpm.cmd --filter @businessos/api run build` and scoped strict typechecks for API, API contracts and API client exited 0. |
| C02 Lint and package boundaries | PASS. Targeted ESLint with `--max-warnings 0` and `depcruise --config .dependency-cruiser.cjs apps/api packages` passed. The graph reported 15 modules and 19 dependencies. |
| C03 Protected reads and errors | PASS. Real loopback NestJS HTTP with a test-only verifier. Generated client reads only its principal and paginates memberships. Verified OpenAPI response shapes, request IDs, empty authentication, case variants, invalid queries/cursor, stalled verifier, and denial of another principal's cursor. The normal bootstrap also rejects a synthetic token. |
| C04 Payload, preconditions and replay | PASS. Test-only command rejects broken JSON, unknown privileged fields, invalid field type, wrong media type, larger-than-limit JSON, missing idempotency key and stale version. Concurrent exact replays return the same result with one fixture effect. Changed reuse returns 409 and other principal state is separate. |
| C05 Contract drift and compatibility | PASS. `node scripts/contracts/generate.mjs --check --base-ref <HEAD SHA>` ran locally on the initial publication path. The tests reject operation removal, published type changes and weakened authorization, and accept a new operation. The PR workflow calls the same checker. No GitHub Actions run was observed. |
| C06 Regression | PASS. `node --test --test-reporter=spec tests/contracts/http.test.mjs infra/local/host-smoke.test.mjs` ran seven tests and all passed. Existing root, health, readiness and local stub behavior were retained. |

The first contract run hit Node's strip-only TypeScript restriction on constructor parameter properties. The generator now emits compatible constructor assignments and regenerated output. The package registry lookup for Supertest failed with a sandbox/network error. Contract coverage uses Node's built-in loopback HTTP runner with OpenAPI response assertions and no new external dependencies. ADR-024 is unamended.

| Scope | Status |
|---|---|
| Requirements | Master §18 HTTP rules, generated client, checked OpenAPI compatibility and provider-neutral authentication boundary. [Design](DESIGN.md) · [Implementation evidence](IMPLEMENTATION_EVIDENCE.md) |
| Runtime limits | Admission, validation and retry behavior are verified with fictional data. The existing normal bootstrap has no production verifier. Replay tests cover only test fixture state. Durable retries and provider verification need their owning work items. |
| Excluded suites | No schema or data migration, provider, live CI run, production load, tenant datastore or UI testing. M01.02 Docker acceptance remains separate. |
| Review and rollback | Human review pending. No PR or commit created. Revert the M01.03 source, workflow, client link and documentation to roll back. No business records are written. |
