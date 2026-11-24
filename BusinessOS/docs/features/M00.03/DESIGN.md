# M00.03 State machines and invariants

## 1. Scope and boundaries

**Status** PROPOSED. **Evidence** HYPOTHESIS, external validation PENDING. This packet models transitions for stock-tracked sales, purchasing, and platform subscriptions. It applies to fictional Tenant A (manual and POS) and Tenant B (multiple branches and manual social sales). Every transition assumes the relevant module entitlement, authority and configured tenant policy. Tenant B may reuse references and SKU aliases under its own scope. [Master blueprint](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md) · [M00.03 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M00/M00.03.md)

Sales staff need truthful availability and outstanding line quantities. Warehouse staff need one authoritative stock issue per dispatch. Buyers need a PO that remains open when goods are short or awaiting disposition. Finance needs evidence-backed collections, settlements, refunds and disputes. Platform billing operators need independent subscription and usage histories. Services, non-stock fulfillment, manufacturing, regulated item rules and multi-currency accounting require their own capability decisions. External transactional channels and the native storefront are outside this slice. The [M00.02 ownership proposal](../M00.02/DESIGN.md) is an input awaiting approval.

## 2. Primary and alternate journeys

Sales requests the last available unit of one SKU and a second line of a different SKU. A competing request for the first unit conflicts. Confirmation converts both holds to commitments. An authorized partial cancellation releases only the second line's commitment and records a linked adjustment. Warehouse staff pick, pack and dispatch the retained line. Delivery, return receipt, inspection, merchant collection and financial settlement each have independent evidence. A damaged inspected item is quarantined. A verified partial refund changes Payments records while retaining the original order snapshot. [Worked trace](PLANNING_EVIDENCE.md#positive-mutation-trace)

Alternate routes include expiry before conversion, cancellation before dispatch, stock exception during pick, carrier failed attempt and RTO after pickup, partial/damaged PO receipt, disputed payment and subscription dunning. A shipment already picked up enters a linked return/RTO path. Authorization and current version are rechecked on retries. Future UI shows per-domain state and per-line quantities, with separate pending, stale, conflict, empty and permission states. State must remain readable in text, operable by keyboard and assistive technology, and legible at mobile widths. Screens and routes are outside this planning item.

## 3. Ownership and transition catalog

Each owner is the exclusive source for its command writes and authoritative queries. Its transaction validates guards and records the update, audit and outbox facts together. A workflow calls owner interfaces when one business command needs multiple writes. Cross-module consumers act on facts or call authorized owner commands. Timeline and dashboard projections show freshness and cannot authorize stock or money changes.

The table uses comma-separated alternatives in the source column. Same-state rows record a guarded effect or an explicit no-op, as stated. SAME preserves the current state. DERIVED reruns the payment projection against verified facts. States describe a single aggregate or explicitly labeled projection. The table lists internal command concepts for review.

### Reservation and order

The diagrams show the primary paths. The transition catalog includes exception and recovery paths.

~~~mermaid
stateDiagram-v2
    direction LR
    [*] --> ACTIVE: R01 reserve
    ACTIVE --> CONSUMED: R02 convert
    ACTIVE --> RELEASED: R03 release
    ACTIVE --> EXPIRED: R04 expire
~~~

~~~mermaid
stateDiagram-v2
    direction LR
    [*] --> DRAFT: O01 save
    DRAFT --> RESERVED: O02 reserve
    DRAFT --> CONFIRMED: O03 confirm with allocation
    RESERVED --> CONFIRMED: O03 confirm and consume hold
    RESERVED --> DRAFT: O04 all holds end
    CONFIRMED --> CONFIRMED: O05 partial cancel
    CONFIRMED --> CANCELLED: O06 full cancel before dispatch
    CONFIRMED --> CLOSED: O09 close with policy evidence
~~~

