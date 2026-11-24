# CommerceOS v3.0 | M01 | 01 Bootstrap

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 1, 16, 20–22.

## Required implementation
Bootstrap pnpm/Turborepo with API, worker, business-web, Expo business-mobile, and platform-admin plus shared contracts, client, tokens, UI, and config. Set up local Postgres/Redis, health, logs, CI, synthetic workspace seeds, secret-safe environment examples, and baseline OpenAPI. ADR-025 schedules POS with its capability and storefront in M-F.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
CI lint/TS/tests; health endpoints; local migration + seed; no real credentials.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
