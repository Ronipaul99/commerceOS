# CommerceOS v3.0 | M00 | 00 Discovery

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 0–4, 19, 22–24.

## Required implementation
Identify and validate both pilot merchants workflows, map business owners/branches, customer, supplier, product and finance operations. Build scope matrix, role/action/branch permissions, state-machine UAT, compliance and provider decision log. Produce exact proposed gate decisions; do not guess ones awaiting owner approval.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
Written merchant journey maps; resolved G-01…G-06 decisions as available; sample test dataset; approved RG0 evidence.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