| ID | From | To | Command and actor | Guard, effect and recovery |
|---|---|---|---|---|
| R01 | NEW | ACTIVE | Reserve, authorized sales or configured channel service | Inventory locks scoped stock position, checks positive quantity and availability, and records a new hold with policy TTL. Insufficient stock leaves no hold. |
| R02 | ACTIVE | CONSUMED | Convert, authorized order workflow | Same tenant, SKU, location and unexpired hold. Inventory atomically swaps active quantity for a commitment. If expiry wins, confirmation must revalidate stock. |
| R03 | ACTIVE | RELEASED | Release, authorized cancellation workflow | Release the outstanding hold once for authorized cancellation or authoritative payment failure when policy calls for it. |
| R04 | ACTIVE | EXPIRED | Expire, scoped scheduling worker | Compare authoritative time with hold deadline under the same guard as conversion. Retry of the committed operation returns its result. A late expiry of a consumed hold has no effect. |
| O01 | NEW | DRAFT | Save draft, sales staff | Validate branch and permitted fields. An incomplete draft creates no authoritative allocation. |
| O02 | DRAFT | RESERVED | Attach active holds, sales workflow | All referenced holds match order scope and requested quantities. Inventory owns hold creation. |
| O03 | DRAFT, RESERVED | CONFIRMED | Confirm, authorized sales workflow | Validate server pricing, policy snapshot, scope, payment eligibility and stock. Convert holds or obtain allocation atomically. Persist attribution and immutable confirmed line amounts. Failure rolls back all confirmation effects. |
| O04 | RESERVED | DRAFT | Clear expired/released references, order workflow | All draft holds have ended. Any remaining active hold is still tracked until release or expiry. Recompute availability when requested again. |
| O05 | CONFIRMED | CONFIRMED | Cancel part, scoped manager | Cancel only undispatched remainder, release corresponding Inventory commitment, and append authorized obligation adjustment. Derive PARTIALLY_CANCELLED from line quantities. Maintain the confirmed snapshot. A stale command revalidates instead of silently clipping quantity. |
| O06 | DRAFT, RESERVED, CONFIRMED | CANCELLED | Cancel all, authorized sales/manager | Requires zero dispatch history and release of any active holds/commitments. Reverse outstanding obligations through their owners with reason and audit. |
| O07 | RESERVED, CONFIRMED | EXCEPTION | Investigate, scoped supervisor | Record reason and previous state, preserving quantities and financial facts. |
| O08 | EXCEPTION | CONFIRMED | Resume confirmed order, scoped supervisor | Prior state was CONFIRMED and recovery revalidates facts. Resume to RESERVED for still-valid draft holds or DRAFT if holds ended under O10/O11. |
| O09 | CONFIRMED | CLOSED | Close, scoped order workflow | All remaining lines meet configured fulfilled/delivered treatment, and financial settlement/reconciliation is handled per recorded policy. Capture by itself fails this guard. |
| O10 | EXCEPTION | RESERVED | Resume reserved order, scoped supervisor | Prior state was RESERVED and the draft holds still cover eligible lines. |
| O11 | EXCEPTION | DRAFT | Resume draft, scoped supervisor | Prior state was RESERVED and holds have ended. Revalidate before confirming. |

### Fulfillment, shipment and RMA

~~~mermaid
flowchart LR
    F[Pack and dispatch] --> I[Inventory issue once]
    F --> S[Shipment pickup and tracking]
    S --> D[Delivered]
    S --> T[RTO path for failed delivery]
    D --> R[Authorized return and physical receipt]
    R --> Q[Inspection and stock disposition]
    Q --> M[Authorized monetary or exchange resolution]
~~~

