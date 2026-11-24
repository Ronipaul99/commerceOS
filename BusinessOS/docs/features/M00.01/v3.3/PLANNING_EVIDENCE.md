# M00.01 v3.3 planning evidence

**Evidence type** HYPOTHESIS. **External customer validation** PENDING. This file records only fictional examples, expected outcomes, and decisions for future review. It accompanies the [v3.3 design](DESIGN.md) and [master scenarios](../../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#24-end-to-end-reference-acceptance-scenarios). The prior [workspace approval](../APPROVAL.md) identifies a different reviewed design revision.

## Synthetic archetypes

| Fixture | Business configuration under review | Actors and boundary probes |
|---|---|---|
| Tenant A | Small stock-led operation. One branch `A1`, one stock location, manual sales and POS. A synthetic manual social session can be selected for the last-unit exercise. | Owner, cashier, sales agent, receiver, and finance reviewer. A peer with no authorized workspace or branch scope cannot inspect the setup draft or authorize a refund. |
| Tenant B | Stock-led operation with branches `B1` and `B2`, separate locations, and manual/social channels. Uses the same SKU alias as A for an isolation check. | Owner, agent assigned to `B1`, fulfilment operator, and finance reviewer. The B1 agent has no B2 or Tenant A access. |

Each case uses independent opening state. Money examples use synthetic integer minor-unit amounts in a single test money context. Currency code, exponent, tax, commercial fees, and jurisdiction are not selected by these fixtures. Stock counts are whole units in these examples.

## Actor and screen matrix

| Actor | Hypothesized allowed actions | UI review surface and denied behavior |
|---|---|---|
| Owner or assigned manager | Review setup, validate scoped imports, configure an enabled branch/channel, and review permitted operational exceptions. | Setup, settings, import preview, approvals. No cross-tenant grants or hidden privilege changes. |
| Sales agent | Capture enquiry, quote, or manual booking in an authorized branch. Confirm and attribute sales within their granted workflow. | Enquiry, quote, booking conflict, order details, and permitted actions. Cannot self-approve an off-policy override. |
| Cashier | Operate an assigned register, enter permitted tenders, count close, and submit a variance. | POS cart and tender, receipt, close history, variance review. No unauthorized refund, adjustment, or access to another branch’s drawer. |
| Purchaser, receiver, or fulfilment operator | Record purchase/receipt or pick/pack/dispatch within assigned scope. Require inspection for uncertain or damaged stock. | PO, partial receipt, disposition, fulfilment, shipment, return inspection. No direct finance settlement controls. |
| Finance or designated approver | Verify evidence and allocated collections, review discrepancies, authorize financial outcomes within delegated scope. | Collections, settlement, payables, reconciliation, refund or credit review. Keep supporting evidence access restricted. |

## Scenario and exception matrix

| Case | Hypothesis and expected logical outcome | Future assessment |
|---|---|---|
| SC-01 | Owner resumes an authorized setup draft. Preview 100 opening data rows with 2 invalid rows. Commit 98 only after explicit valid-only acceptance. A rejected row neither creates an item nor posts stock. | Later demonstrate resume, import validation, setup gate, test order, and role assignment in M02.01–M02.09. Preserve tenant-separated fixtures and policy-gated statutory output. |
| SC-02 | Two sellers request the last unit from the same location. Exactly one hold wins. The winning booking converts using the same unit. With total 120000 and advance 45000, 75000 remains due. | Later verify contention, conversion, partial collection, and expiry after conversion in M03.06, M04.09–M04.10, M05.03, and M06.04–M06.06. |
| SC-03 | A manual order requests two one-unit lines. One item is unavailable until receiving occurs. Block confirmation under this fixture policy. After stock arrives, dispatch both lines in separate packages. The first dispatch leaves one line outstanding and replay creates no extra stock issue. | Later verify quote → order → fulfilment, attribution, and separate shipment state in M04.07–M04.08 and M05.01–M05.07/M05.12. |
| SC-04 | Open a drawer at 100000. Final sale amount 175000 is split into 75000 cash plus 100000 verified non-cash. Apply an approved test adjustment where configured, then use the final sale amount shown. Cash expense 10000 and approved cash refund 25000 yield expected drawer 140000. Count 139000, giving a shortage of 1000. | Later verify mixed tender, approved discount/void, evidence, variance review, and branch isolation in M06.01–M06.04 and M06.07–M06.11. |
| SC-05 | Order 10, receive 6 with 1 damaged, then receive 4 intact. Cumulative receipt is 10, sellable increase is 9, and quarantine is 1. Review the supplier discrepancy. A test payable of 200000 with a verified partial allocation of 60000 leaves 140000 due. Replay must not post a second supplier payment. | Later verify partial receipt, stock disposition, the payable, and explicit closure policy in M03.05/M03.07 and M04.01–M04.04. An ordered quantity received does not by itself settle the supplier bill. |
| SC-06 | Inspect a returned damaged line. Sellable stock increases by zero. An eligible 120000 credit applied to a linked 150000 exchange leaves 30000 due. A separate RTO shipment with 90000 COD and no verified remittance has zero settled. | Later verify eligibility, inspection, linked exchange, refund safeguards, and independent RTO settlement in M05.09–M05.11 and M06.05–M06.07. |

**Scope denial examples.** Reject Tenant A’s attempt to read, reserve, collect, or refund against Tenant B’s records. Reject the B1 agent’s attempt to change B2 stock or cash. Each later test must check protected state and audit data as well as the denial. These are planned checks, not runtime results.

### Structured fixture inputs

```json
{
  "provenance": "HYPOTHESIS",
  "external_customer_validation": "PENDING",
  "design_approval": "PENDING",
  "tenants": [
    {"id": "A", "branches": ["A1"], "sku_alias": "SKU-01"},
    {"id": "B", "branches": ["B1", "B2"], "sku_alias": "SKU-01"}
  ],
  "cases": {
    "SC-01": {"preview_rows": 100, "rejected_rows": 2, "valid_only_rows": 98},
    "SC-02": {"sellable_before": 1, "hold_requests": 2, "successful_holds": 1, "total": 120000, "advance": 45000, "remaining": 75000},
    "SC-03": {"requested_lines": 2, "missing_lines_initially": 1, "first_dispatch_lines": 1, "lines_remaining_after_first_dispatch": 1, "extra_issues_after_replay": 0},
    "SC-04": {"opening_cash": 100000, "final_sale_total": 175000, "cash": 75000, "verified_non_cash": 100000, "cash_expense": 10000, "cash_refund": 25000, "expected_drawer": 140000, "counted_drawer": 139000, "variance": -1000},
    "SC-05": {"ordered": 10, "first_received": 6, "damaged": 1, "later_received": 4, "received_total": 10, "sellable_increase": 9, "quarantine": 1, "payable": 200000, "verified_payment": 60000, "balance_due": 140000},
    "SC-06": {"sellable_increase": 0, "eligible_credit": 120000, "replacement_total": 150000, "additional_due": 30000, "failed_delivery_cod": 90000, "verified_remittance": 0, "cod_settled": 0}
  }
}
```

## Future validation backlog

| Ref | Question and evidence to seek | Responsible review and gate |
|---|---|---|
| VB-01 | How do organizations configure branch/location ownership and import exceptions? Collect consented role and data-type examples when a pilot exists. | Product / Architecture · G-15/G-16 |
| VB-02 | Which channels share inventory, how are holds authorized, and how do operators recover from conflicting requests? | Product / Operations · G-04/G-16 |
| VB-03 | What evidence distinguishes tender, allocation, drawer cash, and settlement in each approved market? | Product / Finance / Security · G-05/G-17 |
| VB-04 | How do receiving teams classify defects and reconcile shipment or supplier billing differences? | Product / Finance · G-03/G-16 |
| VB-05 | Which return, exchange, and RTO rules apply to the intended capabilities? Review proposed policies before using live defaults. | Product / Domain / Legal as applicable · G-02/G-04/G-17 |
| VB-06 | What accessibility and exception screens do participants need to complete the relevant flows? Establish consent, recruiting, and success criteria before external validation. | Product / Research / QA · G-16 |

**Review record.** Product reviewer, Architecture reviewer, date, decision, unresolved scope, and evidence references are pending. Additional decisions on real operations, customer validation, and RG0 require their own evidence. This packet records no named merchant, interview, or market-fit claim.
