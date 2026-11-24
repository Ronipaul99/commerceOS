# CommerceOS v3.0 | M07 | 07 Dashboard Tasks Automation

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 12, 14, 19, 21.

## Required implementation
Implement analytics metric catalog/source links, Action Center tasks, approval queues, system reservation expiry/notifications, 3–5 safe predefined automation templates, template config and immutable run histories. Begin automated reports without invented analytics.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
SC-08; dedupe/quiet hours, no cross-tenant tasks, provider outage independent; KPIs reconcile.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
