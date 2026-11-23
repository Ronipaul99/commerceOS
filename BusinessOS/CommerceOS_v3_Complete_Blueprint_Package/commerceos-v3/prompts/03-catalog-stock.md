# CommerceOS v3.0 | M03 | 03 Catalog Stock

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 6, 17–18.

## Required implementation
Build products/variants/attributes/media/pricing, opening stock, movement ledger, transactional balances/reservations, stock count/transfer, inventory read-models, sample import commit, mobile SKU lookup. Version price policies, implement stock locks/idempotency.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
Two competing final-unit reservations at most one success; ledger reconciles; invalid import rows separated; transfer legs complete.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
