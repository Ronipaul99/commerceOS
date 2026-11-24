# M00.03 planning evidence

**Evidence class** HYPOTHESIS. All business inputs, actors and identifiers are fictional. Product and Architecture approval, QA checklist signature, and external validation remain pending. The [design](DESIGN.md) defines the proposed transition IDs.

## Positive mutation trace

Amounts are synthetic minor units in one configured money context. Case C02 uses different SKUs for the retained and cancelled lines so stock arithmetic and order adjustments can be checked independently.

| Step | Transition and write owner | Model assertion |
|---|---|---|
| 1 | R01, Inventory reserves the last SKU-X in Tenant A. A second agent competes for that unit. | Exactly one request succeeds in either serialization order. Tenant B has a separate position despite the same SKU alias. |
| 2 | O02/O03 and R02, Orders confirms the two-line order and Inventory converts holds for SKU-X and SKU-Y. | Both active holds are consumed and replaced with commitments once. A delayed R04 leaves the converted hold and commitment intact. |
| 3 | O05, Orders cancels only the unshipped SKU-Y line. Inventory releases its commitment. | Order stays CONFIRMED with a PARTIALLY_CANCELLED line condition. Immutable confirmed total remains 10000. Authorized 4000 adjustment leaves 6000 due. |
| 4 | P02, Payments records verified collection and allocation for 6000. F01/F02/F04, warehouse prepares and dispatches SKU-X. | Capture and dispatch occur independently. Inventory issues the retained SKU once. Settlement stays unreconciled. |
| 5 | S01/S02/S03/S04/S05, Shipment records verified handoff, transit and delivery. | Only the scoped shipment becomes DELIVERED. Neither delivery nor capture settles merchant money or closes the order. |
| 6 | A01/A02/A05/A06, Returns authorizes, receives and inspects SKU-X as damaged. Inventory posts quarantine once. | Receipt alone has no sellable effect. Inspected quantity is one and sellable stock remains zero. Order payment stays PAID and settlement remains UNRECONCILED. |
| 7 | M02, Payments reconciles independent remittance of 5900 plus 100 fee against 6000. | Settlement becomes RECONCILED. Order and RMA states stay unchanged. |
| 8 | P04/P05 then A07/A08, Payments verifies a 2000 partial refund and Returns separately resolves and closes the RMA. | 4000 remains eligible in this fixture. Original settlement fact and confirmed order snapshot remain immutable. Refund and RMA close do not create stock or a payout adjustment. |

## Candidate contracts

Internal candidate command fields are illustrative and have no routable endpoint in M00.03. In JSON below, scope and principal are bound by the server. Offset-free timestamps are rejected. Settlement event, refund event, and stock disposition each carry separate operation and evidence references.

~~~json
{
  "command": "Orders.cancelPart",
  "context": {"tenantId": "A", "branchId": "A1", "principalRef": "MANAGER-A"},
  "input": {"orderRef": "ORDER-01", "lineRef": "LINE-Y", "quantity": "1", "expectedVersion": 3, "reasonCode": "CUSTOMER_REQUEST", "operationRef": "CANCEL-Y"}
}
~~~

A request specifying another tenant's line is denied without returning the stored result. A stale request conflicts. A new request key cannot repeat a package or finance posting already applied to the same source. Distinct denial, conflict, evidence pending and exact retry outcomes are represented in the [verification](VERIFICATION.md).

## Impossible-state checklist

| Check | Impossible state challenged | Deterministic expected result |
|---|---|---|
| C02 | Two holds for one unit, late expiry after conversion, restock from receipt or refund, settlement from delivery/capture, order snapshot overwrite | One hold and one issue, no expiry release of the commitment, no damaged sellable increase, separate verified settlement and immutable snapshot |
| C03 | Same key with altered input, different key repeating dispatch, reversed versions or late failed callback after verified capture | Exact retry returns original result, altered input conflicts, stock/money effect remains single, partial event stream reconciled, late failure cannot downgrade PAID |
| C04 | Cancel and dispatch both claiming the same unit, or expiry and conversion both winning | One competing transition wins in either ordering; stale request fails and the loser remains ineligible on revalidation |
| C05 | Partial/damaged PO receipt closes early or a repeated receipt adds stock again | Keep the approved balance open until covered or an authorized short-close executes; append each receipt once |
| C06 | Cancellation after pickup silently deletes stock issue, RTO receipt credits sellable stock, unverified dispute downgrades payment | Route pickup reversal through RTO; keep the issue; use inspection for disposition and verified finance evidence for a dispute |
| C07 | Subscription usage posts twice for one eligible commercial order, or subscription suspension changes merchant state | One usage row per period, eligible prior-period replay uses the same key, and the merchant snapshot stays unchanged |
| C08 | Cross-tenant reference, ungranted branch action, or unauthorized staff posting finance evidence | Deny before mutation or replay; same aliases remain usable under independent authorized scope |

**Review record** Product/Architecture and QA decision, date, signed checklist and evidence reference are pending. The test results support review of the design. [M00.02 review state](../M00.02/VERIFICATION.md)

## Model fixtures

The fixture quantities are deliberately small. Enumerated serializations model the result of successfully serializing conflicting operations. The runtime isolation and locking strategy still needs PostgreSQL verification.

~~~json
{
  "provenance": "HYPOTHESIS",
  "external_validation": "PENDING",
  "scope_a": ["A", "A1"],
  "scope_b": ["B", "B1"],
  "ungranted_branch_b": ["B", "B2"],
  "order": {"id": "ORDER-01", "sku_x": "SKU-X", "sku_y": "SKU-Y", "stock_x": "1", "stock_y": "1", "amount_x": 6000, "amount_y": 4000},
  "money": {"captured": 6000, "remitted": 5900, "fee": 100, "refund": 2000},
  "po": {"ordered": "10", "receipts": [["GRN-01", "6", "5", "0", "1"], ["GRN-02", "4", "4", "0", "0"]], "short_close": "1"},
  "usage": {"period": "PERIOD-01", "packages": ["PKG-01", "PKG-02", "PKG-01"]}
}
~~~
