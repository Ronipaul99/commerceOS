# CommerceOS v3.0 | M09 | 09 Saas Commerce

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 13, 17–18, 20–23.

## Required implementation
Build plan definitions/versions, entitlements server-side, subscriptions, usage journal, billing period/counters, overage charge/reversal, platform billing and admin operator flow. Resolve G-07 and G-14 or use disabled demo configuration.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
SC-09; repeat fulfilment counts once; order returns handled per approved policy; merchant usage matches invoices.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
