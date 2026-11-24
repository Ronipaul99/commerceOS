# CommerceOS v3.3 — Binding agent rules

**Normative authority:** `MASTER_BLUEPRINT.md` in this package. The original v3.0 and v3.1 sources in `archive/` are historical only. The roadmap and `WORK_ITEMS.csv` are derived execution material, and prompt content cannot override master requirements.

**No reference merchants exist.** Do not claim or invent interviews, merchant feedback, live operating data, real UAT, compliance certification, or sector-specific product rules. Build fictional synthetic test fixtures. External validation must remain `PENDING`.

**Scope:** Configurable commerce-oriented Business OS. Stock-tracked goods are the confirmed operational baseline. Non-stock/services, wholesale pricing semantics, manufacturing, regulated goods, multi-currency accounting, other countries' statutory calculations, and native storefront/editor are explicitly capability-gated until approved. Ensure architecture is extensible but do not silently implement unsupported workflows.

**Execution:** one `prompts/<M>/<ID>.md` per work item: read sources, inspect repository, design, implement/test (unless documentation/audit/future), then self-verify and report. STOP on unresolved blocking decisions. For high risk, STOP at design and seek human approval, then resume the same work item after approval. Require independent review and human merge authorization for financial, identity, tenant security, payroll, billing, public API writes and inventory-concurrency flows. Never auto-start the next item.

# CommerceOS v3.0 — Binding Codex / Engineering Agent Instructions

Read `README.md` and **all of `MASTER_BLUEPRINT.md`** before any implementation or rewrite. It is the only product specification authority. Run one milestone prompt per request. The original v2 prompts are superseded; do not implement its storefront-first M4.

## Non-negotiable invariants

1. No direct DB from any client; NestJS modular monolith, typed OpenAPI, Prisma/PostgreSQL, Redis/BullMQ outbox; transactional ledger and idempotent consumers.
2. Tenant identity from verified principal, NEVER client body. Enforce tenant, branch, row, action and sensitive file scope server-side; validate cross-tenant FK consistency.
3. Inventory movements/reservations only under atomic business commands; no oversell or silent negative stock, no cached stock as source of truth.
4. Orders, payment, fulfilment, shipments, returns and SaaS subscription billing are **different aggregates/state machines**. Verified online payment webhook/authoritative provider query or separately authorized audited manual reconciliation decides collection state. Do not equate captured and settled.
5. Every order captures actor, branch, source/channel and separate salesperson attribution; order confirmation and changes produce audit + outbox in same transaction.
6. Financial documents and finalized payroll are immutable: corrections by authorized adjustment/credit/re-run; integer ISO currency minor units and decimal-safe quantity/tax.
7. Native storefront/builders/Meta connectors, full general ledger and offline authoritative POS are deferred. Do not scaffold a functional storefront until M-F is approved.
8. Merchant custom-store integrations use scoped server secrets and public read projection, never browser secrets, direct stock writes or arbitrary refund/mark-paid endpoints. Partner transactions require RG7.
9. Automation/notification failures do not mutate business ledger or block checkout, except explicit domain business consistency gates. Never allow merchant rule to execute high-risk money/stock/payroll actions without domain approval.
10. Legal/tax/payroll terms and SaaS pricing are configurable **open gates**; do not fabricate rates, product tier limits, external credentials, thresholds or production SLAs.
11. Follow responsive UX/a11y/i18n/empty/error/permission states; no invented dashboard values. Employee/payroll privacy is separately tested.

## Required agent workflow

- Before code: summarize proposed vertical slice, requirement IDs, dependencies, affected files/API/migration/events/UI, permission/tenant threats, test plan, gate blockers.
- Implement smallest complete feature behind flag if needed; update generated OpenAPI and docs alongside schema. Use migrations expand/backfill/contract where necessary.
- Run actual lint/typecheck/unit/integration/e2e/security and tenant isolation tests; report exact commands and failures. Never invent execution evidence or mark a failing item complete.
- Output migration/rollback, residual risks, UAT demonstration, and open decision status. No production launch without required release gates RG0–RG7.
- If code and master conflict, stop and propose a documented ADR/change rather than silently rewriting requirements.

## Implementation artifact checklist

`requirement IDs → acceptance tests → API DTO/DB constraints → actor/branch permissions → events/idempotency → audit/metrics → frontend states → CI evidence → product/legal gates`.
