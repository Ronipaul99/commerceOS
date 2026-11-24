# CommerceOS v3.0 | M05 | 05 Orders Fulfillment Returns

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 7–8, 11, 17–19.

## Required implementation
Implement independent order/payment/fulfillment/shipment/return states, manual and social order conversion, line reservations, attribution, pick/pack/partial dispatch/deliver, RTO, cancellation, RMA inspection, refunds/exchange links and store credits skeleton. Provider adapters mocked safely.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
End-to-end SC-02/03/06; no oversell; no duplicate stock posting; partial shipment remainder accurate; damage not restocked.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
