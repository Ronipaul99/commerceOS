# M00.02 planning evidence

**Evidence class** HYPOTHESIS. Synthetic Tenant A and Tenant B are independent. This packet documents the proposed owner boundaries from the [design](DESIGN.md). It does not attest to runtime implementation or external validation. [M00.02 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M00/M00.02.md) · [Master data model](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#17-data-model-and-schema-migration-guidance)

## Product to refund mutation trace

Each row models an expected authorized operation. All sample quantities are whole units. Amounts are fictional integer minor units in one test money context, with no real jurisdiction, fee, threshold, or tax rule inferred.

| Step | Command and business change | Authoritative write owner | Expected boundary |
|---|---|---|---|
| 1 | Create Tenant A product and variant `SKU-01` at zero stock. | Catalog | Item creation alone creates no movement. Tenant B can independently use the same SKU alias. |
| 2 | Record an authorized one-unit opening movement at `A1/L1`. | Inventory | On-hand = 1, reserved = 0, available = 1. |
| 3 | Two scoped attempts request the last unit. Reserve one eligible request. | Inventory | One hold wins. On-hand stays 1 and available drops to 0. |
| 4 | Confirm A's order and convert its hold to one inventory commitment. | Orders confirms the order and its reference. Inventory converts the hold. | The hold is counted once. An expiry retry may not release a consumed hold or the commitment. |
| 5 | Record and allocate a verified synthetic collection of 120000. | Payments | Order can reflect a verified allocation in its own projection. Settlement stays independently recorded. |
| 6 | Dispatch the packed line and issue its committed unit. | Fulfillment records dispatch, Shipment owns its tracking record, and Inventory posts the issue. | On-hand becomes 0. Replaying the same dispatch does not create another stock issue. |
| 7 | After delivery, authorize one eligible return line and inspect it as damaged. | Returns | Return disposition authorizes quarantine. Inventory owns any quarantine posting. Sellable stock stays 0. |
| 8 | Execute the authorized partial refund. Record a verified result of 30000. | Payments | Refund is within the synthetic eligible captured amount. The remaining refundable amount is 90000. No Inventory or immutable order snapshot write occurs from the refund. |

For an independently authorized, inspected sellable return, the workflow may instead call Inventory to post an accepted restock linked to that return line. Payment outcome is insufficient authority. This trace reuses the fictional context of the [M00.01 cases](../M00.01/v3.3/PLANNING_EVIDENCE.md#scenario-and-exception-matrix).

## Candidate interface and event payloads

Inputs below illustrate owner boundaries. They are internal review examples, not accepted public schemas.

```json
{
  "command": "Inventory.reserve",
  "context": {"tenantId": "A", "branchId": "A1", "actorRef": "SALES-A"},
  "input": {"locationRef": "L1", "variantRef": "VAR-A", "quantity": "1", "sourceRef": "BOOKING-A", "operationRef": "HOLD-A"}
}
```

The command context is bound by the server from a verified principal. A request from Tenant A targeting a variant or location owned by Tenant B is rejected before any mutation.

```json
{
  "eventId": "EVT-REFUND-A",
  "eventType": "payment.refunded",
  "schemaVersion": 1,
  "tenantId": "A",
  "aggregateType": "refund",
  "aggregateId": "REFUND-A",
  "aggregateVersion": 1,
  "occurredAt": "2026-11-24T00:00:00Z",
  "correlationId": "CASE-A",
  "causationId": "VERIFIED-EVIDENCE-A",
  "payload": {"branchId": "A1", "orderRef": "ORDER-A", "returnRef": "RMA-A", "amountMinor": "30000", "moneyContextRef": "TEST-MONEY-A"}
}
```

This hypothetical event projects a verified Payments result. The timestamp is fixture data. No real provider, account, currency selection, or statutory value is implied. A consumer uses its own scope and dedupe policy. Any Returns follow-up links the monetary outcome and cannot treat the event as a stock command.

## Structured review fixtures

```json
{
  "provenance": "HYPOTHESIS",
  "external_validation": "PENDING",
  "owners": {
    "grants": "AccessControl",
    "products": "Catalog",
    "variants": "Catalog",
    "price_lists": "Pricing",
    "prices": "Pricing",
    "stock_movements": "Inventory",
    "stock_balances": "Inventory",
    "reservations": "Inventory",
    "quarantine_lots": "Inventory",
    "orders": "Orders",
    "order_lines": "Orders",
    "order_allocations": "Orders",
    "fulfillment_jobs": "Fulfillment",
    "shipments": "Shipment",
    "return_authorizations": "Returns",
    "inspection_results": "Returns",
    "collections": "Payments",
    "payment_allocations": "Payments",
    "refunds": "Payments",
    "settlements": "Payments",
    "usage_events": "SubscriptionBilling",
    "subscriptions": "SubscriptionBilling",
    "platform_payments": "SubscriptionBilling",
    "employees": "HR",
    "payroll_runs": "HR"
  },
  "dependencies": [
    ["CommerceWorkflow", "AccessControl"],
    ["CommerceWorkflow", "Catalog"],
    ["CommerceWorkflow", "Pricing"],
    ["CommerceWorkflow", "Inventory"],
    ["CommerceWorkflow", "Orders"],
    ["CommerceWorkflow", "Fulfillment"],
    ["CommerceWorkflow", "Shipment"],
    ["CommerceWorkflow", "Returns"],
    ["CommerceWorkflow", "Payments"],
    ["AccessControl", "Contracts"],
    ["Catalog", "Contracts"],
    ["Pricing", "Contracts"],
    ["Inventory", "Contracts"],
    ["Orders", "Contracts"],
    ["Fulfillment", "Contracts"],
    ["Shipment", "Contracts"],
    ["Returns", "Contracts"],
    ["Payments", "Contracts"],
    ["SubscriptionBilling", "Contracts"],
    ["HR", "Contracts"]
  ],
  "primary_writes": [
    ["Catalog", "products"],
    ["Catalog", "variants"],
    ["Inventory", "stock_movements"],
    ["Inventory", "reservations"],
    ["Orders", "orders"],
    ["Orders", "order_allocations"],
    ["Inventory", "reservations"],
    ["Payments", "collections"],
    ["Payments", "payment_allocations"],
    ["Fulfillment", "fulfillment_jobs"],
    ["Shipment", "shipments"],
    ["Inventory", "stock_movements"],
    ["Returns", "return_authorizations"],
    ["Returns", "inspection_results"],
    ["Inventory", "quarantine_lots"],
    ["Payments", "refunds"]
  ],
  "forbidden_writes": [
    ["Payments", "stock_movements"],
    ["Returns", "stock_balances"],
    ["SubscriptionBilling", "collections"],
    ["Orders", "payroll_runs"]
  ],
  "cycle_edge": ["Inventory", "CommerceWorkflow"],
  "tenant_a": {"tenant": "A", "branch": "A1", "sku": "SKU-01"},
  "tenant_b": {"tenant": "B", "branch": "B1", "sku": "SKU-01"},
  "second_branch": {"tenant": "B", "branch": "B2", "sku": "SKU-01"},
  "stock": {
    "opening": 1,
    "held": 1,
    "commitment": 1,
    "first_issue": 1,
    "replayed_issue": 0,
    "expiry_after_conversion_release": 0,
    "damaged_quarantine": 1,
    "damaged_sellable_increment": 0,
    "sellable_after_refund": 0
  },
  "money": {"captured": 120000, "refund": 30000, "remaining_refundable": 90000},
  "platform_usage_fixture": {"order_ref": "ORDER-A", "qualifying_deliveries": 2, "distinct_order_usage": 1}
}
```

The platform usage fixture assumes an eligible synthetic order. The two delivery observations refer to the same order and billing period. Approval of a qualifying event, billable amount, exclusions, and reversal policy belongs to G-07. Counting usage must not mutate merchant collections or charge twice.

## Adversarial outcomes for later runtime verification

| Case | Expected boundary |
|---|---|
| Refund handler attempts to post stock directly. | Reject Payments → Inventory private-table write. The approved return/disposition command is the only route to an eligible Inventory effect. |
| Dependency edge from Inventory to the workflow that imports it. | Reject the resulting cycle. Supply a contract or an outbox event for the workflow to consume. |
| Expiry races with conversion and dispatch is replayed. | At most one commitment and one stock issue for the source operation. Expiry cannot release the converted unit. |
| Same fulfilled order appears twice or its qualification is disputed. | The same eligible order contributes one usage row under the approved policy. Billing handles correction in its own journal. Merchant money is unchanged. |
| A references B, or B1's actor references B2 without a grant. | Deny each call without mutating the other tenant or branch. Redacted evidence remains scoped to the proper authority. |

## Proposed ADR register

| Record | Status and review required |
|---|---|
| M00.02 proposal for ADR-003/012/013 | PROPOSED. Keep a single modular monolith and use owner interfaces with an acyclic composition layer. Coordinate single-database operations when required. Use owner outbox facts for asynchronous payment, settlement, and billing follow-up. |
| Alternative considered | Direct cross-table edits shorten call paths but undermine invariant ownership and audit. Synchronous callbacks between domains can force cycles. Owner interfaces and explicit events keep those boundaries reviewable, with a separate integration burden for retries and projections. |
| Existing decisions | ADR-003/004/005/008/012/013/017 continue as named in the master. This proposal cites them without amending the master or prior ADR approvals. |
| Review record | Architecture reviewer, date, decision, conditions, and evidence link are pending. Review the ownership map, permitted edges, atomicity seam, and integration order before approval. M00.01 and RG0 reviews remain separate. |
