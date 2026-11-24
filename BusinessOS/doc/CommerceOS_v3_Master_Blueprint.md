# CommerceOS v3.1 — Master Product, Engineering & Delivery Blueprint

**Document ID:** COS-MASTER-003  
**Version:** 3.1.0 | **Date:** 24 November 2026 | **State:** Authoritative planning baseline; implementation NOT verified\
**Applies to:** BusinessOS multi-tenant SaaS for businesses across industries (India-first, English/Bengali-ready)\
**Primary audience:** Founder/product owner, solution architect, engineering team, UX, QA, security, finance/operations reviewers, and coding agents.

> **Document contract:** This file is the single source of truth for what to build, why, in what order, and how to verify it. It is a specification, **not proof that code exists, tests pass, compliance is satisfied, external integrations are approved, or a launch is safe**. Its proposed v3 resolutions are adopted as the *planning baseline*, subject to the explicit decision gates below. Do not silently treat pending decisions, configurable policies or future scope as approved implementations.

## 0. Executive directive

BusinessOS starts as a **general-purpose multi-tenant SaaS**. Its foundation covers verified accounts, isolated business workspaces, memberships and permissions, resumable setup, settings, and audit. Commerce operations extend the workspace as separately enabled modules, with their own authoritative records and controls. Native storefront and its builder remain future capabilities.

**Foundation validation:** use two synthetic businesses with different workspace settings and independent teams. Include one workspace with no optional modules enabled. Live business walkthroughs apply later to the capabilities selected for an operating pilot.