| ID | From | To | Command and actor | Guard, effect and recovery |
|---|---|---|---|---|
| F01 | UNFULFILLED | PICKING | Assign pick, warehouse lead | Confirmed line and available branch/location commitment. Pick records work only. |
| F02 | PICKING | PACKED | Pack, warehouse staff | Verify picked SKU and quantity. Pack records package coverage without decrementing stock. |
| F03 | PACKED, PARTIALLY_FULFILLED | PARTIALLY_FULFILLED | Dispatch part, dispatcher | Package ready, positive undispatched commitment remains after dispatch. Consume only covered quantity and record one issue keyed to dispatch line. |
| F04 | PACKED, PARTIALLY_FULFILLED | FULFILLED | Dispatch remainder, dispatcher | All remaining eligible lines dispatched. Reject duplicate coverage under a new request key using the package/line source key. |
| F05 | PICKING, PACKED, PARTIALLY_FULFILLED | ON_HOLD | Flag variance, warehouse lead | Preserve previously dispatched quantities. Revalidate outstanding commitment before resuming; reconcile missing/damaged pick with Inventory. |
| F06 | ON_HOLD | PICKING | Resume outstanding work, warehouse lead | Resolve variance and reacquire or validate eligible commitments. Preserve recorded dispatch history. |
| F07 | UNFULFILLED, PICKING, PACKED, ON_HOLD | CANCELLED | Cancel unshipped job, order workflow | No dispatched quantity for the job. Release affected commitment through Inventory as part of cancellation. |
| F08 | PARTIALLY_FULFILLED | PARTIALLY_FULFILLED | Cancel undelivered remainder, order workflow | Only undispatched segments are cancellable here. Close their work and retain completed history. Remaining dispatchable coverage still exists after cancellation. If coverage is complete against net ordered quantities, use F09. |
| F09 | PARTIALLY_FULFILLED | FULFILLED | Close outstanding work after remainder cancellation, order workflow | Net ordered quantity is fully covered by existing dispatches. Release only cancelled unshipped commitment. Create no new stock issue. |
| S01 | NOT_CREATED | LABEL_READY | Prepare shipment, dispatcher | Package and scope valid. A provider timeout becomes an exception without marking delivery. Manual mode records equivalent scoped shipment preparation. |
| S02 | LABEL_READY | PICKED_UP | Record handoff, dispatcher/carrier adapter | Verified handoff or authorized manual evidence, with corresponding committed dispatch. Inventory issues through fulfillment workflow, never from tracking alone. |
| S03 | PICKED_UP, FAILED_ATTEMPT | IN_TRANSIT | Record transit, scoped adapter | Valid verified observation for this shipment and carrier account. |
| S04 | IN_TRANSIT | OUT_FOR_DELIVERY | Record delivery route, scoped adapter | Verified forward milestone. Reconcile missing predecessors before applying a later observation. |
| S05 | IN_TRANSIT, OUT_FOR_DELIVERY | DELIVERED | Confirm delivery, scoped adapter/authorized operator | Verified delivery evidence with valid prior custody. COD collection/settlement stays independent. |
| S06 | OUT_FOR_DELIVERY | FAILED_ATTEMPT | Record failed attempt, scoped adapter | Leave shipment and COD open. Use retry or authorized RTO. |
| S07 | FAILED_ATTEMPT, IN_TRANSIT, PICKED_UP, OUT_FOR_DELIVERY | RTO_INITIATED | Start RTO, scoped operator/adapter | Verify failed delivery or authorized post-pickup reversal and preserve original dispatch movement. |
| S08 | RTO_INITIATED | RTO_RECEIVED | Record physical receipt, returns operator | Reconcile shipment evidence. Gate sellable stock on separate inspection/disposition, and reconcile any COD or carrier fee independently. |
| S09 | PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, FAILED_ATTEMPT, RTO_INITIATED | LOST | Confirm loss, authorized operator | Evidence and approval required. Send claims and financial corrections to reconciliation. |
| A01 | NEW | REQUESTED | Request return, scoped sales staff | Original line and requested quantity within eligible allowance. Record reason and policy version. |
| A02 | REQUESTED | AUTHORIZED | Approve return, scoped approver | Check policy, reason and cumulative prior authorizations under lock. |
| A03 | REQUESTED | REJECTED | Reject return, scoped approver | Record reason. No receipt, refund or disposition created. |
| A04 | AUTHORIZED | IN_TRANSIT | Record return movement, scoped operator | Track linked return and quantity. Authorized direct returns may be received without carrier transit. |
| A05 | AUTHORIZED, IN_TRANSIT | RECEIVED | Receive return, returns operator | Physical receipt, approved quantity, once per receipt source. No sellable increment. |
| A06 | RECEIVED | INSPECTED | Inspect, returns inspector | Record evidence, quantity and approved disposition. Inventory executes that disposition once through its interface. Damaged items cannot take the RESTOCK path. |
| A07 | INSPECTED | RESOLVED | Resolve, returns workflow | Required disposition and financial/exchange decisions recorded with evidence according to policy. Linked exchange uses a new order and separate net collection or credit. |
| A08 | RESOLVED | CLOSED | Close RMA, authorized operator | Check required owner outcomes and record close. Corrections use linked, authorized adjustments. |

### Payments and settlement

Payment attempt, verified collection, order allocation, refund, dispute and settlement have separate authoritative records under Payments. The order payment state is a projection of those facts and the current obligation. For this proposal, open disputes take precedence, then outstanding authorized refund workflow, applied refunds, then coverage. FAILED denotes an unsuccessful attempt with zero verified coverage and no active eligible attempt. Exact projection precedence and closure policy require review.

