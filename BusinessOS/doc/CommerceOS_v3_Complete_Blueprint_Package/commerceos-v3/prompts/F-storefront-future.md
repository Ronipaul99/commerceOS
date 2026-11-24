# CommerceOS v3.0 | M-F | F Storefront Future

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Section 15.4, 2.3, 22.

## Required implementation
Planning-only until explicitly authorized. Draft separate project acceptance criteria for branded storefront, page-section schema, editor, preview and publish, customer storefront APIs and secure hosted payment integration. Do NOT code in Business OS milestones.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
Formal ADR approval, isolation plan, new screen map, design and delivery gates before coding.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