**First product success criteria:** an owner can verify an account, create or join a workspace, save and resume basic setup, activate the workspace, invite a teammate, and switch between authorized workspaces. The team sees its own settings and actions, including when no operational module is enabled. See [ADR-025](#235-adr-025-general-purpose-saas-foundation) for the foundation scope and acceptance cases.

**Release classes:**
- **P0 — Pilot-critical:** Must exist for a trustworthy controlled merchant pilot, using approved manual workflows where integration unavailable.
- **P1 — Commercial-critical:** Required by first paid launch, or prior to selling a tier that advertises that capability. May be incrementally piloted with explicit restrictions.
- **P2 — Expansion:** Valuable but not a dependency for pilot/first paid release.
- **F — Future storefront/channel work:** Clearly defined interface/extension points today; no builder or customer-facing storefront delivery in initial scope.
- **GATE — Decision/compliance gate:** Must be resolved and approved before the specified operation; placeholders are not permission to guess.

If a feature varies by advertised SaaS tier, **no merchant may be charged for it until implemented, tested, enabled and disclosed in plan entitlements**. Distinguish marketing plan names from deliverable capability.

## 1. Authority, provenance, and change control

### 1.1 Document hierarchy

1. **This MASTER_BLUEPRINT.md** — highest authority for product scope, invariants, architecture decisions, API principles, delivery gates and acceptance criteria.
2. **Approved ADR/decision amendments** appended to Section 23 and reflected in this master. New ADR alone does not override this master; update master in same change.
3. **OpenAPI, migrations, tests and interface design files** — implementation artifacts; must conform to this master. If conflicts arise, block/raise change request; never quietly mutate product intent.
4. **AGENTS.md and prompts/** — derived implementation instructions, never independently normative.
5. **Archived v2 source ZIP** — historical baseline only; superseded where v3 differs.

### 1.2 Change protocol

Any modification to scope, state transitions, payment/tax rules, public API, tenant permissions, billing, inventory ledger, or data retention requires a change proposal: ID; affected requirement IDs; reason; alternatives; migration/compatibility implications; test plan; owner; approval date. Version document semantically; publish change log; maintain feature-flag and rollback plan. For breaking API changes, publish deprecation/transition policy. Every PR cites requirement(s), tests, migration and changed contract.

### 1.3 Source-derived vs new v3 rules

**Preserved v2 architectural decisions:** separately deployable business web, Expo mobile, POS and restricted platform admin; NestJS modular monolith; PostgreSQL/Prisma; Redis/BullMQ and transactional outbox; tenant-scoped shared-schema isolation; ledger-led inventory/reservations; verified payment authority; workforce RBAC and sales attribution; immutable finalized payroll; online-first POS; decimal-safe quantities and paise amounts; typed contracts/OpenAPI; integration-ready APIs. These are v2 source-derived.

**New v3 planning decisions:** defer native storefront and builder; prioritize complete order/fulfilment, returns/exchanges, collections/settlement, invoice/cashbook, onboarding, workflow automation, merchant API configuration and paid-plan entitlements before first commercial release. Add explicit domains, failure paths, acceptance gates, data and external channel boundaries. These are design recommendations **adopted as this document's v3 baseline**, not claims that v2 contained them.

**Unresolved items:** provider choice, channel availability, GST/invoice treatment for specific businesses, current statutory applicability, actual SaaS tier parameters/price inclusivity, auth provider/cost, receipt/tax behavior, offline POS appetite, serialized stock, performance SLO commitments and employee policies. All tagged GATE with conservative defaults and owners in Section 23.

## 2. Scope and rollout boundary

### 2.1 In scope: pilot baseline (P0)

The shared workspace foundation covers owner onboarding, business settings, memberships, permissions, audit, secure backups, and isolation verification. A controlled **commerce pilot** adds role-focused web/mobile flows for enabled capabilities such as opening data imports, catalog, inventory, purchasing, customer enquiries, sales and fulfilment, returns, payments, POS, and reporting. The commerce pilot criteria apply to those capabilities when selected.

### 2.2 In scope by first paid launch (P1)

Platform scope includes gated SaaS subscriptions, plan entitlements, applicable usage quotas and billing, data export and privacy controls, support, and launch-grade security, monitoring, and recovery. Commerce offerings may add payment and COD reconciliation, purchasing and payables, operational automation, and merchant-scoped API access. Advanced workforce, payroll, and transactional integrations have their own release gates.

### 2.3 Future (P2/F)—design seam now, don't build early

Native storefront UI, drag/drop theme editor, pages/sections, preview/publish, SEO and customer account; third-party channel connectors (Meta/WhatsApp/Shopify/WooCommerce) requiring approval; advanced custom automation canvas; advanced accounting/GST filings; incentives engine/payouts; returns portal, loyalty, campaign management, AI insights; full offline selling with conflict-safe inventory synchronization; precious-metal/hallmark-specific workflows where required. **No storefront/cart/checkout route is implemented solely to satisfy future scope in early milestones**; define DTO boundaries and reserve namespaces.

### 2.4 Explicit non-goals/guardrails

No direct access by web/mobile/POS/storefront to the database. No direct API key in browser. No selling absent/unreserved stock without approved explicit backorder policy. No paid status from unverified frontend response. No unauthorized employee salary visibility. No manual ledger-row editing. No mutable finalized invoices/payroll; corrections by adjustment/credit notes. No hardcoded GST/PF/ESI/TDS rules. No Meta scraping or mass outreach without required platform approvals, consent and messaging policies. No full accounting double-entry general ledger in pilot. No server-authoritative offline stock mutation in initial release.

## 3. Users, org model, roles and top-level workflows

**Core roles:** workspace owner, administrator, member, and restricted platform operator/support. Modules can introduce scoped roles such as cashier, inventory controller, or payroll administrator. A person may receive multiple grants, including branch grants where relevant. Workforce records and future external customer identity have separate access scopes.

**Organizational model:** A tenant is a business workspace with members and settings. Branches are optional organizational units. Stock locations and registers belong to the relevant commerce capabilities and attach to an authorized branch. Commerce uses INR initially while the schema is currency-aware. Cross-branch operations must preserve movement legs and evidence.

**Primary flows:**
1. Owner sign-up → verify → create or join workspace → save business name and locale/timezone → resume or activate → invite teammate → switch between authorized workspaces. Capability setup starts when the business enables a module.
2. Instagram/WhatsApp/phone enquiry → find customer → quote/hold stock → payment/partial deposit → confirmed sales order → pick, pack and ship → delivery/settlement → return or exchange when needed.
3. POS sale → scan SKU → price/discount authorization → split tender → receipt/invoice → stock posting → cashier close and reconciliation.
4. Replenishment → supplier/PO → partial receipt/quality disposition → cost and inventory posting → supplier bill/payable → payment matching.
5. Owner/manager action center → review exceptions → approve/refuse → audited correction → dashboard refreshed.
6. Employee sales attribution → attendance/leave (if enabled) → payroll preview/approval/finalization (if enabled, with legal sign-off).
7. Future custom storefront connection → API credential/scopes → public product read → channel order submitted against authoritative server price/stock → idempotent confirmation and fulfilment; no duplicate merchant catalog.

## 4. Product quality principles and measurable outcomes

Each critical transaction shall be **observable, reversible through authorized compensating entries, tenant-scoped, idempotent where repeated, and explained in the UI**. The UI shall expose who changed what, when, and why for sensitive transitions. Users can export their business data in supported portable formats. Alerting/actions shall represent real pending work, not fabricated insight. Metrics have documented computation, grain, timezone and reconciliation rules. PII and payroll are access-controlled on every path, including exports and search.

**Pilot exit evidence (not assumed):** two separate tenant UAT runs; complete sample flows; no cross-tenant leakage; zero oversell under test conditions; financial and stock reconciliation; successful restore drill; validated merchant configuration; documented limitations; operational owner and escalation contacts. Paid release additionally requires subscription accuracy, invoices/data/privacy review, provider approvals, incident operations, and explicit feature/tier claims verification.

## 5. Business onboarding and optional capability setup (P0)

**OWN-001 Authentication/tenant creation.** Email + verified-phone support architecturally; provider and mandatory verification factor decided at Gate G-01. Require verification for owner activation, secure rate limiting, duplicate account discovery, session revocation, MFA for privileged admin. Owner creates or joins a tenant; global identities may have several memberships; a verified membership and selected tenant define business context.

**OWN-002 Resumable onboarding.** State machine `NOT_STARTED → IN_PROGRESS → READY_FOR_REVIEW → ACTIVE`, plus `SUSPENDED` (not a continuation of wizard); each step `NOT_STARTED/IN_PROGRESS/COMPLETE/SKIPPED/BLOCKED`. Save draft server-side; revisitable after activation; isolate wizard progress from business status. Show progress, skipped optional settings, outstanding validation, owner contact and last modified by. Draft tenant is not publicly discoverable.

**OWN-003 Guided setup.** The core journey uses steps 1, 9, and 10. Steps 2–8 become capability-specific setup when applicable. Team invitations are optional for single-owner activation.

| Step | Required decision/input | Optional/conditional | Completion check |
|---|---|---|---|
| 1. Owner & business | Verified owner, workspace name, locale, timezone | Display profile and industry label | Verified owner membership and valid settings |
| 2. Legal & address | Legal profile where a selected capability requires it | Billing address, invoicing name, GSTIN, PAN, authorized accountant as applicable | Conditional format checks, consent, legal review flag |
| 3. Branches & locations | Branch scope when a business chooses branches | Stock locations, dispatch origins, registers, hours when relevant | Any configured locations belong to the authorized branch |
| 4. Catalog policies | SKU format, units, visibility and stock controls for catalog users | Configurable category attributes | A valid SKU can be created when the catalog is enabled |
| 5. Data import | Validated import for the chosen module | Catalog, opening stock, customer/supplier data, or media | Preview and accepted validation results |
| 6. Price/tax/invoice | Price and invoice policy when invoicing is enabled | GST/HSN rules as applicable | Approved tax treatment before live invoice issuance |
| 7. Payment collections | Method permissions and verification policy when collections are enabled | Cash, UPI, bank, COD, gateway, settlement account | Evidence requirements satisfied before live use |
| 8. Fulfilment/returns | Fulfilment and returns policy when selected | Delivery or pickup, dispatch location, courier, SLA | Operational owner and valid fulfilment route |
| 9. Team | Owner permissions | Invite teammates and assign workspace or branch access | Role and scope enforced for every membership |
| 10. Workspace readiness | Verified owner, valid core settings, and secure workspace access | Each selected capability has its own checks before activation | Core workspace can activate independently of capability setup |

**OWN-004 Import Center.** Template downloads; CSV/XLSX ingestion for products, variants, opening stock, customers, suppliers; mapping and validation preview; dry-run with row-level errors, duplicate/SKU conflicts and currency/cost checks; dedupe suggestions not destructive merging; chunked idempotent commit; import job audit; rollback **only when records remain unreferenced**, otherwise compensating adjustment. Opening balances have `effective_at`, origin and authorized approver. Support downloads of rejected rows.

**OWN-005 Workspace defaults.** New workspaces start with empty business data, system-defined workspace roles, locale/timezone settings, and optional modules disabled. A module may supply its own safe defaults when enabled. Dashboard contents reflect real data and enabled capabilities. Setup discloses business data ownership, export, and applicable billing terms.

**OWN-006 Configuration management.** Business profile, branch/legal entities, bank/payment instructions (access-controlled), invoice/prefix series, tax templates, customer communication preferences, stock thresholds, timeboxes, notification quiet hours, security/MFA, employee policy only if module enabled. Show effective dates, change impact and audit history. For tax/financial changes, config versions are retained to reproduce past documents.

**OWN-007 Workspace and capability readiness.** Check verified ownership, required workspace settings, and secure access for core activation. Enforce applicable policy, authorization, entitlement, and validation for each optional capability separately. Show unresolved items in the relevant setup. Data isolation, safe stock controls, and verified payment authority are mandatory wherever applicable.

## 6. Catalog, pricing, availability, inventory and procurement

### 6.1 Catalog & merchandising source of truth

**CAT-001** Product → one or more variants/SKUs, category hierarchy, attributes typed and validated, tags/collections, product and variant lifecycle (`DRAFT/ACTIVE/ARCHIVED`), rich description, media reference/alt text, optional vendor barcode, brand; images via private object storage and signed delivery/CDN. Product can be inactive even when an old order retains an immutable snapshot.

**CAT-002** Categories define configurable attributes: jewellery (`style`, `plating/material claim`, `color`, `stone/type`, `weight`, `occasion`, `set_contents`) and saree (`fabric`, `weave`, `work`, `blouse_piece`, `length`, `color`); do not claim material or quality certification automatically. Variant dimensions can be custom; support one-of-a-kind SKU with quantity 1; reserve design seam for lot/serial/precious-metal compliance.

**CAT-003** Enforce `(tenant_id, SKU)` uniqueness (case and whitespace normalization policy), category/variant search, bulk edit with permissions, soft archive only where history requires. Media uploads virus checked, resized and authorized. Audit pricing and product status changes; allow CSV export.

### 6.2 Pricing

**PRC-001** Maintain merchant currency ISO (INR pilot); sale/base price, comparison price, cost snapshot and validity; allow explicit tax-inclusive/exclusive prices, optional branch/channel price lists. Price rules and discounts evaluated **on server** at order creation/confirmation and snapshot onto line. Negative totals prohibited; privileged override reason and max discount authorization; conflicting promotion precedence explicit (no discount stacking by default until merchant policy defined).

**PRC-002** Future price books, bundles, loyalty and coupons should extend pricing service; v1 supports line/order manual discount with authorization and known rounding. Historical orders never change on catalog price edits.

### 6.3 Inventory

**INV-001** On-hand, reserved, available (`available = sellable_on_hand − active_reservations − allocated_non-reservation_commitments`) by tenant, SKU, location; damaged/quarantined stock must not count as sellable. `stock_movements` is an append-only source of truth; `stock_balances` is a transactionally maintained projection, reconciled to ledger. No silent negative stock.

**INV-002** Stock movement has `type`, signed decimal quantity, unit, source document/type/id, location, actor, reason, reference, occurredAt, idempotency key. Movement types include opening, purchase receipt, POS sale, order dispatch/issue, return-restock, adjustment, transfer-out, transfer-in, write-off, correction; reservation is a **separate commitment** and should never be double-counted as on-hand movement.

**INV-003** Reservations have source (`SOCIAL/ORDER/POS/API`), SKU/location, TTL/expiresAt, status (`ACTIVE/CONSUMED/RELEASED/EXPIRED`), idempotency. DB transaction/lock enforces available stock before reservation and transfer. One source transition may consume inventory exactly once; payment failure/cancel/expiry releases reservation idempotently. For draft quotations, hold is optional and TTL visible. Backorders disabled by default.

**INV-004** Stock counts support cycle/full counts, expected and counted quantity, multi-person verification when configured, variance report, approval, ledger correction—not direct balance rewrite. Damaged, defective, returned and quarantined dispositions tracked. Transfer lifecycle `REQUESTED → APPROVED → PICKED → IN_TRANSIT → RECEIVED` or `CANCELLED/EXCEPTION`; out and in legs recorded, partial receipt/difference resolved with reason. Warehouse bins future; location minimum.

**INV-005** Low stock thresholds per SKU/location, stock aging, slow-moving, valuation inputs and cost history; inventory snapshots/reports by date. Reconciliation batch compares movement sum, reservations and balances; alerts on mismatch. Support conversion for unit packs or kits only under approved future composite SKU rules.

### 6.4 Purchasing and supplier management

**PUR-001** Suppliers with contact, tax/identity fields, payment terms, branch associations, status and notes. Purchase order (PO) with numbered document and lines (ordered/received/cancelled/rejected), expected delivery, unit cost, tax and authorization; `DRAFT → APPROVED → PARTIALLY_RECEIVED → RECEIVED/CLOSED`, plus cancellation.

**PUR-002** Goods receipt records received/accepted/rejected/quarantined quantities, destination location, cost snapshot, supplier invoice references, evidence, received actor and adjustment. Partial receiving must not close PO prematurely. Purchase returns or debit notes do not silently alter original receipts.

**PUR-003** Supplier bill/payment due tracking and partial settlement (P1); variance between PO vs GRN vs bill review. Capture freight/packaging landed cost using configurable allocation method (P1, choose and version method before cost reporting). Product margin can use recorded cost where available; display missing-cost warnings rather than fabricated profit.

### 6.5 Inventory & procurement acceptance

`INV-AC1` Two simultaneous bookings for final piece result in at most one active hold. `INV-AC2` Expired booking releases once even if worker retries. `INV-AC3` Partial supplier receipt updates only accepted sellable quantity. `INV-AC4` Transit stock not available at source or destination until receipt. `INV-AC5` Return marked damaged never increases available. `INV-AC6` Invalid stock import row cannot partially commit without explicit partial-import choice.

## 7. Customers, enquiries, social commerce and CRM

**CRM-001** Tenant-scoped customer profile; multiple contact methods/addresses, acquisition channel, tags, lifetime purchases (derived), notes, privacy/messaging permissions, soft merge with retained aliases and audit. Customers are NOT mandatory for anonymous counter walk-ins; sales still carry invoice-required information when legally applicable. Deduplication is suggested, not auto-merge across tenants.

**CRM-002** Enquiries/Leads: inbound `INSTAGRAM/WHATSAPP/FACEBOOK/PHONE/IN_STORE/OTHER`, product interest, budget/notes, photos (authorized), owner, priority, follow-up due, stage `NEW → CONTACTED → QUOTED → WON/LOST/EXPIRED`, reason codes and history. Enquiry can generate quote, booking and order. Follow-up reminders only with channel/consent compliance. No messaging-scraping in initial release.

**CRM-003** Quotations with line/price/tax/shipping snapshot, validity date, deposit option, revision history and acceptance. Quotation does not reserve stock automatically. `Convert to order` revalidates stock and price or asks for explicit approval. Customers can have outstanding dues, store credit, returns and follow-up tasks without exposing sensitive internal HR notes.

**SOC-001** Manual live-social session includes channel/link/reference, host, start/end, product queue, assignee, customer booking, TTL, order conversion, salesperson attribution, audit. Live booking target <4 taps for known customer/SKU subject to realistic UAT, not a guaranteed performance metric. Concurrent hosts cannot oversell one-piece SKU.

**SOC-002** Reservation expiry, optional payment request, conversion of held stock into order allocation, customer communications and session performance: reservations, conversions, net paid, returns by session. Payments are not marked received from customer screenshot alone absent authorized audited verification. External conversation ingestion, Meta DM/comment automation and mass message sending are P2 with provider approval/consent.

**CRM-AC1** A lost lead can be reopened without duplicating customer. **CRM-AC2** Duplicate contact merge preserves order and invoice references. **SOC-AC1** Booking expiry and order conversion cannot both consume same hold. **SOC-AC2** Social salesperson remains attached after employee transfers branch.

## 8. Orders, fulfillment, shipping, cancellations, returns & exchanges

### 8.1 Separation of authoritative states

**OMS-001** Do **not** use one ambiguous `order.status`. Maintain independently versioned:

- `order_state`: `DRAFT → RESERVED → CONFIRMED → CLOSED`, with `CANCELLED` terminal for unfulfilled, `PARTIALLY_CANCELLED` derived line condition, `EXCEPTION`/hold for operational investigation. Close requires policy-defined delivered/fulfilled and financial settlement treatment; never close merely on payment capture.
- `payment_state`: `UNPAID/PARTIALLY_PAID/PAID/REFUND_PENDING/PARTIALLY_REFUNDED/REFUNDED/FAILED/DISPUTED` derived from recorded allocations and verified transactions, not user toggle.
- `fulfillment_state`: `UNFULFILLED → PICKING → PACKED → PARTIALLY_FULFILLED/FULFILLED`, plus `ON_HOLD`/`CANCELLED` for undelivered remainder.
- `shipment_state`: `NOT_CREATED/LABEL_READY/PICKED_UP/IN_TRANSIT/OUT_FOR_DELIVERY/DELIVERED/FAILED_ATTEMPT/RTO_INITIATED/RTO_RECEIVED/LOST`; each shipment has its own state.
- `return_state` per RMA: `REQUESTED/AUTHORIZED/REJECTED/IN_TRANSIT/RECEIVED/INSPECTED/RESOLVED/CLOSED`; independent refund/exchange progression.

**OMS-002** Orders contain source `MANUAL/SOCIAL/POS/STORE/API`, branch, channel connection ID, actor `created_by`, one or more sales attributions (employee, share basis points), customer, shipping/billing snapshots, line price/cost/tax/discount snapshots, fulfilment/purchase references, timeline and policy snapshots. Store immutable monetary snapshots after confirmation; corrections as authorized documents.

**OMS-003** Order creation: server validates SKU, price, tax configuration, fulfillment location, customer constraints, discount authority and reservation capacity atomically. Explicit `ORDER_NOT_ALLOWED` and `INSUFFICIENT_STOCK` errors. Manual draft may save incomplete data; no stock allocation or invoice occurs until authoritative action. Confirm only when merchant's payment policy permits (e.g., COD and approved credit orders may confirm unpaid).

**OMS-004** Fulfilment: order lines → pick tasks with location/qty → scan/manual verification → pack parcels → label/dispatch → carrier tracking or authorized manual delivery confirmation → proof of delivery where available. Partial shipments, split locations, damaged/missing pick, pickup and self-delivery cases specified. Dispatch consumes allocated stock **once**. Picking/packing does not decrement on-hand unless explicit movement policy specifies earlier recognition and tests cover it.

**OMS-005** Shipping adapters: provider interface create shipment/label, rates where available, tracking, cancel, return; webhook signature verification; mapped statuses and raw provider payload retention with redaction; manual shipment mode for unintegrated couriers. Support COD amount, RTO, shipping charge adjustment and provider outages without changing order to delivered incorrectly. Carrier account credentials tenant encrypted.

**OMS-006** Cancellation: before dispatch release holds and reverse pending obligations; after dispatch requires RTO/return workflow, not silent cancellation. Partial cancel recalculates remaining obligations, taxes/credit documents by authorized policy. Every change has reason, actor, version and customer communication event when enabled.

### 8.2 Returns & exchanges

**RET-001** RMA references original order/line, requested quantity <= eligible quantity, reason, policy/date eligibility, condition evidence, approval, return transit, inspection and disposition (`RESTOCK/QUARANTINE/REPAIR/DISCARD/RETURN_TO_SUPPLIER`). Default no restock until inspection; prevent repeat refunds and repeated stock receipt for same quantity.

**RET-002** Resolution may be same-SKU replacement, different-SKU exchange (new linked order with net additional collection or store credit), refund to original payment where supported, manual refund with evidence, or merchant store credit. Track liability and movements separately; do not mutate original order totals. Issue credit/debit notes where applicable, with accountant configuration.

**RET-003** RTO is a shipment return with financial/COD/stock consequences and may or may not be a customer-initiated RMA. Distinguish it from delivered return; charge decisions, carrier fees, reversals and attribution eligibility must be explicit.

**OMS-AC1** Two channels selling last SKU never oversell. **OMS-AC2** Multi-package partial dispatch maintains correct outstanding qty. **OMS-AC3** COD delivered does not imply merchant has received courier remittance. **OMS-AC4** Cancel after pickup enters return/RTO path. **RET-AC1** Damaged return does not increase sellable stock. **RET-AC2** Partial refund cannot exceed eligible outstanding order value; retries do not duplicate. **RET-AC3** Exchange retains link to original and produces net payment/credit reconciliation.

## 9. POS and multi-branch retail

**POS-001** POS is separate online-first browser/PWA deployable sharing orders/inventory/finance APIs; not a second backend. Cashier signs into tenant branch, chooses open register and permitted pricing. Scan/search SKU, customer optional, authorized discount and manager override, cash/UPI/bank/manual terminal tenders, mixed payment, hold/resume cart, receipt print/share, return/exchange link to original where possible. Offline draft only; do NOT promise offline payment or stock correctness.

**POS-002** Register opening float, tender inflows/outflows, cash drops, petty cash expense, refunds, expected close, counted close, discrepancy reason, reviewer approval; multiple registers/shift sequence and cashier attribution. Fiscal receipts/invoices follow jurisdiction-specific config; avoid retroactive renumbering.

**POS-003** Stock location source is mapped to register/branch; same SKU concurrency with social/manual orders guarded by server reservation. UI must show live availability (not unqualified cached quantity). Receipt printer/barcode formats should degrade gracefully where hardware absent.

**POS-AC1** Duplicate submit under bad network only creates one sale. **POS-AC2** Cash variance is visible and approved, never overwritten. **POS-AC3** Cashier blocked from void/refund beyond permission. **POS-AC4** Cross-branch register access denied without assignment.

## 10. Payments, collections, settlement, cashbook, tax and financial operations

### 10.1 Money model and invariants

**FIN-001** Distinguish: (a) **order amount due**; (b) **payment intent/attempt**; (c) **captured/received collection**; (d) **allocation to order**; (e) **gateway/bank/courier settlement**; (f) **refund or chargeback**; (g) **cashbook movement**; (h) **merchant SaaS subscription billing**. These are separate domains. A payment may fund multiple orders, an order may have many payments; an advance/unallocated receipt is possible. Any mismatch goes to reconciliation, not silent correction.

**FIN-002** Payment methods `CASH/UPI/BANK_TRANSFER/CARD_GATEWAY/PAYMENT_LINK/COD/OTHER` with method-specific verification and evidence. Gateway capture success only from verified provider query or signed webhook. Manual cash collection needs assigned cashier/register; manual UPI/bank receipt needs authorized verification and immutable external reference/evidence (a screenshot alone is not independent verification). Manual trust-based exception is configurable for pilot and conspicuously tagged `MANUAL_UNVERIFIED` until authorized confirmation, with audit and restricted reporting. Do not expose a `markPaid` endpoint to arbitrary channel clients.

**FIN-003** Collections can be partial, deposit/advance, balance and overpayment with explicit allocation. Amounts BIGINT minor units paise; all rounding follows documented policy; multi-currency prohibited in initial transaction path until FX model defined. Refund cannot exceed captured/reconciled refundable amount; for COD/manual cash, refund workflow needs verified payout evidence. Chargebacks/disputes create separate liabilities and exceptions. Financial postings use append-only journal-like domain entries, not a full general ledger.

**FIN-004** Payment provider adapter handles intent/capture/status/refund/settlement; webhook signature and replay verification, provider event id uniqueness scoped to provider account, idempotency, out-of-order event processing and reconciliation polling. Failure modes: timeout, duplicated event, provider refund pending, partial settlement, webhook delayed, callback forged. Settled ≠ captured; reports carry clear status definitions.

**FIN-005** Cashbook entries include `OPENING_FLOAT/SALE_COLLECTION/EXPENSE/CASH_DROP/TRANSFER/REFUND/ADJUSTMENT/CLOSING`; cash movement and order collection reconcile but do not double count. Expense management: categories, branch/location, vendor, amount/tax as configured, receipt evidence, approval threshold, paid/unpaid, payout account; do not conflate expense with stock cost. P1 supplier payable and customer receivable aging, due reminders, bank/gateway/COD reconciliation queue, fees, payout adjustments.

**FIN-006** Contribution metrics use explicit formula: `recognized_net_sales − recognized_COGS − merchant-paid_shipping − payment_gateway_fees − discounts_not_already_in_net_sales − directly_attributed_costs` with no double subtraction. Dashboard must label this **contribution estimate**, not accounting net profit, unless full accounting reconciliation exists. Missing cost/fee data generates `INCOMPLETE`/coverage indicator. Expense-adjusted operating view is **estimated operating result** only, excludes unspecified obligations/taxes and payroll unless mapped. Sales recognition basis and tax exclusion need approved accounting policy.

**FIN-007** Tax/invoicing: configurable merchant registration status, supply place, HSN/SAC where applicable, rate effective dates, tax-inclusive calculation, invoice/receipt series unique by tenant+legal entity+period/policy, immutable issued document snapshot, credit/debit notes with references, exports for accountant. Distinguish quote, proforma, receipt and statutory tax invoice. GST rate and e-invoicing mandate applicability are **external legal gates**; do not auto-apply a single rate based on product category or assume all merchants are GST registered. Enable government IRP/e-way-bill integration only after separate specification and legal review. GST software subscription invoices for CommerceOS itself are separate platform billing documents.

**FIN-AC1** Partial UPI and COD balances yield accurate remaining due. **FIN-AC2** Replayed gateway webhook credits once. **FIN-AC3** COD delivered but unsettled appears in courier receivables. **FIN-AC4** Issued invoice never edited; correction uses authorized credit/debit note. **FIN-AC5** Reconciliation mismatch does not change financial source data until investigated. **FIN-AC6** Order refund and store credit produce traceable liability/collection adjustments. **FIN-AC7** Reports do not call a number profit where missing COGS.

### 10.2 Financial reports and dashboards

Definitions must specify event-time vs posting-time date, local business timezone, gross/net, tax inclusion, cancelled/returned policy and read permission. Required reports: daily sales by channel/branch/employee; order pipeline; aged receivables and pending settlements; payment methods and fee breakdown; cash register variance; expense ledger; purchase spend and supplier dues; refund/RTO losses; SKU margin and stock value with cost-coverage; business contribution; reconciliation exceptions; subscription usage and charges (merchant-facing). Each aggregate has drill-through and CSV/Excel export with audited private-data access.

## 11. Workforce, attendance, leave, payroll and incentives

**WF-001 P0** Employee HR record may link to global user after accepted invite. Assign branch, role grants and employment status, manager reporting chain, sales attribution. Separate `created_by`, `cashier`, `selling_employee` and approver. Immutable attribution entries can split 10,000 basis points by defined group; policy for unattributed shares and refunds is versioned. Staff may see own performance but not peer compensation by default. Exit revokes sessions/roles without deleting historical orders.

**WF-002 P1** Attendance: scheduled shifts, holidays, server-time authenticated check-in/out, breaks, late/early calculation, correction approvals, period locks, overlap/duplicate prevention; geofence/photo attendance **not** default. Leave: effective-dated leave types/policies, accrual/carryforward/cap rules, per-employee leave balance ledger, overlap checks, holiday/off treatment, approval/cancellation and retroactive adjustment audits.

**WF-003 P1 gated** Salary structures versioned by effective date and employee; basic/allowances/variable; selected proration, rounding, LOP and overtime; approved inputs and locked attendance; draft → review → approve → finalize with maker-checker wherever policy requires; frozen input/calculation/policy snapshot; immutable payslips; corrective runs instead of rewriting. Employee bank identifiers encrypted/restricted. No statutory tax/PF/ESI deductions enabled without tenant/jurisdiction eligibility and professional validation. Direct wage payout not initial scope.

**WF-004 P2** Incentives policy engine (versioned) can use branch/channel/category/SKU, split attribution, eligible paid/delivered/return-window states, tier thresholds, caps, reversals, clawbacks, approved statements and payroll import; no promise of automatic payout. Incentive accrual basis deliberately unresolved until merchant policy approves it.

**WF-AC1** Employee cannot see another's payslip or salary by direct object identifier. **WF-AC2** Branch manager cannot grant self payroll rights. **WF-AC3** Duplicate punch refused/explicitly corrected. **WF-AC4** Locked attendance can be amended only via approved adjustment. **WF-AC5** Same payroll inputs/version yields deterministic output. **WF-AC6** Finalized payroll remains immutable across rerun. **WF-AC7** Late refund adjusts incentive ledger, not historical approved statement.

## 12. Business automation and action center

### 12.1 Separation of infrastructure and product automation

**AUT-001** The technical worker foundation (outbox, BullMQ queues, retry, DLQ, scheduled jobs) is **not itself a merchant automation tool**. Add merchant-facing `Automation Center` with safe predefined templates, per-tenant enable/disable, conditions, thresholds, branch scope, schedule, recipient, delivery channel, consent policy, run history and failure visibility. P0 system-critical automations operate regardless of merchant user presets (e.g., hold expiry and payment webhook processing). No arbitrary JavaScript/SQL in merchant rules.

**AUT-002** Base DSL model: `trigger` (domain event or scheduler), `conditions` (allowlisted typed attributes and operators), `action` (allowlisted side-effect), `execution_policy` (dedupe window, delay, rate limit, max retries, quiet-hours), `ownership` (tenant/branch), `enabled`, `version`, `effective_from`. Evaluation must load current permissions/plan entitlements; event payload references immutable IDs and snapshots; never trust client-provided `tenantId`. New rule changes don't retroactively rewrite delivered events. Dry-run/sample-preview before enable; detailed immutable execution log with outcome, linked records, actor, reason.

**AUT-003** Trigger library P0/P1: `order.created/confirmed`, `payment.recorded/failed/settled`, `fulfillment.overdue`, `shipment.delivered/RTO`, `return.requested`, `stock.low/stock.count_variance`, `purchase.receipt_pending`, `quotation.expiring`, `customer.followup_due`, `employee.attendance_exception`, `leave.requested`, `subscription.quota_near_limit/renewal_due`, scheduled daily/weekly/monthly report. Require domain-approved semantics, versioned payload and dedupe.

**AUT-004** Action library: create manager task; in-app notification/push/email through approved provider; update follow-up due; create draft purchase suggestion; generate report/export link; escalate to manager; pause/unpause automation; append audit note. **No automatic refund, inventory write-off, salary finalization, bank payout, API key issuance, or broad customer messaging without separate authorization and approval rules.** External WhatsApp/SMS needs consent, provider contracts, templates and budget controls.

**AUT-005** Suggested presets: new order alert; unpaid balance follow-up; unpicked order alert after configurable SLA; low-stock SKU; upcoming supplier delivery; unmatched settlement alert; new return awaiting review; open attendance correction; daily owner summary; SaaS quota warning. Each preset has default disabled/enabled policy, sample trigger, prerequisites, variables, duplicate suppression, recipient and QA acceptance. Pilot prioritizes in-app tasks and push/email before paid external messaging.

**AUT-006** Action Center is unified *read model* across order exceptions, pending approval, cash variance, invoice setup warnings, low stock, supplier delays and staff tasks. The underlying domain remains authoritative. Tasks state `OPEN/CLAIMED/COMPLETED/DISMISSED/ESCALATED`, assigned/creator, SLA, source record, reason and history. Tasks cannot substitute for financial/stock-domain approval endpoints. A task may be reopened when source state changes; action authorization checked live.

**AUT-007** Safety and cost: per-tenant quotas, queue fairness and per-provider rate limits; backpressure; DLQ inspect/replay with permission; automation kill switch; avoid recursion (`automation_source` origin, depth cap), storm protection, quiet hours, customer opt-out and retry discipline. Notification delivery may be at-least-once; message dedupe and idempotent actions required. Merchant automation history retention and PII redaction configurable.

**AUT-AC1** Duplicate event sends one deduped task/notification where policy specifies. **AUT-AC2** Disabled rule cannot act. **AUT-AC3** Cross-tenant event cannot trigger another tenant's action. **AUT-AC4** Rule cannot impersonate privileged actor to refund. **AUT-AC5** DLQ replay must not duplicate financial postings. **AUT-AC6** Due reminder respects consent and configured quiet hours. **AUT-AC7** Notification provider outage doesn't block order creation.

### 12.2 Future automation visual builder (P2)

Canvas of trigger/condition/action/delay/approval nodes; versioned publishes; dry-run/simulator; loop detection; auditing; permissioned library of integrations; usage billing, template export/import. **Not part of initial Business OS implementation**; base DSL must be stable enough to support it without replacing operational engines.

## 13. SaaS plans, subscriptions, quotas, usage and platform operations

**SAAS-001** Platform product owns `plan definition`, `feature entitlement`, `tenant subscription`, `billing period`, `usage event`, `quota counter/projection`, `overage rating`, `invoice`, `payment/credit`, and `subscription state`. Platform billing is separated from each merchant's sales/payment ledger, credentials, tax and customer data. Subscription history effective-dated; plans versioned; upgrades/downgrades have disclosed proration policy and history.

**SAAS-002** Proposed plan labels under consideration: `Starter`, `Growth`, `Pro`, `Scale` and custom/enterprise. Previously discussed indicative prices ₹599 / ₹1,499 / ₹3,499 / ₹5,999 and order/product allowances are **unapproved pricing hypotheses**, not hard-coded product truths. Define pricing and whether tax is included by G-07 before first paid release. Plans are data/configuration, never `if (planName === ...)` branches. Every advertised feature is gated via entitlement in API, UI and background jobs.

**SAAS-003** Metering vocabulary and eligibility: count **distinct fulfilled commercial order IDs** as of policy-defined qualifying event; avoid charging per shipment; specify exclusions for test orders, void-before-fulfilment, exchanges/replacements, refunded or RTO orders, late refund corrections. Track qualifying event/reversal as append-only usage ledger, each keyed to tenant/order/type/billing period/event version. Quotas can be soft warning, hard cap or metered overage according to plan rules; never block lawful access to owned records, refunds or data export after overage.

**SAAS-004** Enforce product and active-SKU count separately, user seats/roles, branch limits, feature entitlements, API-call/automation quota, storage allowances and order overages if sold. Define cardinality and state (e.g. archived SKUs may or may not count), grace thresholds, warning percentages and overage rate. Tenant suspension preserves export, historical read and refunds according to policy; limit new business transactions rather than locking data without notice.

**SAAS-005** Billing states `TRIAL/ACTIVE/PAST_DUE/GRACE/SUSPENDED/CANCELLED`, distinct from tenant security suspension. Payment retries/dunning, invoice/credit note, partial month, billing portal, billing contacts, tax application and cancellation/data retention controlled by reviewed policies. Operator support access is timeboxed, approved and audited (prefer break-glass, not undifferentiated impersonation). Sensitive money actions maker-checker.

**SAAS-006** Platform admin views: tenant provisioning, verification, plan/tier, feature flags, metered usage, provider health, billing, anomaly and support tickets, audit access; never freely read merchant payroll, credentials, private documents or customer PII. Tenant isolation regression tests extend to support functions. Plan changes generate outbox events and reconcile counters.

**SAAS-AC1** Replayed fulfilment event bills once. **SAAS-AC2** One order shipped in 3 parcels counts once under approved metric. **SAAS-AC3** Overages reproducible from usage journal with agreed return policy. **SAAS-AC4** Plan downgrades preserve existing orders/data and clearly block only prohibited new actions. **SAAS-AC5** Provider billing outage cannot mutate merchant order status. **SAAS-AC6** Customer sees explainable quota and charge breakdown.

## 14. Analytics, alerts and exports

**AN-001** Domains: sales funnel, order value/count, top SKUs, low-stock, aging and turn, contribution and margin coverage, fulfilment SLA/delays, return/RTO rates, payment pending vs settled, employee attribution and workforce KPIs (permissioned), procurement lead time, customer repeat behavior, social session conversion, merchant SaaS consumption.

**AN-002** Standard metric catalog (minimum): `gross_order_value`, `net_sales_ex_tax`, `collection_received`, `settled_amount`, `pending_receivables`, `COGS_recorded`, `estimated_contribution`, `orders_confirmed`, `orders_delivered`, `fulfilled_eligible_for_billing`, `returns_quantity`, `exchange_orders`, `stock_on_hand`, `stock_available`, `stock_value`, `overdue_fulfilments`. Each metric defines state/filter, join grain, inclusive period window, timezone, refund treatment, ledger source, latency/staleness and missing-data indicator. Avoid adding captured money + COD receivable to imply cash balance.

**AN-003** Start with PostgreSQL indexed queries/read models and async refresh where necessary; no premature separate analytics warehouse. Large reports async with progress, secure expiring download link and audit. Schedule reports via automation with tenant rate limits. Filters/permissions enforced on aggregate and drill-down; personally identifiable exports logged.

**AN-AC1** Revenue widgets match reconcilable source documents; no demo values on live tenants. **AN-AC2** Dashboard reflects return reversal according to metric policy. **AN-AC3** Cross-branch visibility respects grants. **AN-AC4** Missing product costs make profit estimate incomplete, not zero.

## 15. Custom storefront API, Sales Channel Integration Hub and future builder seam

### 15.1 Product boundary

**INT-001** CommerceOS is headless-ready: merchant catalog, SKU prices, available-to-sell inventory, customers, orders, promotions (when enabled), payments and fulfilment stay authoritative in the Business OS. `sales_channels` identify `MANUAL/SOCIAL/POS/EXTERNAL_API/NATIVE_STOREFRONT`; a channel installation maps to merchant, permissions, origin/domain and attribution. An external website never writes `stock_balances`, `payments.paid` or invoices directly.

**INT-002** Delivery split: **P0** design schemas/contracts and internal channel abstraction; **P1** merchant API management and read-only catalog/pricing/availability APIs with secured order submission adapter IF merchant pilots require it; **F** native storefront application and visual builder; **P2** third-party platform connectors. Read-only integration is safe to launch before transactional API if testing incomplete; never infer a transactional contract is live merely because documented.

### 15.2 Integrations configuration in Business OS

**INT-003** `Settings → Sales Channels & Developers`: create named external integration, choose business branch/price list/currency, allowed capabilities, assign rate/usage cap, request domain ownership verification, add allowed CORS origins for *public-only browser* routes, configure webhook HTTPS endpoint/subscriptions and signing secret, generate/rotate/revoke credentials, run sandbox test and view request/webhook logs. Reveal secret only once; store salted hash of API key identifier/secret server-side where feasible; never show older secret again. Show last-used, state, actor and date. For P1, limit active integrations by plan entitlement.

**INT-004** Credential families:
- **Publishable channel ID:** Browser-safe identifier, *not a secret*. May read public product/collection/availability projections with rate limiting and verified origin where appropriate. May not read customer, costs, private prices or mutate orders/payments.
- **Server-to-server channel credential:** Opaque key or OAuth client credential, hashed/encrypted depending on use, short configurable expiry/rotation, explicit scopes, tenant and channel binding, IP restrictions where practicable, secret only stored by external website server.
- **Signed webhook secret:** Separately rotated and versioned; used to verify CommerceOS outbound messages, not an API credential. Outbound webhook destination ownership/SSRF checks.
- **Merchant user sessions:** Never re-used as long-lived integration keys; customer auth separate.

**INT-005** Fine-grained scopes: `catalog:read`, `pricing:read_public`, `availability:read`, `orders:create`, `orders:read_own_channel`, `shipments:read_own_channel`, `customers:create_minimal`, `webhooks:manage` (admin only), plus optional `returns:create` later. `orders:write_all`, `inventory:adjust`, `payments:verify`, `refunds:execute` **not available to external storefront integration**. Merchant role authorization needed to provision/revoke keys. API response DTO never includes wholesale cost, HR, payroll, private supplier data or unrestricted customer PII.

**INT-006** Security model: TLS; token scope + tenant + channel + merchant branch entitlement; order-level policy; allowlisted product projection; rate limit by tenant/key/IP/route; input validation; 401/403/409/422/429; CORS alone not sufficient; bot abuse and scraping throttles; per-key usage/alerts; secret redaction and request-id logs; domain verification and account ownership; disable on compromise. For third-party domains, payment provider hosted/tokenized flows and PCI-scoped architecture must be selected before checkout goes live; do not handle raw card PAN in CommerceOS.

### 15.3 Public/partner API surfaces

**INT-007** Version namespace: internal owner/staff `/api/v1/...`; public catalog `/public/v1/...` (tenant/channel resolved from verified public identifier); partner server API `/partner/v1/...` (authenticated merchant-scoped). Old v2 `/store/:tenantSlug/...` routes are **historical examples**, not mandatory P0 implementation. Future native storefront reuses typed public/partner DTOs. If security requires hosted checkout, purchase initiation uses `/partner/v1/checkout-sessions` instead of exposing a raw payment capture endpoint.

**INT-008** Public/product data includes only actively published SKU/catalog fields permitted for channel, price effective time, availability status or deliberately bucketed quantity, media URLs, category, tax display info where approved and last-updated. Stock reported is advisory; an order must revalidate server-side under transaction. Pagination/cursor/filter rules and caching with invalidation. Avoid exposing exact inventory quantities if merchant chooses `IN_STOCK/LOW/OUT_OF_STOCK` projection.

**INT-009** Order ingestion request contains channel id, `externalOrderId` (unique per channel/merchant), lines with SKU and requested quantities, customer/contact and address if authorized, shipping mode, optional discount code, price quote reference, and idempotency key. The Business OS recalculates authoritative price/tax/stock; if mismatch, return quote diff and require confirmation. State created as `DRAFT/PENDING_CONFIRMATION` or holds stock only under explicit API policy. External apps cannot set `paid=true` or arbitrary `fulfilled=true`. Payment confirmation comes from provider integration or merchant-audited collection. External customer `GET order` via scoped session token/server auth only.

**INT-010** Contract requirements: consistent `Idempotency-Key` per mutation with tenant/key endpoint/normalized body hash; rejection if same key reused with different body; `X-Request-Id`/trace; strict JSON schema; schema version; signed or authenticated cursor; ETag/version for stale writes; structured errors `{code,message,details,requestId}` and `Retry-After` for 429; API docs/OpenAPI examples and SDK optional. APIs are backward compatible within major version and webhook consumers tolerate additive fields.

**INT-011** Outbound webhooks include `eventId`, `eventType`, `apiVersion`, `tenantId` opaque identifier, `channelId`, `occurredAt`, resource refs, signed timestamp and payload schema version; HMAC verified over exact raw body+timestamp, replay window and signing key ID. At-least-once delivery, non-order guarantees across aggregates, dedupe via event ID, exponential backoff, max attempts/DLQ, manual redelivery and event replay audit. Per-endpoint webhook event type allowlist and filtered payload; never attach sensitive HR data. Incoming third-party hooks separately validated if supported.

### 15.4 Future native storefront builder — contract only (F)

**STR-F01** Separate Next.js tenant-branded app; builder uses `storefront_sites`, `site_themes`, `site_pages`, `page_revisions`, `section_instances`, `assets`, `navigation_menus`, `seo_settings`, `domains`, `publish_releases` and `site_previews`. Template/component schema versioned. Visual editor: section palette, drag/drop, layout responsive controls, tokens/theme, preview, draft/version, permissions and reversible publishing; templates may be cloned, not edited live without version. Enforce HTML/content sanitization, media scanning, preview isolation, CDN cache purge and signed preview tokens.

**STR-F02** Future storefront experience: category/collection, search, PDP, cart, tax/shipping quote, hosted/tokenized payment, order result, guest/customer identity, account/order status, returns request, policies, SEO and custom domain. E-commerce session state/customer auth separated from merchant admin auth. **No section-builder UI, checkout/payment UI or native storefront deployment is part of v3 pilot or paid Business OS launch gates**. Customer-facing returns and marketing pages are future features.

**INT-AC1** Revoked key immediately fails. **INT-AC2** Publishable ID cannot submit order or see supplier cost. **INT-AC3** A key for Tenant A cannot enumerate Tenant B even with guessed IDs. **INT-AC4** External order posted twice creates one order; mismatched body with reused key rejected. **INT-AC5** Price/stock modified after quote triggers authoritative revalidation. **INT-AC6** Webhook signature invalid/replayed message rejected by sample consumer. **INT-AC7** Webhook 500 retries without replaying money. **INT-AC8** Integration rate limit doesn't throttle unrelated tenant unfairly. **INT-AC9** Domain/CORS cannot grant any sensitive privilege.

## 16. Technical architecture and implementation constraints

### 16.1 Deployment topology and repo

Preserve v2: `apps/api` NestJS modular monolith, `apps/worker` BullMQ/outbox; `apps/business-web` Next.js + TypeScript administration, `apps/business-mobile` Expo React Native; `apps/pos` online-first PWA; `apps/platform-admin` restricted; `packages/api-contracts`, `api-client`, `design-tokens`, `ui-web`, `config`; `prisma`, `infra`, `docs`, `prompts`. `apps/storefront` is a **future placeholder, not an initial deployable**. Do not scaffold a working customer storefront during v3's Business OS milestones except empty reserved namespace if repository build demands it. See [ADR-024](#234-adr-024-businessos-engineering-toolchain) for the approved engineering toolchain.

**Backend modules:** Identity, Tenant, Branch, AccessControl, Onboarding, Configuration, Catalog, Pricing, Inventory, Reservation, Supplier, Purchase, Customer, Enquiry, SocialSale, Order, Fulfillment, Shipment, ReturnExchange, Payment, Settlement, Cashbook, Expense, InvoiceTax, POS, Workforce, Attendance, Leave, Payroll, Incentives (future), Reporting, TaskApproval, Automation, Notifications, SalesChannel, ApiCredential, WebhookDelivery, SubscriptionBilling, PlanEntitlement, PlatformOps, File, Audit, Search, ImportExport. Domain modules own persistence and invariants; communicate via explicit interfaces, not shared repositories across modules.

**Suggested service layers:** HTTP controllers and guards → application commands/queries → domain policies and transactional operations → repository/Prisma → outbox; worker adapters subscribed to durable events. Never call external provider within DB transaction; persist intent and reconcile asynchronously. Outbox rows committed with local business state, worker at-least-once. For long-running imports, reports and notifications, track job id/status/progress/error and provide cancellation where safe.

### 16.2 Tenancy, authorization and data boundaries

All tenant-owned tables carry `tenant_id` and tenant-consistent foreign keys; relevant branch data carries `branch_id`, and policies check branch assignments. Tenant derived from verified membership/credential binding, NEVER from untrusted request body alone. Explicit cross-tenant platform operations use separate audited principal, time-limited privilege. Query filters via repository wrappers and integration tests; optional Postgres row level security only after connection/session pooling safety review. Use composite `(tenant_id,id)` FK where reasonable to defeat cross-tenant references, strict unique indexes, soft delete only for business lifecycle; hard erase requires policy.

Roles are permissions by resource/action/scope (SELF, BRANCH, TENANT). Include explicit approval limits for discount, refund, stock write-off, invoice correction, payroll, API credentials and cash variance. Enforce in service/API and background action; UI visibility is only convenience. Attribute edits after approval go through domain command and audit.

### 16.3 Data consistency and asynchronous behavior

- Money in BIGINT integer paise; currency ISO-4217 and policy-controlled rounding; DECIMAL(precision,scale) for stock/tax rates; don't use binary float for accounting.
- Timestamps stored UTC with timezone-aware representation; merchant business calendar/timezone local; published schedule timestamps and DST offsets explicit.
- Optimistic version/concurrency on long-lived documents; `SELECT FOR UPDATE`/transactional allocation and unique index on exclusive holds; row locking order deterministic.
- Outbox/event_id unique, per aggregate version monotonic; event consumers idempotent. Internal retries do not duplicate stock movements, orders, refunds, usage events or outbound charges.
- Search and dashboard projections are eventually consistent and display freshness; stock reservation/payment writes use authoritative transactional DB, not cache/analytics index.
- External integrations have timeouts, circuit breakers, webhook replay/reconcile, DLQ and operator intervention; make partial failure visible.
- Versioned policy snapshots: price/tax, invoice, consent, reserve TTL, commissions, payroll, fee and billing policy, with effective date and approval.

### 16.4 OCI-compatible deployment without a lock-in requirement

Use containerized API/worker/web, managed PostgreSQL where budget and availability allow or explicitly operationally managed PostgreSQL, Redis, S3-compatible object storage adapter, secret manager (OCI Vault or equivalent), HTTPS gateway, observability stack and backups. **OCI Always Free may support a tightly constrained pilot but is not a validated production HA/SLA design**; external providers, network egress, storage, backups, public IP, SMS and scaling may incur costs. Avoid direct dependencies on paid OCI proprietary services in domain code. Deploy infrastructure per environment with documented cost envelope/alerts and secret rotation; define staging and production separately.

### 16.5 Mobile and POS

Expo Router, React Native + TypeScript, TanStack Query, lightweight local UI store, platform SecureStore and guarded deep links. Business mobile role-specific home, order/stock/CRM/social quick actions, manager task approvals, employee self-service; POS web tablet-first with online connectivity status. Cache only safe reads with TTL; sensitive documents in secure storage or short-lived links. Offline drafts of non-authoritative notes allowed; no offline paid/stock transitions until future conflict model approved.

### 16.6 Nonfunctional baseline and targets

**Proposed engineering targets, subject to load profiling (G-11):** 99.5% monthly pilot application availability excluding planned downtime (not contractual SLA); p95 authenticated reads <500ms and critical transaction API <1.5s under defined pilot workload excluding third-party latency; stock/purchase/order correctness under 50 concurrent contending requests for a single SKU; worker eventual delivery <=60 seconds under normal queue conditions (notifications may vary); RPO 24h/RTO 24h pilot **only if restore drill proves it**, much tighter for paid release depending on data-loss tolerance and hosting. Do not report these as achieved until tested. Accessibility WCAG 2.2 AA target; English + Bengali-ready layouts, keyboard navigation, responsive 390/430 mobile, 768 POS and 1280/1440 desktop. Performance budgets, load shapes and SLOs signed before launch.

**Availability/operational continuity:** Deploy migrations backward-compatible and reversible where possible; blue/green or rolling restart only when schema supports it; queue draining; operator dashboard for poison events and stuck reconciliations. Config changes to tax, payment, permissions, webhook secrets and price rules are audited. Maintain threat model/asset inventory, rotate secrets and back up encrypted tenant records.

## 17. Data model and schema migration guidance

### 17.1 Common persistence rules

All tenant-scoped entities: `id UUID`, `tenant_id UUID`, `created_at/updated_at TIMESTAMPTZ`, actor refs where applicable, `version` for concurrency, `deleted_at` only if deletion does not erase required financial history. `tenant_id` is indexed and part of foreign-key consistency. Branch-owned entities have explicit `branch_id` and allowed-location policy. Financial/stock/usage/audit ledgers **append-only**; compensating records rather than physical mutation. Sensitive and large payloads may live in encrypted object storage with metadata and retention pointers. Do not create all tables at once: migrations follow vertical slices.

| Domain | Tables/entities (v2 preserved + v3 added) | Key integrity/retention rule |
|---|---|---|
| Tenancy/auth | `tenants`, `tenant_settings`, `users`, `tenant_memberships`, `branches`, `locations`, `roles`, `permissions`, `grants`, `sessions`, `invitations`, `audit_logs` | tenant-safe composite references; membership status/branch grants |
| Onboarding | `onboarding_flows`, `onboarding_steps`, `configuration_versions`, `import_jobs`, `import_rows`, `import_mappings` | resumable; immutable committed import audit; staged file expiry |
| Catalog | `categories`, `products`, `variants`, `attributes`, `media`, `price_lists`, `prices`, `tax_profiles`, `product_cost_snapshots` | SKU uniqueness; historical product snapshots in orders |
| Inventory | `stock_locations`, `stock_balances`, `stock_movements`, `reservations`, `stock_counts`, `count_lines`, `adjustments`, `stock_transfers`, `transfer_lines`, `quarantine_lots` | quantity decimal; balance/movement reconciliation; no cross-location negative |
| Procurement | `suppliers`, `purchase_orders`, `po_lines`, `goods_receipts`, `receipt_lines`, `supplier_bills`, `supplier_payment_allocations`, `purchase_returns` | accepted qty <= received; order/receipt/bill matching |
| CRM/social | `customers`, `addresses`, `customer_notes`, `customer_consent_versions`, `customer_merge_links`, `enquiries`, `enquiry_activities`, `quotations`, `quote_lines`, `social_sessions`, `social_bookings` | no cross-tenant customer merge; booking expiration immutable history |
| OMS | `orders`, `order_lines`, `order_adjustments`, `order_status_history`, `order_sales_attributions`, `order_allocations`, `fulfillment_jobs`, `pick_tasks`, `packages`, `shipments`, `tracking_events` | state/line version; source/external id unique per channel |
| Returns | `return_authorizations`, `return_lines`, `inspection_results`, `exchange_links`, `store_credit_accounts`, `store_credit_entries`, `rto_cases` | qty/value cannot exceed original eligible balance; return disposition |
| Payment | `payment_intents`, `payment_attempts`, `collections`, `payment_allocations`, `provider_events`, `settlements`, `settlement_lines`, `refunds`, `chargebacks`, `reconciliation_cases` | external idempotency, allocation balance, verified evidence |
| Finance & tax | `cash_registers`, `register_shifts`, `pos_tenders`, `cash_movements`, `expenses`, `expense_approvals`, `invoices`, `invoice_lines`, `invoice_sequences`, `credit_notes`, `debit_notes`, `customer_due_entries`, `supplier_due_entries` | issued docs immutable; sequence unique by configured scope |
| Workforce | Original v2 `employees`, `employee_branch_assignments`, `shifts`, `attendance_records`, `leave_balance_ledger`, `leave_requests`, `salary_structure_versions`, `payroll_runs`, `payroll_input_snapshots`, `payroll_items`, `payslips`, `incentive_*` | effective dates, privacy scopes, frozen payroll |
| Workflows | `tasks`, `task_events`, `approval_requests`, `approval_decisions`, `automation_definitions`, `automation_versions`, `automation_runs`, `automation_action_logs`, `notification_preferences`, `notifications` | task provenance; versioned rule; unique `(event,rule,action)` dedupe |
| Integrations | `sales_channels`, `channel_installations`, `api_credentials`, `credential_rotations`, `webhook_endpoints`, `webhook_subscriptions`, `webhook_deliveries`, `integration_request_logs`, `domain_verifications` | credential/tenant scope; secrets not retrievable plaintext |
| SaaS platform | `plan_definitions`, `plan_versions`, `feature_definitions`, `plan_entitlements`, `subscriptions`, `subscription_events`, `usage_events`, `usage_counters`, `billing_periods`, `overage_charges`, `platform_invoices`, `platform_payments`, `feature_flags` | usage immutable and reproducible, platform/merchant ledgers separate |
| Ops | `outbox_events`, `inbox_dedupes`, `idempotency_keys`, `job_failures`, `file_objects`, `report_jobs`, `security_incidents`, `audit_exports` | prune by reviewed retention, never hide missing reconciliation |
| Future storefront | `storefront_sites`, `themes`, `page_revisions`, `sections`, `menus`, `publish_releases`, `tenant_domains` | schema reserved/documented only, no P0 migrations required |

### 17.2 Suggested high-value fields and constraints

- `orders`: `tenant_id`, `branch_id`, `channel_id`, `source`, `created_by`, `customer_id?`, `order_number`, `order_state`, `payment_state_projection`, `fulfillment_state_projection`, `version`, `currency`, `total_paise`, `tax_paise`, `shipping_paise`, `discount_paise`, `confirmed_at`, `external_order_id?`, `payment_policy_version`.
- `order_lines`: SKU/variant and merchant-visible product name snapshot, quantity DECIMAL, unit price/discount/tax/cost snapshot, fulfilment location, reserved/fulfilled/returned/cancelled qty, line version. Never sum fulfilled > ordered minus cancelled.
- `stock_movements`: signed quantity, source key `(source_type,source_id,operation)`, per-location SKU, cost data optional, effective/posted timestamp and reversal link. Unique source command key where needed.
- `collections`: provider verification state, method, external reference, currency/amount, verifier, received timestamp, evidence; `payment_allocations` unique source allocation; `settlement_lines` reconciles capture less fee/adjustments.
- `return_lines`: unique return authorization plus original order-line quantity; aggregate approved/received/refunded <= allowed quantity; disposition; linked credit/store-credit/refund evidence.
- `api_credentials`: `tenant_id`, `channel_id`, public key ID, secret hash (not plaintext), scopes, branch rules, last_used_at, expires_at, revoked_at, created_by`; rotation supports overlap window subject to policy.
- `usage_events`: immutable `tenant_id`, `usage_type`, `source_ref`, `billing_period_id`, `quantity`, reversal reference, `rule_version`, idempotency key; unique matching event rule prevents duplicates.
- `automation_runs`: tenant/rule-version/source-event/action attempt/state/latency/error/dedupe, opaque payload ref; ensure sensitive values redacted.

### 17.3 Referential integrity and migrations

Use foreign keys including tenant where appropriate; unique `(tenant_id,sku_normalized)`, `(tenant_id,branch_code)`, `(tenant_id,location_id,variant_id)` balances, `(tenant_id,order_source,order_number)` and `(tenant_id,channel_id,external_order_id)` (when supplied). Provider event uniqueness per account, `idempotency_keys` keyed to tenant/principal/route/key with request hash. Store actual `currency`, `unit`, `tax_rate_version` on documents; do not rely on mutable merchant settings for history. Create migration phases: expand → backfill → dual-read/compat if required → switch → contract; audit old-to-new v2 mapping. Protect ledger immutability at service and optional DB privilege/trigger layer, not merely UI.

**Data ownership/retention:** tenant export is authorized and reproducible; retention defaults must be legally reviewed for invoices, order records, payroll/attendance, audit and consent. GDPR is not assumed; India DPDP applicability and phased commencement need counsel review. On cancellation, preserve legal/accounting records as mandated while minimizing accessible unnecessary PII; documented deletion/erasure workflows. Do not perform unreviewed destructive deletes of financial history.

## 18. API surface, error conventions and transactional rules

### 18.1 Global API contract

Internal API base `/api/v1`; partner `/partner/v1`; public channel `/public/v1`. JSON resources; stable snake/camel policy: **camelCase JSON, snake_case database**. UTC ISO-8601 timestamps (`Z`) and human-readable monetary units only for display; wire amounts integer paise with `currency`. Percent/tax uses precise decimal strings. Pagination: `limit` (default 25 max 100) and opaque `cursor`, stable sort; filter allowlist. Errors `{ "code": "...", "message": "...", "details": {...}, "requestId": "..." }`; HTTP `400` malformed, `401` missing auth, `403` denied, `404` not found scoped resource, `409` conflict/stale/stock, `422` semantic invalid, `429` throttled, `503` provider/system unavailable. Authorization on every resource; 404 may be used to avoid object enumeration.

Write actions require `Idempotency-Key` for money, ledger, order confirmation/cancellation, reservations, fulfilment posting, refunds, subscription billing and usage; expected entity `version` or If-Match for concurrent edits; a repeated exact request returns original committed result, inconsistent reuse returns `409 IDEMPOTENCY_KEY_REUSE`. Side effects are emitted via transactional outbox.

### 18.2 Core endpoint catalog (target contract, not implemented routes)

| Area | Endpoints/commands | P |
|---|---|---|
| Identity | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /me`, `/me/memberships`, `POST /me/active-context`; `GET /me/permissions` | P0 |
| Tenant/onboarding | `POST /tenants`, `GET/PATCH /tenants/current`, `GET /onboarding`, `PATCH /onboarding/steps/:step`, `POST /onboarding/validate`, `POST /onboarding/activate`, `GET/PATCH /settings/:domain` | P0 |
| Staff/RBAC | `GET/POST /employees`, `POST /employees/invitations`, `GET/PATCH /roles`, `POST /role-assignments`, `GET /audit-logs` | P0 |
| Imports/exports | `POST /imports/preview`, `POST /imports/:id/commit`, `GET /imports/:id`, `GET /imports/:id/errors`, `POST /exports`, `GET /exports/:id` | P0 |
| Catalog/pricing | `GET/POST /products`, `GET/PATCH /products/:id`, `GET/POST /variants`, `GET/POST /categories`, `GET/POST /price-lists`, `POST /products/:id/media` | P0 |
| Stock | `GET /inventory/balances`, `/inventory/movements`, `POST /inventory/reservations`, `POST /inventory/reservations/:id/release`, `POST /inventory/adjustments`, `POST /stock-counts`, `POST /stock-counts/:id/approve`, `POST /stock-transfers`, `POST /stock-transfers/:id/receive` | P0 |
| Procurement | `GET/POST /suppliers`, `GET/POST /purchase-orders`, `POST /purchase-orders/:id/approve`, `POST /goods-receipts`, `GET/POST /supplier-bills`, `POST /supplier-payments/allocate` | P0/P1 |
| Customers/CRM | `GET/POST /customers`, `POST /customers/merge`, `GET/POST /enquiries`, `POST /enquiries/:id/followups`, `GET/POST /quotations`, `POST /quotations/:id/convert` | P0 |
| Social | `GET/POST /social-sessions`, `POST /social-sessions/:id/bookings`, `POST /social-bookings/:id/convert`, `POST /social-bookings/:id/release` | P0 |
| OMS | `GET/POST /orders`, `GET /orders/:id`, `POST /orders/:id/confirm`, `POST /orders/:id/cancel`, `GET /orders/:id/timeline`, `POST /orders/:id/attributions` (authorized) | P0 |
| Fulfilment | `GET/POST /fulfillment-jobs`, `POST /fulfillment-jobs/:id/pick`, `POST /fulfillment-jobs/:id/pack`, `POST /shipments`, `POST /shipments/:id/dispatch`, `POST /shipments/:id/proof`, `POST /shipments/:id/rto` | P0 |
| Returns/exchange | `GET/POST /returns`, `POST /returns/:id/authorize`, `POST /returns/:id/receive`, `POST /returns/:id/inspect`, `POST /returns/:id/resolve`, `POST /returns/:id/exchange-order` | P0 |
| Collections | `POST /payment-intents`, `POST /collections`, `POST /collections/:id/verify`, `POST /payment-allocations`, `GET /settlements`, `POST /reconciliation-cases/:id/resolve`, `POST /refunds` | P0/P1 |
| POS/cash | `GET /pos/registers`, `POST /pos/shifts/open`, `POST /pos/sales`, `POST /pos/shifts/:id/close`, `POST /cash-movements`, `GET/POST /expenses` | P0 |
| Invoices | `POST /orders/:id/invoice` (policy gated), `GET /invoices/:id`, `POST /invoices/:id/credit-notes`, `GET /tax/configuration` | P0 gated |
| Workforce | V2 workforce endpoints plus `GET /employees/me/sales`, attendance/leave, salary/payroll/payslip endpoints under P1 privilege | P0/P1 |
| Tasks/automation | `GET /tasks`, `POST /tasks/:id/claim`, `POST /tasks/:id/resolve`, `GET /automation/templates`, `GET/POST /automations`, `POST /automations/:id/test`, `POST /automations/:id/enable`, `GET /automation-runs` | P0/P1 |
| Reports | `GET /analytics/overview`, `GET /reports/:key`, `POST /report-jobs`, `GET /report-jobs/:id` | P0/P1 |
| Channels | `GET/POST /integrations`, `POST /integrations/:id/credentials`, `POST /integrations/:id/rotate`, `POST /integrations/:id/revoke`, `GET /integrations/:id/logs`, `GET/POST /integrations/:id/webhooks` | P1 |
| SaaS | `GET /subscription`, `GET /entitlements`, `GET /usage`, `GET /platform-invoices`, `POST /subscription/change-plan` (reviewed) | P1 |
| Platform admin | Separate `GET/POST /platform/tenants`, `/platform/plans`, `/platform/usage`, `/platform/incidents`, `/platform/support-access` with stronger authentication | P1 |

### 18.3 Proposed partner API contract (P1 / staged)

`GET /public/v1/channels/:publishableId/catalog`, `GET /public/v1/channels/:publishableId/products/:slug`, `GET /public/v1/channels/:publishableId/availability?skus=...`, `GET /public/v1/channels/:publishableId/config`; authenticated `POST /partner/v1/orders`, `GET /partner/v1/orders/:id`, `POST /partner/v1/orders/:id/cancel-request`, `GET /partner/v1/orders/:id/shipments`; future hosted `POST /partner/v1/checkout-sessions`, returns request routes. No raw merchant admin cookies, financial settlement/refund operations or stock adjustments via partner scopes.

**Illustrative authenticated order creation** (not a live endpoint):

```http
POST /partner/v1/orders
Authorization: Bearer <server-only-channel-token>
Idempotency-Key: site-checkout-7f57
Content-Type: application/json

{
  "externalOrderId": "myshop-2345",
  "branchId": "br_authorized_01",
  "customer": {"name": "Example Customer", "phone": "+91XXXXXXXXXX"},
  "lines": [{"sku": "JEW-101", "quantity": "1"}],
  "fulfillment": {"method": "SHIP", "postalCode": "700001"},
  "quoteVersion": "qv_abc123"
}
```

**Illustrative result:** `201` `{ "id":"ord_...", "orderState":"RESERVED", "paymentState":"UNPAID", "totalPaise":149000, "currency":"INR", "reservationExpiresAt":"...", "nextAction":"CONFIRM_PAYMENT" }` or `409 STOCK_UNAVAILABLE`/`409 PRICE_CHANGED`; server recalculates. Phone/addresses and JSON IDs above are examples; no live tenant data.

**Transactional rule for every API command:** (1) authenticate and derive scope, (2) validate schema+business policy, (3) verify idempotency hash, (4) lock/recheck authoritative records, (5) commit business state+audit+outbox+idempotent result, (6) worker delivers external side effects, (7) expose reconciliation/error when uncertain. Never expose secret keys or protected data in client logs. Generate OpenAPI from code and contract tests; example routes are not immutable until implementation ADR approves them.

### 18.4 Event contract and delivery policy

Event envelope `{eventId,eventType,schemaVersion,tenantId,aggregateType,aggregateId,aggregateVersion,occurredAt,correlationId,causationId,payload}`. Candidate events: `tenant.activated`, `import.completed`, `catalog.product_published`, `inventory.reserved/released/movement_posted/low`, `enquiry.followup_due`, `social_booking.expired/converted`, `order.created/confirmed/cancelled`, `fulfillment.picked/dispatched/delivered`, `shipment.rto`, `return.authorized/received/resolved`, `collection.received/verified`, `payment.paid/refunded/chargeback`, `settlement.reconciled`, `invoice.issued/credited`, `cash_shift.closed`, `attendance.corrected`, `leave.approved`, `payroll.finalized`, `automation.run_failed`, `subscription.changed`, `usage.recorded/quota_near_limit`. Use event versioning/allowed payloads and separate externally public webhook schema from internal event schema.

**Deduplication:** inbox key `(consumer, eventId)`; delivery key `(tenant, endpoint, eventId)`; business operation unique source reference as defense; retry uses exponential backoff+jitter bounded by provider quota. No claim of global ordering; process aggregate version where relevant. Define DLQ operators and retention, especially for finance, subscription and stock events.

## 19. Business web, mobile, POS and platform-admin experience

### 19.1 Information architecture (responsive Business Web)

1. **Overview:** owner dashboard, Action Center, notifications, recent activity, branch selector, commerce health alerts, data completeness.
2. **Sales:** All Orders (filters/bulk), create/manual order, detail and timeline, payment/dues, pick/pack/dispatch workbench, shipments/RTO, cancellations, returns/exchanges, quotations, social sessions/bookings, POS sessions.
3. **Catalog:** products/variants editor, categories/attributes, media, prices, import/export, archives and history.
4. **Inventory:** location balances, ledger, reservations, stock count, variance approval, transfers/in-transit, quarantine, adjustments, low-stock/reorder suggestions.
5. **Customers:** CRM directory/profile, enquiries/kanban, quotes, interactions, follow-up queue, segments with consent, customer credit/dues.
6. **Purchasing:** suppliers, PO, approvals, receiving, bill matching and supplier balances.
7. **Money:** collections, verification queue, settlement reconciliation, COD receivables, cashbook/register, expenses, tax/invoice series, financial exports and contribution coverage.
8. **People:** employees, invitations, roles/branch access, performance; attendance, shifts, leave, salary/payroll/payslips behind their own feature/permission gates.
9. **Insights:** sales, fulfilment, inventory/aging, social performance, returns, collections, product contribution, employee, purchase and usage reports.
10. **Automations:** template gallery, enabled rules, rule config, scheduled reports, run history, DLQ/operator escalation (internal only for unsafe replay).
11. **Settings:** guided onboarding/checklist, business/legal, branches/locations, price & taxes, invoice, payment methods, delivery/returns, channels/API keys/webhooks, notification, security, subscription/usage and data export.

### 19.2 Screens and interaction requirements by priority

| Area | P0 screens/flows | P1 additions | Future |
|---|---|---|---|
| Setup | register/login, tenant switch, wizard, import preview/errors, activation checklist, business settings | guided data migration and plan activation billing | storefront onboarding assistant |
| Sales | order board/detail/create, social live/queue/booking, enquiries, pick/pack/dispatch, return/exchange, payment collect, receipt | shipping label integration and settlement workbench | fully automated social channel ingestion |
| Inventory & purchasing | product/variant, category, branch stock, count, transfer, supplier, PO, GRN | costing, purchase return, bills and payables | forecasting/serial warehouse |
| Money | cash open/close, manual receipt verification, expenses, invoices, due view | settlement match, gateway fee/RTO reports, bank payout matching | full accounting portal |
| Workforce | staff, roles, attribution, own performance | attendance/leave/payroll/configuration screens when module sold | advanced incentives/rosters |
| Automation | action queue + simple templates + notification preferences | rule conditions/schedules, execution details, logs | node-based workflow editor |
| Developer & billing | integration placeholder/clear future status; billing usage readout when enabled | keys/webhook test console, plans, invoices, portal | storefront visual builder |

All critical screens specify field-level validation, access denied, search/filter, pagination, explicit working/success/retry states, undo where safe, audit timeline and fresh/last-updated data. Use task-oriented drawers where appropriate instead of assigning every flow a standalone route. Bulk operations preview consequences and report per-record results; destructive actions require reason/authorization. Financial and payroll exports require explicit scope and logging.

### 19.3 Business Mobile (Expo)

Role-based navigation: Home, Sales/Orders, Stock/Scan, Tasks, More; social agent may have prominent Live Session button; cashier may launch POS but POS is independent browser PWA. Owner sees exception summary/alerts and performance; manager approves returns, stock discrepancies, payments and leave if authorized; employee sees personal assigned orders, attendance/leave/payslips only for enabled modules. Mobile screens: login/workspace/branch, dashboard, order lookup/detail/create, book product, scan SKU, stock check, assigned pick/pack, collections evidence, customer lookup, alerts/action center, personal workforce. Security: push notifications minimal PII, app switcher screenshot policy for salary if supported, session revocation, biometric as convenience only (not authorization), input validation, offline draft status.

### 19.4 POS and Platform Admin

POS: terminal login and branch/register, new sale, price/discount override, customer, split tender, payment state, receipt/print, returns, transactions, opening/close, reconciliation exceptions. Hardware fallback, keyboard navigation and touch targets. Platform Admin: restricted login/MFA, tenant list/state, plan/feature definitions, usage/overage dispute, billing exceptions, service health and support audit; no unrestricted merchant payroll browse. Future Storefront UI **not** included in v3 release screen count.

### 19.5 Design system and accessibility

Neutral premium operational SaaS theme, consistent typography, spacing and semantic colors; status must not depend on color alone. Component contracts for tables, filters, transaction timeline, status chips, permission-aware actions, workflow steps, empty/error/success, progress, dialogs, money inputs and warnings. Responsive desktop/mobile and Bengali text overflow, 44px touch targets where appropriate. Accessibility target WCAG 2.2 AA, translated interface strings and locale/currency/date formatting; no decorative chart that replaces tabular data. Storefront theme design tokens intentionally separate from Business OS branding in future.

## 20. Security, privacy, compliance and governance

**SEC-001 Threat model:** primary threats are broken tenant/object/branch authorization, privilege escalation, exposed integration keys, forged payment webhooks, order/stock race, replayed financial event, PII/payroll leakage, malicious file upload, webhook SSRF, weak owner recovery, abuse of discount/refund rights and subscription quota manipulation. Include abuse cases in test plan. Align API reviews with OWASP API Security Top 10 (2023), not only generic web security.

**SEC-002 Authentication and access:** verified owner signup, server-side membership context, MFA for privileged users, secure password/OTP per G-01; access and refresh lifetimes with rotation/revocation, revoke all sessions on compromise; least privilege service identities, branch scopes, two-person approval where money or payroll warrant it. Explicit authorization for owner impersonation/support workflows, ideally none without authorized ticket and consent. Rate limits on auth and recovery endpoints; device activity audit; security headers/CSRF protection where cookie-based.

**SEC-003 Secrets and cryptography:** provider tokens, bank identifiers and private docs encrypted at rest and in transit; secret manager, rotated keys, HMAC signing keys separate from API keys, one-time reveal and revoke; no secrets in URLs, logs, analytics, crash reports or source. Database backups encrypted; short-lived signed URLs with tenant and purpose scopes. Validate outbound webhook domains to mitigate SSRF; prohibit localhost/private address redirects after DNS resolution except verified private integrations.

**SEC-004 Data privacy:** notice and purpose for customer/staff collection, consent/communication preferences, access/export/correction/deletion workflows, breach escalation, retention schedule and data processor agreements with providers. Review DPDP Act/Rules legal applicability and phased effective dates before launch (see Section 25 references). Restricted HR/payroll access in database query, exports, file downloads and analytics. Browser/public APIs do not expose full customer phone by default. Employee GPS/geofencing optional only with transparent policy and approval.

**SEC-005 Financial integrity:** provider signature and replay verification, webhook event uniqueness, money and stock commands idempotent, immutable evidence/history, reconciliation dashboards, invoice serial constraints, no unaudited write-off or refund and no fake success in UI. Manual payment verification is an exception path with approved roles, evidence and risk flag. Maker-checker policy by configurable amount threshold with immutable approver identity.

**SEC-006 Compliance gates (not automatic legal assertions):** merchant GST registration, invoice requirements, HSN/SAC, returns/credit/debit notes, supplier documents, e-invoicing/IRP eligibility, consumer protection/return policies; CommerceOS SaaS billing GST; tax/accounting record retention; HR wage/leave/PF/ESI/PT/TDS eligibility and local law; privacy rules; payment-provider/PCI obligations. Requirements may vary by taxpayer and change. Obtain qualified Indian legal/tax/payroll review. The application must store the reviewed configuration/effective date and responsible approver; legal review is an operational gate, not implied by code passing tests.

**SEC-007 Data portability:** merchant exports for products/SKUs, customers (subject to privacy), orders, invoices, stock ledger, collections, expenses, suppliers and employee records with scoped permissions; import provenance and schema version. Avoid lock-in to proprietary file format; documents can be PDF/CSV as approved. Backups are not replacement for customer export.

## 21. Testing strategy, release gates, operations and reliability

### 21.1 Test pyramid and mandatory datasets

**Unit:** price/tax rounding, tax profile effective version, stock arithmetic, reservation TTL, order/fulfilment/RMA transition guards, expense allocation, payment/settlement application, billing event inclusion/exclusion, automation DSL evaluation, payroll proration with fixed policies.

**Integration:** PostgreSQL transaction/locking, tenant+branch FK guards, idempotency, outbox insert and inbox replay, Stripe/Razorpay-like mock sandbox adapter (no provider choice assumption), refund verification, POS cash reconciliation, invoice document sequencing, import staging and duplicate detection, webhook signature, credential revoke and rate limit. Run against fresh DB with seeded two tenants and multiple branches.

**End-to-end:** two independent merchants; owner onboarding; social booking→order→partial money→fulfilment; POS tender→receipt→cash close; PO partial receipt→stock; return quarantine→exchange/refund; manager approval workflow; quota/overage; external channel mock (P1); private employee payslip. Include keyboard/screen reader happy paths and low-bandwidth/retry. No real customer PII in test fixtures.

**Isolation/security:** Tenant A cannot see Tenant B products/customer/order/payment/employee/payroll/API credentials; branch manager can't see other branches; privilege escalation attempts, guessed IDs, bulk export, file URLs, webhook SSRF and replay, log redaction, PII deletion, worker context leakage. Threat-model-driven penetration test prior to paid release.

**Performance/load:** concurrent final-unit reservations, 100 order creations with retries/duplicate submissions, popular stock read under cache delay, queue spike, provider webhook storm, import 10k rows, report export, multiple tenant fairness. Verify SQL indexes/queries and lock contention; performance criteria are gates, not promises.

### 21.2 Release gate definitions

| Gate | Required evidence | Owner |
|---|---|---|
| RG0 Foundation design signoff | generic workspace journeys, entities, roles, API boundaries, and unresolved capability decisions logged against synthetic tenant scenarios | Founder/product + architect |
| RG1 Tenant/security | role matrix, branch/tenant isolation tests, privileged login/MFA, audit logs | Security + QA |
| RG2 Commercial integrity | stock/reconciliation/returns/payment retry tests, document correction tests, approved manual exceptions | Engineering + merchant ops |
| RG3 Pilot operations | two-merchant walkthrough, imports, full operating day, cash/stock close, dashboard data, restoration dry-run | Merchant representatives + ops |
| RG4 Paid SaaS | plan entitlements, usage journal, overage/invoice replay, downgrade, payment failures, commercial terms and charges | Product + finance |
| RG5 Production | alerting, secrets, backup restore proof, incident procedures, privacy/legal review, load results, rollback | Platform + security + legal |
| RG6 Optional workforce payroll | salary policy signoff, permission/PII audit, locked periods, deterministic calculations and payslips | HR/payroll + legal |
| RG7 Optional partner transactions | key/scope penetration, webhook tests, duplicate/stock stress, order/collection reconciliation, docs | Integrations + security |

A phase may release behind limited pilot flag with documented exceptions; **no exceptions for cross-tenant leakage, silently incorrect stock or unauthorized payment status**.

### 21.3 Observability & runbooks

Structured logs with `requestId/correlationId/tenantId/actorId` (mask PII); metrics for API latency/errors, DB connections/slow queries, queue depth/age/DLQ, reservation leak, reconciliation mismatches, webhook errors, onboarding abandon, billed usage variance, public API rate and cache freshness. Distributed tracing; alert thresholds calibrated from pilot—do not invent production thresholds as measured facts. Runbooks for provider outage, duplicate webhook, lost payment, stock mismatch, incident access freeze, API key compromise, tenant export, partial migration, stuck jobs, restore and cancellation.

Define on-call operational owners for API/platform, security/secret rotation, integration/provider, payment/settlement, data recovery and merchant support; vacant ownership is release blocker. Daily checks: backups/restore evidence, DLQ, delayed shipments and unmatched collections, tenant anomalies and overage anomalies. Document supported helpdesk response SLO separately from platform availability.

### 21.4 Backup, DR, deployments and cost control

Database scheduled backups with PITR where supported and verified; object metadata+asset backup, restore into isolated environment, test referential integrity, document rotation and access; retention approved and costed. Encrypted backups, limited privileged restore access, restore dry-run before pilots accepting real money. Infrastructure budget alerts (OCI or other provider), egress/storage/CDN/SMS/media-processing costs attributed by tenant where possible; queue and webhook quotas prevent excessive spend. Migrations gated in CI; rollback plan and feature flag; version compatibility for mobile clients and API. No guaranteed free-tier capacity or zero-cost production claim.

### 21.5 Test/run evidence requirements for coding agents

Every milestone report must include: changed files; migration IDs; OpenAPI diff; implemented requirement IDs; actual lint, typecheck, unit/integration/e2e output (no fabricated successes); security and tenant-isolation tests; screenshots/UX review if UI changed; known defects; unverified provider/legal dependencies; rollback steps and next milestone readiness. Never call a prototype production compliant without RG gates.

## 22. Implementation roadmap and Codex work packages

### 22.1 Sequence principles

Implement **vertical slices**, not all domain tables and screens at once. Each milestone has DB migration + domain command/query + API + accessible UX + event + tests + documentation. Dependency order governs delivery; a staffed team may overlap independent UI exploration but not bypass integration gates. No calendar promises before estimates, team capacity, providers and hosting are approved. Storefront remains future: no native storefront step before paid Business OS release.

| M | Deliverable (no more than one validated slice per Codex task) | Must demonstrate | Gate |
|---|---|---|---|
| M00 | SaaS foundation discovery and design review | workspace journeys, role matrix, state invariants, synthetic tenant scenarios, and deferred capability decisions | RG0 |
| M01 | Repo/platform foundation | pnpm/Turborepo, API/worker/web/mobile/admin shells, Postgres/Redis, CI, telemetry, secrets, OpenAPI | CI and deploy baseline |
| M02 | Workspace identity, tenancy, and onboarding | verified memberships, scoped roles, basic setup, team invitations, configuration audit, and activation with optional modules off | RG1; workspace readiness |
| M03 | Catalog, prices, stock | SKU/variant/media, ledger/reservations/counts/transfers, concurrency and mobile lookup | no oversell; ledger reconciles |
| M04 | Suppliers, receiving, CRM & enquiries | PO/GRN with partial receipts, customer, quotation, follow-up, session/booking | stock receipt vs supplier evidence |
| M05 | OMS, fulfilment, returns & exchanges | manual/social orders, attribution, pick/pack/dispatch, RTO, RMA, credit/exchange | RG2 order/stock states |
| M06 | POS, collections, invoices & cashbook | register/split tender, UPI/manual verification, payments, receipt, expense, invoice sequence, refund | cash/payment/stock reconciliation |
| M07 | Operational dashboards, action center, automation foundation | domain metrics, tasks/approvals, low-stock/order alerts, notification workers, report exports | deterministic event/run replay |
| M08 | Merchant pilot & hardening | initial stock/customer import, 2-tenant UAT, restoration, load/security tests, merchant training, incidents | RG3, RG5 pilot provisions |
| M09 | SaaS commercialization | entitlements, subscription state, usage ledger/overage, platform billing, tenant operations | RG4, paid launch decision |
| M10 | Partner integration readiness | API credential management, public product feed, rate limiting, webhook logs; transactional partner orders only after separate gate | RG7 by capability |
| M11 | Workforce extensions | attendance/leave; payroll under legal/permissions gate; incentives schema groundwork only | RG6 for payroll |
| M12 | Business growth features | supplier payables, advanced analytics, automation rules, discounts, selective mobile and integrations | product/plan acceptance |
| M-F | Storefront program (future) | native branded store, visual builder, checkout UX, domain/SEO, customer returns portal | separate project/ADR |

**Implementation sequencing nuance:** M11 attendance/payroll can move ahead of M09 if a pilot explicitly needs it; this must be approved with scope trade-off. M10 read-only API might move earlier if a pilot merchant already operates a custom website; transactional API still requires RG7. Gateway and courier adapters can begin with mocks; actual live provider certification is not implied by prior milestones.

### 22.2 Repository project and task organization

Recommended deliverable tree:

```text
commerceos/
  apps/{api,worker,business-web,business-mobile,pos,platform-admin}/
  packages/{api-contracts,api-client,design-tokens,ui-web,config}/
  prisma/{schema.prisma,migrations,seeds}/
  infra/{docker,ci,deploy,runbooks}/
  docs/{MASTER_BLUEPRINT.md,ADR_LOG.md,API_OPENAPI.md,RELEASE_CHECKLIST.md}/
  prompts/{00-discovery.md,01-bootstrap.md,...,12-growth.md}/
  tests/{tenant-isolation,flows,contracts,load,security}/
  .env.example
```

Future `apps/storefront` added only in M-F. Do not copy merchant domain logic into POS/mobile/web. Generate API clients from schema; share semantic tokens, not React DOM components with React Native. Use feature flags and tenant plan evaluation in backend. Seed demos separate from actual tenant onboarding.

### 22.3 Required issue/task template

`Requirement IDs | Story / actor | Preconditions | Business invariants | Policy decisions + approver | API/DB/event contract | UX states | Failure/undo cases | Security/tenant scope | Telemetry | Tests/fixtures | Migration/rollback | Feature flag/plan entitlement | Actual execution evidence | Known limitations`.

Agent receives one milestone at a time; before code, list impacted modules and unresolved decisions; implement smallest complete slice, run tests and report truthfully. When master and existing code disagree, surface explicit discrepancy and proposed migration rather than changing master by implication.

## 23. Architecture decision register and unresolved gates

### 23.1 Adopted baseline decisions (v2 preserved)

| ID | Decision | Origin |
|---|---|---|
| ADR-001 | Separate Business Web, Business Mobile, POS, Platform Admin; future separate Storefront; shared API boundary | v2 preserved, scope rescheduled |
| ADR-002 | React Native + Expo single role-aware owner/employee app | v2 preserved |
| ADR-003 | NestJS modular monolith + PostgreSQL/Prisma + Redis/BullMQ + outbox | v2 preserved |
| ADR-004 | Shared-schema tenant isolation plus branch-scoped permission checks; RLS optional after review | v2 preserved |
| ADR-005 | Ledger-based stock, atomic reservations, verified payment events as online payment truth | v2 preserved |
| ADR-006 | Employee sales attribution P0, attendance/leave/payroll optional gated P1, incentives P2 | v2 preserved / reordered |
| ADR-007 | External connectors remain deferred, extensible via APIs/events | v2 preserved |
| ADR-008 | Effective-dated, approved, immutable finalized payroll snapshots | v2 preserved |
| ADR-009 | Storefront independent deployment/branding, no DB direct connection | v2 preserved, future only |
| ADR-010 | Online-first POS/mobile; offline drafts are not authoritative stock/money | v2 preserved |

### 23.2 New v3 planning decisions

| ID | Decision | Consequence |
|---|---|---|
| ADR-011 | Business OS first; native storefront and visual builder future | M-F separate; M04 old storefront prompt superseded |
| ADR-012 | Distinct OMS, payment, fulfilment, shipment, RMA states | independent state machines and projections |
| ADR-013 | Money flows modeled as collection→allocation→settlement/refund, separate merchant vs SaaS ledgers | reconciliation workbench, no false paid/settled |
| ADR-014 | Guided resumable merchant onboarding and staged data imports | new onboarding/import domains and pilot activation gate |
| ADR-015 | Merchant-defined operations via predefined automation template DSL; no unsafe auto money action | automation version/run audit, templates P1, visual designer P2 |
| ADR-016 | API-first sales channel abstraction; merchant credential/webhook management P1; transactional partner orders gated | API/admin boundaries, no client secrets |
| ADR-017 | Entitlement and usage ledger before paid launch, plans as data not hardcoded names | pricing decisions externalized; RG4 |
| ADR-018 | POS is same commerce ledger; register/cashbook and expenses mandatory for credible owner views | no second stock/payment truth |
| ADR-019 | Financial contribution only when costs present; don't mislabel full net profit | coverage labels and reconciliation |
| ADR-020 | Invoices immutable after issue, compliance rules configurable and reviewed | versioned invoice and tax setup |
| ADR-021 | Control-plane support access segregated and audited | strict platform admin separation |
| ADR-022 | Dedicated action center for operational exceptions and approvals | source state remains in domain |
| ADR-023 | No artificial launch thresholds or claimed OCI production capacity | empirical load/restore/cost gates |

### 23.3 Open decision gates (owner must explicitly approve before identified milestone)

| Gate | Question and default until approved | Responsible approver | Deadline |
|---|---|---|---|
| G-01 | Auth: OTP/email/password + MFA provider, SMS budget, recovery. Default: secure verified owner identity; no provider wired by assumption. | Product + Security | M02 |
| G-02 | Jewellery regulatory profile: imitation/fashion vs precious-metal, weight pricing, serial/hallmark. Default: fashion/imitation non-serialized configurable attributes. | Pilot merchant + Legal | M03 |
| G-03 | Inventory and finance costing: FIFO/weighted average, opening costs, return valuation. Default: raw cost snapshots and coverage labels; never assert full P&L. | Finance + Product | M03/M06 |
| G-04 | Customer quotations/holds: default TTL and refund/return period, exception approval thresholds. Default: configurable policy, mandatory setup before live use. | Pilot merchant + Product | M04/M05 |
| G-05 | Payment gateway, courier, COD, UPI manual-verify policy and settlement evidence. Default: mocks and authorized manual workflows only. | Product + Finance + Security | M06 |
| G-06 | Merchant GST/legal entity/tax and invoice series rules, e-invoice mandate, records and return documents. Default: tax features disabled where missing required approval. | Tax accountant/legal + Merchant | M06/live tax invoice |
| G-07 | SaaS plans: list price, GST inclusivity, 50/100/300/500 or other included orders, product and seat counts, what counts as fulfilled, refund reversal/overage and grace. Default: tier experiments NOT implemented as definitive prices. | Founder + Finance | M09 |
| G-08 | Automation delivery providers, WhatsApp/SMS consent, cost caps and default enabled presets. Default: in-app notifications/tasks only. | Product + Legal + Security | M07 |
| G-09 | APIs: read-only vs transactional partner launch, scope approval, domain ownership and payment/checkout model. Default: no live transactional external checkout before RG7. | Architecture + Security + Pilot merchant | M10 |
| G-10 | Workforce: attendance methods, leave calendar, statutory eligibility, payroll proration, incentives. Default: no statutory auto rules/payroll payout. | HR + Payroll/Legal + Merchant | M11 |
| G-11 | Hosting and capacity: OCI free-tier pilot constraints, production topology, queue/DB sizing, RPO/RTO, load shape, budgets. Default: portable deployment and measured readiness only. | Platform lead + Product | M01/M08 |
| G-12 | Retention/privacy: roles, DPDP applicability, data exports/deletion, processor agreements, sensitive employee content. Default: conservative minimization and retention schedule pending counsel. | Privacy/Legal + Security | M08 |
| G-13 | Invoice recognition/report basis: order created vs delivered, collection vs revenue; refund periods and contribution definition. Default: explicit labels with no accounting profit claim. | Accountant + Product | M06/M07 |
| G-14 | Subscription suspension and merchant data export protections, trial/grace/overage collection. Default: preserve historical reads/exports; block only new high-risk actions after notices. | Founder + Legal | M09 |

**Gate log protocol:** record final decision, approver, effective date, requirement delta and tests in master/ADR amendment. Product owner should not ask coding agents to invent legal rates, merchant conditions or external account credentials. In release readouts, unresolved gating item is reported as `BLOCKED`, not silently omitted.

### 23.4 ADR-024 BusinessOS engineering toolchain

**Approved 24 November 2026.** This is the v3.0.1 change record. It resolves technology choices for Sections 16, 19, 21, and 22 so scaffolding, verification, and deployment use a consistent toolchain.

| Component | Approved choice | Use |
|---|---|---|
| Business Web | Next.js + TypeScript | Application shell and routes with strict TypeScript. |
| Web UI components | shadcn/ui + Radix UI + Tailwind CSS | Accessible web primitives and project styling for Business Web and shared `ui-web` components. |
| Server state | TanStack Query | Cache, mutate, and invalidate API-backed state in Business Web. |
| Forms | React Hook Form + Zod | Form state and typed input validation in Business Web. Server-side DTO and business validation remain authoritative. |
| Web local state | Zustand | Shared client-only UI state. Keep API-backed state in TanStack Query. |
| Backend unit tests | Jest | Run NestJS API and worker unit tests. |
| Integration tests | Testcontainers + PostgreSQL | Run migrations, transactions, tenant isolation, and concurrency tests against real disposable PostgreSQL databases. |
| Browser end-to-end tests | Playwright | Verify Business Web, POS, and Platform Admin browser workflows as the applicable stories ship. |
| API tests | Supertest + OpenAPI contract validation | Verify HTTP behavior, authorization, and request and response compatibility against the API contract. |
| Load tests | k6 | Measure concurrency, throughput, and latency against the agreed workload. |
| CI/CD | GitHub Actions | Run builds, tests, security scans, and gated deployments. |
| Telemetry | OpenTelemetry | Instrument traces, metrics, and logs with the redaction and correlation rules in Section 21.3. |
| Database connection pooling | PgBouncer when warranted | Add when measurements show connection pressure warrants it and staging verifies compatibility with Prisma and transaction behavior. Keep migrations on a direct database connection when pooling is enabled. |
| Infrastructure as code | Terraform | Define infrastructure across environments with the chosen provider and existing deployment approvals. |

**Delivery and verification.** Adopt each choice in its applicable work item. Use fresh-checkout builds for the shells, OpenAPI and HTTP checks for the API, real PostgreSQL for transaction tests, Playwright for browser flows, k6 for measured workloads, and GitHub Actions for the staging release and rollback evidence. Verify OpenTelemetry output in M01.10 and validate Terraform plans before infrastructure changes. Pin compatible dependency versions in the implementation lockfiles.

**Compatibility and rollback.** This specification update requires no data migration or public API change. Existing release gates and deployment approvals govern runtime changes. A replacement tool or a change to this baseline follows the ADR change protocol in Section 1.2.

### 23.5 ADR-025 General-purpose SaaS foundation

**Approved 24 November 2026.** This v3.1.0 change covers the product entry point, M00–M02, and the division between workspace activation and capability readiness. A business can use the same workspace foundation regardless of industry or operating model. Product and Architecture review RG0 using synthetic workspaces, with real merchant process review scheduled for a relevant commerce pilot under RG3.

| ID | Foundation acceptance case |
|---|---|
| WS-01 | A verified owner creates a private workspace, saves editable name and locale/timezone, resumes setup after signing back in, and activates the workspace with all optional modules disabled. The home screen shows its empty state. |
| WS-02 | An owner invites a teammate to a workspace role. The teammate can accept a valid invitation and perform only granted actions. Expired or reused invitations and revoked access are rejected. |
| WS-03 | An identity with access to two independent synthetic workspaces can switch between them. A user with access to only one workspace cannot read or change the other workspace, its settings, or its memberships. Privileged changes are audited in the correct workspace. |

**Delivery boundary.** The core workspace demo uses generic settings, identity, team membership, and access control. Branches and operational modules enable their own screens, data, permissions, and setup when applicable. The POS shell is part of the optional POS delivery. Retail and other operational modules retain their own verification gates. Platform subscriptions remain a separately gated delivery and are independent of workspace setup.

**Compatibility and verification.** Existing commerce scenarios retain their IDs and apply to the selected modules. Future verification covers WS-01 through WS-03 and the relevant release gates. This specification change applies before implementation and requires no runtime migration.

## 24. End-to-end reference acceptance scenarios

These are canonical capability and operating-pilot UAT scripts. Run each applicable script in Tenant A and check isolation from Tenant B. Use WS-01 through WS-03 in ADR-025 for the workspace foundation.

**SC-01 Commerce capability activation.** An owner with an active workspace chooses the commerce capabilities for the pilot, configures the location and applicable pricing/tax/payment policies, previews 100 test SKU/opening-stock rows with 2 rejected rows, explicitly commits valid rows, invites a cashier, and runs a test order. Assertions: rejected rows stay out, invoice/tax gates apply, and commerce activates only after its own mandatory checks. Draft capability setup resumes after logout.

**SC-02 One-piece social sale concurrency.** Two sales agents book same last SKU from same location. One active reservation succeeds, other gets stock conflict. Buyer pays partial advance, booking converts to order without double-held qty; order remains partially paid, fulfilment follows COD/credit policy, final settlement tracked. Expiry retry after conversion must not release consumed reservation.

**SC-03 Full manual order lifecycle.** Enquiry → quote → order with two lines → one item backordered blocked by policy; after stock arrives, split pick/package → dispatch → delivered; customer sees accurate status; sales attribution and stock movement recorded once even when worker replayed.

**SC-04 POS cash close.** Open register with float → sell with cash+UPI mixed tender → process approved void/discount and expense → refund to customer → count cash → manager reviews variance → ledger, receipts, invoices and end-of-day report reconcile to branch.

**SC-05 Purchase partial and damaged.** PO for 10 pieces → receive 6 (1 damaged) → put 5 sellable on stock, 1 quarantine → receive remaining 4 later → supplier bill differs → variance reported → payable partially settled. No supplier payment double-post.

**SC-06 Return, exchange and RTO.** Shipped sale returns after delivery → authorize one line → receive damaged → no sellable restock → customer exchanges for different SKU → new linked order and additional collection/store credit reconciled. Separate failed-delivery shipment enters RTO; COD never treated settled.

**SC-07 Payment dispute and duplicate events.** Provider webhook `paid` duplicated, delayed `failed` event received after `paid`, refund retried; order remains correctly paid once until authoritative reversal and accurate pending refund; event inbox shows duplicate ignored; reconciliation case created when provider differs.

**SC-08 Workflow automation.** Owner enables low-stock alert for branch, muted notifications at night and delayed packing task after 4 hours. Generate duplicate event; one task produced; manager resolves; non-authorized staff cannot enable automatic refund. Provider email failure queued and traced, order unaffected.

**SC-09 Subscription overage.** Merchant on hypothetical plan with 50 eligible fulfilled orders; two shipments for same order and webhook replay count once; order #51 produces one usage charge according to approved rule; late return creates adjustment if allowed; billing screen explains and reconciles usage.

**SC-10 Custom storefront API.** Owner creates integration, sees secret once; publishable key reads public catalog; server key submits idempotent order against real price/stock; fake paid field ignored/rejected; mismatched price returns conflict; webhook HMAC verified; revoke stops requests; Tenant B data always forbidden. This is P1/RG7, not initial pilot requirement without an approved custom store.

**SC-11 Employee and payroll privacy.** Cashier sees own sales, not salary structure or other employee payslip. Manager corrects attendance with approval and audit; HR prepares versioned payroll, different authorized approver finalizes, payslip immutable; late adjustment creates corrective run. Only applicable if workforce payroll enabled.

**SC-12 Backup/incident continuity.** Restore representative tenant data in isolated recovery environment; compare counts, stock journal, invoices, collections and encrypted file access. Simulate webhook backlog and API key compromise; revoke/queue recovery and audit prove no double ledger posting.

## 25. Source map, compliance reference points and specification limitations

### 25.1 V2 source-to-v3 reconciliation

| Original ZIP file | Preserved/extended in v3 | Specific scope shift |
|---|---|---|
| `README.md`, `AGENTS.md` | Sections 0–4, 16, 22; new AGENTS | Storefront no longer pilot-critical, paid SaaS metering moved earlier |
| `docs/PRODUCT_BLUEPRINT.md` | Sections 2–14 | add fulfilment, money, approvals, onboarding, channel/API management |
| `docs/ARCHITECTURE.md` | Sections 15–18, 20–21 | preserve modular monolith/outbox; add domain states, SaaS control plane |
| `docs/DATA_MODEL.md` | Section 17 | add reconciliation, usage, CRM enquiry, task, API and migration entities |
| `docs/API_CONTRACTS.md` | Section 18 | define internal/public/partner scopes and state-machine commands |
| `docs/SCREEN_INVENTORY.md` | Section 19 | add Money, Automation Center, onboarding and API integrations |
| `docs/WORKFORCE_PAYROLL.md` | Section 11, G-10 | retain payroll invariants; gate optional workforce release |
| `docs/SECURITY_AND_TESTING.md` | Sections 20–21 | add SSRF, channel scopes, billing integrity, import/DR and SLO gates |
| `docs/ROADMAP.md` | Section 22 | replace storefront-first M4 with financial/operational readiness |
| `docs/DECISIONS.md` | Section 23 | retain ADR-001…010 and add ADR-011…023/G-01…14 |
| `prompts/01…09` | New prompts 00…12 | old `05-store-pos` split; duplicate old `06-hardening` superseded |

**No implementation validation:** The uploaded v2 archive contains 21 Markdown files, not application source, executable migration, deployed API or QA evidence. All new route names/tables are **target proposals** subject to code-level OpenAPI review. This v3 master is comprehensive planning guidance, but implementation tests, live provider/legal compliance and commercial approvals are external activities, not silently completed by document generation.

### 25.2 Public reference points (confirm current applicability at release)

- CBIC CGST invoice particulars and credit/debit note rules: https://cbic-gst.gov.in/gst-invoice-rules.html (requirements depend on merchant, document and registration).
- Official GST Invoice Registration Portal mandate overview: https://einvoice6.gst.gov.in/content/einvoice-mandate/ (e-invoicing thresholds/document scope may change; consult current notifications).
- Ministry of Electronics & Information Technology Digital Personal Data Protection Rules 2025 and commencement notifications: https://www.meity.gov.in/ (phased legal commencement; confirm current text and applicability).
- OWASP API Security Top 10 (2023): https://api-security.owasp.org/editions/2023/en/0x00-header/ (engineering security reference, not certification).

### 25.3 Signoff matrix

`Founder/Product`: functional scope, plans, future storefront boundary. `Two pilot merchants`: daily workflow and actual business constraints. `Architecture lead`: repo/modules/API/data/state invariants. `Security/Privacy`: tenant isolation, integration credentials and policy. `Finance/Tax reviewer`: merchant and platform invoice, payment accounting and SKU cost policies. `Operations`: backups, SLO, incident response and external providers. `QA`: scenario scripts, traceability and release evidence. No single role can waive tenant isolation or falsify a paid/settled financial state.

### 25.4 Definition of blueprint completion vs product completion

**Specification ready:** requirements, domain states, architecture, data, APIs, UX, tests and decision gates are identified, with no intentional storefront/Business OS boundary ambiguity. **Implementation ready:** open design gates required by a milestone are approved, tickets created and contracts made exact. **Pilot ready:** RG0–RG3 and applicable RG5. **Paid launch ready:** RG4–RG5 plus applicable RG6/RG7, provider and legal compliance evidence. None of these release states is established merely by this document.
