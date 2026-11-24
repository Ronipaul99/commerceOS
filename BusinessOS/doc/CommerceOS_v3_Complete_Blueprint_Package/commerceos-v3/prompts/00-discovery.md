# CommerceOS v3.0 | M00 | 00 Discovery

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 0–4, 19, 22–24.

## Required implementation
Follow ADR-025. Map verified owner setup, workspace activation, team access, and workspace switching using two synthetic tenants. Document role and access boundaries, state cases, and open decisions for the foundation. Schedule operating workflows and merchant walkthroughs with the relevant capability pilot.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
Workspace journey maps, synthetic fixtures and WS-01 through WS-03, deferred capability decisions, and Product and Architecture approval for RG0.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