| ID | From | To | Command and actor | Guard, effect and recovery |
|---|---|---|---|---|
| P01 | UNPAID, PARTIALLY_PAID, FAILED | PARTIALLY_PAID | Allocate verified collection, Payments worker or scoped finance operator | Verify signed provider evidence or authorized manual verification, match tenant/account and money context, and reserve remaining collection capacity. Confirmed allocation covers a positive fraction of the obligation. |
| P02 | UNPAID, PARTIALLY_PAID, FAILED | PAID | Allocate verified balances, Payments owner | Verified allocation covers obligation, and excess remains unapplied unless separately allocated. A delayed failed attempt cannot regress this projection. |
| P03 | UNPAID, FAILED | FAILED | Record failed attempt, Payments owner | Only when verified coverage is zero and there is no active attempt. Unknown provider outcome is reconciled before trying a new capture. |
| P04 | PAID, PARTIALLY_PAID, PARTIALLY_REFUNDED | REFUND_PENDING | Request authorized refund, scoped finance operator | Reserve eligible refund amount, including other pending refund reservations, with original collection and adjustment link. Reconcile timeout by original provider operation reference. |
| P05 | REFUND_PENDING | PARTIALLY_REFUNDED | Verify partial refund, Payments owner | Verified payout or provider result, positive cumulative refund below the relevant captured amount. Append correction and consume the pending reservation once. |
| P06 | REFUND_PENDING | REFUNDED | Verify full refund, Payments owner | Verified full refund of eligible captured amount underlying this projection. |
| P07 | PAID, PARTIALLY_PAID, PARTIALLY_REFUNDED, REFUND_PENDING | DISPUTED | Record dispute, Payments owner | Verified authoritative dispute linked to collection. Preserve historical allocations and reconcile refunds/chargeback liabilities before resolving. |
| P08 | DISPUTED | DERIVED | Resolve dispute facts, Payments owner | Append verified liability adjustment or reversal. Recompute order payment projection from remaining facts after clearing the open dispute. Do not undo settlement or stock history. |
| P09 | REFUND_PENDING | DERIVED | Confirm failed refund, Payments owner | Release the failed pending reservation only on authoritative failure. Recompute the payment projection without discarding other pending or completed refunds. |
| M01 | UNRECONCILED | PARTIALLY_RECONCILED | Match settlement part, scoped finance verifier | Reconcile verified remittance, fees and adjustments against uncovered collection. Unmatched or contradictory evidence is held for review. |
| M02 | UNRECONCILED, PARTIALLY_RECONCILED | RECONCILED | Reconcile remaining settlement, scoped finance verifier | Independent remittance evidence fully reconciles the eligible total. Later corrections are appended as new settlement adjustments. Delivery, capture and refund alone cannot advance this record. |

### Purchase order and platform subscription

| ID | From | To | Command and actor | Guard, effect and recovery |
|---|---|---|---|---|
| B01 | DRAFT | APPROVED | Approve PO, scoped purchasing approver | Complete vendor, quantities and versioned money context. |
| B02 | APPROVED, PARTIALLY_RECEIVED | PARTIALLY_RECEIVED | Record partial receipt, receiving clerk | Match PO lines and source. Record gross received, accepted sellable, rejected and quarantine quantities. Inventory posts only each permitted disposition. Keep uncovered approved quantity open. |
| B03 | APPROVED, PARTIALLY_RECEIVED | RECEIVED | Record final receipt, receiving clerk | Approved quantity fully covered under acceptance policy. Open discrepancies are recorded and block receipt completion when they affect coverage. |
| B04 | PARTIALLY_RECEIVED, RECEIVED | CLOSED | Close PO, scoped purchasing manager | Fully received or approved short-close with cancelled remainder, discrepancy references and audit. Receipt and supplier liability history remain separate. |
| B05 | DRAFT, APPROVED | CANCELLED | Cancel PO, scoped purchasing manager | Zero receipt history. After receipt, use authorized short-close, purchase return or supplier correction. |
| U01 | NEW | TRIAL | Start configured trial, platform billing | Bind tenant to allowed effective-dated plan and trial policy. |
| U02 | TRIAL, PAST_DUE, GRACE, SUSPENDED | ACTIVE | Start or restore plan, platform billing | Verified platform payment or independently approved entitlement basis. Recovery from billing suspension requires reviewed policy. |
| U03 | TRIAL, ACTIVE | PAST_DUE | Record missed renewal, platform billing worker | Policy and unresolved platform invoice evidence. Timeout alone leaves an attempt pending reconciliation. |
| U04 | PAST_DUE | GRACE | Start grace, platform billing worker | Approved grace definition and notices. |
| U05 | PAST_DUE, GRACE | SUSPENDED | Suspend billing privileges, platform billing worker | Approved criteria met. Preserve protected history, export and eligible refund access. Tenant security suspension is a separate state. |
| U06 | TRIAL, ACTIVE, PAST_DUE, GRACE, SUSPENDED | CANCELLED | Cancel subscription, authorized tenant owner/platform operator | Apply effective date and plan policy. Preserve versioned history and required data access. Confirm a new subscription separately if eligible. |
| U07 | ACTIVE, GRACE | SAME | Record eligible order usage, platform billing worker | Receive approved qualifying fact and dedupe per tenant/order/type/period. Entitlement alone never establishes usage eligibility. |
| U08 | PAST_DUE, SUSPENDED, CANCELLED | SAME | Reconcile eligible prior-period usage and corrections, platform billing worker | Check approved policy and entitlement effective at the original qualifying fact. Current suspension or cancellation does not erase qualified historical usage. Append a versioned correction when permitted, preserve base facts and keep merchant money separate. |

