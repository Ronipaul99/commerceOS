> v3.3: Gates requiring actual external users or merchant confirmation remain **PENDING** until such validation takes place. Synthetic tests count only as engineering evidence, not customer signoff.

# Milestone gate checklist

This derived list is not an independent release policy. Master Sections 21–23 and approved ADRs win conflicts.


## M00: Discovery, workflows, contracts and policy decisions

- [ ] Prerequisites satisfied: —
- [ ] Every M00 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG0
- [ ] Product/QA/internal operations reviewer accepts: Approved business process maps, responsibility owners, signed open-gate plan and first 12 UAT scenario definitions.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M01: Engineering platform, secure SDLC and event backbone

- [ ] Prerequisites satisfied: M00
- [ ] Every M01 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: Platform baseline
- [ ] Product/QA/internal operations reviewer accepts: Reproducible monorepo/CI/staging, tenant context, storage, outbox, secrets and deploy/restore runbooks.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M02: Identity, tenant RBAC, guided onboarding and imports

- [ ] Prerequisites satisfied: M01
- [ ] Every M02 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG1
- [ ] Product/QA/internal operations reviewer accepts: Owner and staff can create secure isolated business workspaces, complete setup and import opening data.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M03: Catalog, pricing, inventory ledger and stock control

- [ ] Prerequisites satisfied: M02
- [ ] Every M03 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG2 stock evidence
- [ ] Product/QA/internal operations reviewer accepts: Final-unit reservations are atomic; product/price/ledger, counts and transfers reconcile.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M04: Suppliers, purchasing, customers, CRM and social selling

- [ ] Prerequisites satisfied: M03
- [ ] Every M04 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG2 domain evidence
- [ ] Product/QA/internal operations reviewer accepts: Configured channel/customer/PO flows produce valid native stock and customer histories.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M05: Orders, fulfilment, shipment, returns and exchanges

- [ ] Prerequisites satisfied: M04
- [ ] Every M05 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG2
- [ ] Product/QA/internal operations reviewer accepts: Every order/line transition survives partial fulfilment, retry, cancel and RMA.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M06: POS, payments, settlement, invoices and finance

- [ ] Prerequisites satisfied: M05
- [ ] Every M06 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG2 + G-05/G-06
- [ ] Product/QA/internal operations reviewer accepts: Cash, configured digital/bank collections, invoice and order/stock movements are reconciled; tax only after signoff.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M07: Operational analytics, Action Center and automations

- [ ] Prerequisites satisfied: M06
- [ ] Every M07 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG3 prerequisites
- [ ] Product/QA/internal operations reviewer accepts: Dashboards match domain truth, tasks are permissioned and automation replay cannot corrupt ledgers.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M08: Controlled synthetic readiness validation, resilience and security hardening

- [ ] Prerequisites satisfied: M07
- [ ] Every M08 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG3 internal + applicable RG5 controls; external validation G-16 pending
- [ ] Product/QA/internal operations reviewer accepts: Both synthetic tenant scenarios run a full operating day; restore/security/load evidence is recorded.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M09: SaaS subscriptions, plan entitlements and monetization

- [ ] Prerequisites satisfied: M08
- [ ] Every M09 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG4 + RG5
- [ ] Product/QA/internal operations reviewer accepts: Subscription and usage charges are explainable, idempotent, audited and legally configured.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M10: Merchant APIs, custom storefront integration and webhooks

- [ ] Prerequisites satisfied: M09; M01 design
- [ ] Every M10 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG7 for partner writes
- [ ] Product/QA/internal operations reviewer accepts: Read-only external surface is safe; write API remains gated until scoped security and commercial integration certification.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M11: Workforce attendance, leave, payroll and incentives seam

- [ ] Prerequisites satisfied: M02 + M06; may reorder via ADR
- [ ] Every M11 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: RG6 for payroll
- [ ] Product/QA/internal operations reviewer accepts: Private attendance and leave operate; payroll releases only after legal/role/calculation gate.
- [ ] Rollback, alerting, open risks and next milestone status documented


## M12: Advanced capabilities, optimization and continual governance

- [ ] Prerequisites satisfied: M10/M11 as relevant
- [ ] Every M12 work item has actual DoD evidence (see WORK_ITEMS.csv)
- [ ] API contracts and migrations versioned; two-tenant tests attached
- [ ] Financial/stock/HR/partner controls and release gate as applicable: Approved capability gates
- [ ] Product/QA/internal operations reviewer accepts: Optional extensions preserve native authority and demonstrate measurable value before broad rollout.
- [ ] Rollback, alerting, open risks and next milestone status documented


## MF: Native storefront and drag-and-drop builder (future separate program)

- [ ] Prerequisites satisfied: M10 + separate approved ADR
- [ ] All MF work items remain explicitly DEFERRED; no implementation or false DoD evidence
- [ ] Future contracts only; no migrations or runtime tests unless separate program approved
- [ ] Financial/stock/HR/partner controls and release gate as applicable: Separate storefront release gates
- [ ] Product/QA/internal operations reviewer accepts: No storefront runtime delivered under Business OS pilot or paid-launch scope.
- [ ] Rollback, alerting, open risks and next milestone status documented
