# CommerceOS v3.0 | M06 | 06 Pos Payments Finance

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 9–10, 17–20.

## Required implementation
Implement online-first POS/cash shifts/split tenders, payment collection/allocations/manual verification, refund/settlement statuses, cashbook, expenses, invoices with reviewed configuration and correction docs, gateway hooks sandbox and reconciliation cases. Block tax claims without G-06 signoff.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
SC-04 and SC-07; duplicate webhook once; COD unsettled remains receivable; cash close matches; issued invoices immutable.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