### Sources of truth and event boundaries

| Owner | Authoritative records | Candidate facts or consumers |
|---|---|---|
| Inventory | Reservations, commitments, stock movements and transactionally maintained balances | inventory.reserved, inventory.released, inventory.movement_posted; consumes authorized owner commands for allocations and disposition |
| Orders | Order/line history, snapshots, cancellation adjustments and allocation references | order.confirmed and order.cancelled; reads payment and fulfillment projections with their freshness |
| Fulfillment and Shipment | Job/line dispatch, package coverage, shipment and tracking history, each by its own owner | fulfillment.dispatched, fulfillment.delivered and shipment.rto; recipient scope revalidated before any effect |
| Returns | RMA, approved quantity, physical receipts and inspection evidence | return.authorized, return.received and return.resolved; Payments facts may inform the financial resolution |
| Payments | Attempts, verified collections, allocations, refunds, settlements and disputes | collection.verified, payment.refunded, payment.chargeback and settlement.reconciled; each fact carries version and operation evidence reference |
| Procurement | PO line approvals, immutable receipt snapshots and discrepancy records | Receipt facts maintain purchasing history; only Inventory posts stock through its command interface |
| Subscription Billing | Subscription version, plan, usage, platform invoices and payments | subscription.changed and usage.recorded; consumes approved fulfillment facts without merchant collection access |

## 4. Persistence and transactional invariants

Physical schema, indexes, migration, backfill and rollback implementation are **NOT_APPLICABLE** in M00.03. Master §§16–17 guide later schema work. Use tenant-consistent foreign keys and indexed position lookup by tenant/location/variant. Order commands lock/version the affected scoped lines, then acquire stock positions in a deterministic order; expiry and conversion share the reservation/position guard. Future integration tests must verify lock ordering across owner interfaces and actual isolation. Use decimal quantity and unit rules, integer currency minor units with configured exponent, versioned policy snapshots and append-only accounting effects.

- Sellable on-hand minus active holds minus allocated commitments is nonnegative. Conversion replaces hold quantity with commitment. Cancellation only releases remaining commitments. Dispatch issues a committed unit once and atomically preserves availability.
- Dispatched plus cancelled quantity cannot exceed ordered quantity. Cumulative active authorizations and previously resolved returns cannot exceed originally eligible shipment quantity. Rejected or independently released authorizations free only the unused allowance. Receipt cannot exceed authorization and disposition cannot exceed inspected receipt.
- Verified allocated amount cannot exceed collection capacity. Pending and verified refunds together cannot exceed the eligible balance. Settlement reconciles distinct evidence for remitted amounts, fees and adjustments. Disputes and refunds append facts.
- Gross PO receipt equals the sum of mutually exclusive sellable accepted, rejected and quarantined buckets for that receipt. Approval/cancellation governs remaining coverage. Subscription use is a one-time business effect per approved order/type/period with append-only reversal rules.

## 5. Command and event contracts

