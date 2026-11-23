# CommerceOS v3.0 | M04 | 04 Purchasing Crm Social

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 6–7, 17–19.

## Required implementation
Build supplier/PO/GRN partial receipt, quarantine, customers/dedup, enquiries, quotation/followups, social sessions/queues/booking TTL and conversion. Approved policies drive pricing/hold expiry. Use manual social capture; no automated Meta ingestion.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
PO partial receipt and rejected qty; lead conversion trace; booking expiry cannot double-consume; scoped customer access.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
