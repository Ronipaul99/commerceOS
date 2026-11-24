# M00.06 Test suite map

**State** PROPOSED. Canonical cases follow master §24 with synthetic actors; status for runtime execution is NOT_RUN. Cases that depend on absent optional capabilities stay BLOCKED for the positive path, with a separately planned denial. None of the reviewers below are assigned individuals or signatories. [Design](DESIGN.md) · [Canonical scenarios](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#24-end-to-end-reference-acceptance-scenarios)

## Suite layers

| Suite | Environment and examples | Evidence owner |
|---|---|---|
| UNIT | Deterministic clock and policies, decimal stock and minor units, stock/order transitions, payment evidence, return eligibility, metering, automation and gated payroll | Domain Engineering with QA review |
| PG | Fresh migrated PostgreSQL for both tenants, transaction/lock contention, composite FK and branch scope, unique keys, audit and outbox/inbox, import/receipt/invoice/ledger consistency | Data Engineering and QA |
| CONTRACT | Internal typed REST and events, field allowlists, scoped filtering, concurrency version and idempotency, documented errors, verified provider mock inputs and backward compatibility | API Engineering and QA |
| E2E | Synthetic user/role journey through UI, API and worker with actionable accessible states and low-bandwidth safe retries | QA with Product and UX/Accessibility |
| SECURITY | Same-ID object/field/branch/tenant isolation, role and support boundaries, private files and exports, event authenticity, controlled egress and revocation | Security and QA |
| FAULT | Queue and provider faults, delayed and duplicated events, reconciliation and scoped authorized retry | Platform, Integrations and relevant domain |
| LOAD | Recorded fixture/mix and environment, contention, warm/cold cache, fairness, burst reconciliation and resource metrics | Platform and QA |
| RESTORE | Isolated restore of consistent PostgreSQL and object snapshots, ledger checks, access and measured RPO/RTO | Data Recovery and Security |

## Canonical scenarios

Run each enabled scenario in Tenant A, check Tenant B isolation and log both outcomes. For every case try a scoped B record under Tenant A credentials, with no unauthorized read, write, export, journal change, or disclosure. Use selected B reruns to cover two branches and shared SKU aliases. A gate column applies in addition to feature readiness and RG1 isolation/Security evidence where relevant.

| Case | Synthetic scenario and observable acceptance | Suites | Responsible reviewer | Gates and scope |
|---|---|---|---|---|
| SC-01 | Resume activation after relogin, preview 100 opening rows with two invalid, explicitly accept 98, verify no posting from invalid rows, invite cashier and complete a test sale after required policy checks. | UNIT, PG, CONTRACT, E2E, SECURITY | Product onboarding and QA | RG1/RG3; G-01 identity; G-06/G-17 for tax/locale paths |
| SC-02 | Two sellers contend for one unit, one hold wins, conversion uses the same commitment, late expiry does not release it, and partial advance leaves the correct due with separate settlement. Repeat with B1 agent and deny B2 mutation. | UNIT, PG, E2E, FAULT, LOAD | Inventory and Sales QA | RG2/RG3; G-04 and G-05 |
| SC-03 | Manual enquiry to quote/order, backorder denied until stock exists, split pick/pack/dispatch with independent shipment states, valid attribution and one issue per dispatch despite replay. | UNIT, PG, CONTRACT, E2E, FAULT | Orders and Fulfillment QA | RG2/RG3; G-04 and G-05 when applicable |
| SC-04 | POS opening float, synthetic split tender, approved void/discount/expense, verified refund and manager variance; cash, receipts, invoice evidence and branch report reconcile. | UNIT, PG, CONTRACT, E2E, SECURITY | POS Operations and Finance QA | RG2/RG3; G-05 and G-06 where applicable |
| SC-05 | PO for ten, receipt of six with one damaged then four later; nine sellable, one quarantined, supplier variance visible and partial payable payment posts once. | UNIT, PG, E2E, FAULT | Procurement and Inventory QA | RG2/RG3; G-03 for valuation |
| SC-06 | Inspect a damaged return with no sellable increase, reconcile linked exchange and credit/refund; a distinct failed shipment enters RTO without inferred COD settlement. | UNIT, PG, CONTRACT, E2E, FAULT | Returns, Fulfillment and Finance QA | RG2/RG3; G-04/G-05 |
| SC-07 | Duplicate capture and delayed failure leave one verified collection, pending refund retry does not duplicate, and provider discrepancy opens reconciliation rather than changing authority. | UNIT, PG, CONTRACT, FAULT, SECURITY | Payments and Security QA | RG2; G-05 with controlled provider fixtures |
| SC-08 | One task per repeated workflow event, synthetic muted window and delayed task respect fixture policy, manager resolves task, unauthorized refund denied and notification outage leaves Orders unchanged. | UNIT, PG, E2E, FAULT, SECURITY | Automation and Operations QA | RG3; external notifications G-08 |
| SC-09 | Hypothetical 50-order allowance, separate parcels and replay count one order once, the next unique qualifying order applies one hypothetical charge, and policy-approved late corrections remain traceable. | UNIT, PG, E2E, FAULT | SaaS Billing and Finance QA | RG4; G-07/G-14, with no paid tier claims |
| SC-10 | Validate optional partner integration using mock server scopes; publishable read projection, idempotent submit, forged paid field denial, price conflict, signed events and effective revocation. | CONTRACT, E2E, SECURITY, FAULT | Integrations and Security QA | P1 only if approved, G-09/RG7. Native storefront stays deferred. |
| SC-11 | Cashier sees own sales without salary access; scoped manager corrects attendance; separate payroll approver finalizes immutable run with corrective run and protected payslip. | UNIT, PG, E2E, SECURITY | Workforce, Payroll/Legal and Security QA | Optional G-10/G-12/G-17 and RG6; positive path blocked until enabled |
| SC-12 | Restore sandbox DB and object records at a consistent checkpoint; compare stock, documents, money and scoped files, revoke key, recover queued webhook once and record observed recovery intervals. | PG, SECURITY, FAULT, RESTORE | Platform Recovery and Security QA | RG3/RG5; G-11/G-12; no production restore claim |

### UAT run evidence

Use the seed revision, tenant/branch, actor grant, feature/policy version, preconditions, steps, expected and observed results, scoped before/after effects, runner and reviewed artifacts. Declare NOT_RUN, BLOCKED or FAIL with reason, and link real successful runs before declaring PASS. Capture screenshot/accessibility evidence when a rendered workflow exists. Preserve an independent internal reviewer for each applicable release gate. Internal synthetic evidence leaves G-16 external validation pending.

## Operational staffing

| Responsibility | Proposed primary role | Backup or escalation | Operating evidence |
|---|---|---|---|
| API, database and queue health | Platform on-call | API/DB owner | Open alerts, DB/queue depth and delayed job/DLQ review |
| Security and secrets | Security on-call | Platform incident lead | Credential revocation, redaction and restricted incident evidence |
| Integration/provider incidents | Integrations on-call | Platform and Payments owner | Provider outage/replay case and bounded recovery |
| Money and settlement | Finance Operations | Payments domain owner | Unmatched collections, pending refunds and platform/merchant balance exceptions |
| Restore and continuity | Data Recovery lead | Platform on-call and Security | Backup status, periodic isolated restore proof and reconciliation |
| Internal pilot support | Support Operations lead | Product owner and Security | Scoped helpdesk queue, escalation and measured support response objectives |
| Synthetic UAT and gate evidence | QA lead | Product and Architecture | Scenario coverage, signoffs, exception and release status |

Before release, assign named primaries/backups and reviewed coverage/escalation windows. No business operating hours or on-call coverage are assumed. The operational checklist reviews backups, DLQ, delayed shipments, unmatched collections, tenant anomalies and billing variance. Support clocks have their own worksheet entry. [SLO and metrics worksheet](SLO_WORKSHEET.md)