REST paths, OpenAPI generation and pagination changes are **NOT_APPLICABLE** in M00.03. The [internal examples](PLANNING_EVIDENCE.md#candidate-contracts) carry the expected version, operation reference and typed input. Server-resolved scope and current permissions are prerequisites.

A legitimate exact retry under the same tenant, principal, command and idempotency key returns the original result after scope validation. Changed request data yields an idempotency conflict. A new key still collides on any already-applied domain source operation. A stale version yields a conflict and fresh read. Unavailable stock, invalid transition, scope mismatch and evidence pending are distinct outcomes. A side effect uses the same stable reference when retried.

Owner outbox messages use the master §18.4 envelope and monotonic aggregate versions. Deduplicate the inbox by consumer and event ID. For streams whose consecutive versions matter, buffer/reconcile gaps against authoritative history before applying dependent events. Never use aggregate version as a global clock or infer provider sequence from arrival order. Late contradictory provider facts are reconciled against verified history, never treated as automatic rewinds. Record dedupe only once handling or durable deferral is committed.

## 6. Security and privacy

| Actor | Scope and restricted actions |
|---|---|
| Sales and cancellation approver | Verified tenant/branch and order/line controls; approval for restricted cancellation/discount; immutable financial fields denied. |
| Warehouse and receiving staff | Assigned branch/location and allowed package, SKU or PO; no financial verification, promotion to a sibling branch, or blind claimed stock writes. |
| Returns inspector and finance verifier | Separate inspection/disposition and payout authority; maker-checker when required; private evidence reference scoped and redacted. |
| Scheduler/adapter | Scoped service identity and provider account match; verify signatures/replay controls and reauthorize authoritative changes; constrain mass assignment of state or tenant. |
| Platform operator | Billing-specific audited permission; no merchant collection, customer PII or workforce access. |

Enforce object and action checks before idempotency replay or disclosure, including tenant-crossing IDs and branch scope. Later runtime slices own CSRF protection, scoped credentials, private encrypted evidence access and rate limits. Planning examples use opaque IDs.

## 7. Scale, consistency and recovery

Contention centers on the last stock position, dispatch/cancel racing the same line, refunds on the same eligible balance and bursts of provider callbacks. Normal work spans many positions and independent tenants. Narrow locks and stable index keys keep authoritative operations bounded. Replayed events and parallel workers retry through the same source guard. Use bounded backoff and queue fairness; terminal evidence gaps or conflicting events are visible in restricted reconciliation or dead-letter queues. Operators re-drive with original identifiers or submit a separate audited compensation. Provider I/O stays outside locked transactions. G-11 governs workload assumptions, timeout budgets, capacity and measured targets.

## 8. Verification plan

Run the [model verifier](VERIFICATION.md#reproduce-the-checks) against this catalog and the [fictional fixtures](PLANNING_EVIDENCE.md#model-fixtures). Test last-unit races, partial cancellation, return inspection, separate settlement, conflicting replay, delayed provider state, dispatch versus cancellation, partial PO, RTO, disputes and subscription usage. The evidence includes the impossible-state checklist. Runtime contract, PostgreSQL, concurrency, tenant-isolation, accessible UI, fault and load verification belong to the owning implementation slices.

## 9. Operations and UI impact

**NOT_APPLICABLE** to live rollout, UI delivery, disaster recovery testing and observed costs. Future metrics cover stock conflicts, duplicate side effects prevented, event gaps, reconciliation backlog and stale views. Correlate scoped tenant, actor, request, version, operation and event identifiers in redacted logs. Authorized reviewers can inspect evidence and retry using original identifiers; the workflow never offers direct edits to stock or money history.

## 10. Decision log and approval

| State | Decision and owner |
|---|---|
| CONFIRMED | Master ADR-004/005/012/013/017 prescribe tenant/branch checks, atomic holds, separate state machines, distinct money ledgers and policy-based metering. |
| PROPOSED | Architecture reviews the transition catalog, shared transaction seam, payment projection precedence, PO coverage and event reconciliation. QA reviews the modeled invariants and fixture coverage. |
| BLOCKED | Acceptance requires human review of the M00.02 ownership proposal, the M00.03 model and signed impossible-state checklist. RG0 needs Founder/Product and Architecture evidence. |
| BLOCKED | Product owns G-04 hold and return policies. Product, Finance and Security own G-05 carrier/payment evidence. Founder and Finance own G-07 billing and metering rules, with G-14 suspension/export policy owned by Founder and Legal. G-02/G-15/G-17 gate capability and jurisdiction. G-16 external validation remains PENDING. |
