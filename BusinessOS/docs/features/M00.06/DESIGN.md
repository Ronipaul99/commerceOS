# M00.06 QA architecture and SLO workload

## 1. Scope and boundaries

**State** PROPOSED. **Evidence** HYPOTHESIS. External validation is PENDING. This planning item defines how QA, Product and Operations will review two independent synthetic tenants, run canonical internal UAT, and collect performance and restore evidence. Tenant A covers single-branch stock-tracked manual and POS operations, with synthetic social booking in its relevant case. Tenant B covers two-branch stock-tracked manual/social operations and disabled non-stock requests as policy probes. Both require scope and relevant entitlements. This plan excludes native storefront delivery, live partner writes, unapproved non-stock selling and jurisdiction-specific tax/payroll assumptions. [M00.06 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M00/M00.06.md) · [Master blueprint](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md)

## 2. Primary and alternate journeys

QA seeds isolated tenants with distinct namespaces, memberships and scoped branches and resets feature state per test. For each canonical scenario, an authorized Tenant A actor follows the workflow and QA probes Tenant B isolation with same-alias records. Selected cases repeat independently within B and test B1 versus B2. Operators compare authoritative stock, financial and state records before and after retries, timeouts and compensation. Unsupported item requests are negative tests. Missing policy or a gated feature remains blocked, with no stock or money effect.

The future Business Web/POS/mobile checks cover success, loading, empty, partial and stale projections, denied or missing objects, conflicts, low bandwidth, error feedback and safe retries. UI scenarios check keyboard, assistive technology, responsive widths and readable locale layouts where applicable. UI implementation, screenshots and browser execution are outside M00.06.

## 3. Ownership and data sources

Inventory owns authoritative stock movements, reservations and commitments. Orders, Fulfillment, Shipment, Returns, Payments and SaaS Billing independently own their transitions and ledgers. QA compares derived views with owner records and checks a stated projection lag. Platform owns environment, telemetry, backup and recovery evidence. Security owns denial criteria and evidence handling. Product and QA own scenario coverage, while practitioner roles in the [suite map](TEST_SUITE_MAP.md) provide independent evidence. Test drivers call approved public or domain interfaces in the owning slice. Test setup may seed isolated environments through reviewed fixture loaders. [M00.02 boundaries](../M00.02/DESIGN.md) · [M00.03 invariants](../M00.03/DESIGN.md) · [M00.04 permission workbook](../M00.04/PERMISSION_WORKBOOK.md)

## 4. Persistence and integrity

Physical tables, indexes, migrations and backfills are **NOT_APPLICABLE** in M00.06. Later integration tests use disposable PostgreSQL, tenant-consistent foreign keys and scoped fixtures, including a reused SKU alias under independent tenant IDs. Assert nonnegative available stock, once-only ledger/effect posting, original order and finance facts preserved, and verified settlement separate from collection. Decimal quantities and integer minor-unit money remain domain rules. Migration and restore suites compare ledger invariants through expand/backfill/contract, rollback compatibility and restore checkpoints, including private file references.

## 5. Conceptual test contracts

Runtime REST/OpenAPI, generated clients and pagination changes are **NOT_APPLICABLE**. The future contract layer asserts scoped reads/lists, field constraints, idempotency key and payload pairing, version conflicts, accepted event versions, and stable denial responses without cross-tenant disclosure. Correlate test requests, outbox/inbox facts and owner writes with opaque identifiers. Archive the test manifest with the source revision, seed, environment and actual outputs. The [SLO worksheet](SLO_WORKSHEET.md) separates candidate thresholds and response-time observations.

## 6. Security and privacy

Use fictional identities and data in all fixtures. Exercising a scoped role must not expose another tenant's product, order, payment, employee, payroll, credential, export or file. Check wrong branch, unauthorized write fields, expired grant, queue context mismatch, verified provider event handling, gated partner writes and worker replay. Runtime security review includes CSRF where applicable, webhook signature/replay, private file and export scope, secrets storage, redaction, rate limiting and least privilege. Keep per-tenant diagnostics in a controlled store. Avoid identities, financial values, secrets and raw tenant IDs in exported metric labels. No external system, production resource or live credential is needed for this plan.

## 7. Workload, scale and recovery

The [workload and retry plan](PLANNING_EVIDENCE.md) specifies fixture sizes, read/write mix, time windows, tenant contention, order retries, import/export, queue bursts and restore. Collect per-endpoint latency, error distribution, SQL plans and lock waits around hot positions, worker age and per-tenant fairness. Compare cold, warmed and degraded cache conditions separately. For provider tests use a controlled sandbox or stub and report upstream latency alongside application timing. Restore only in an isolated approved environment. Runtime measurements require a runnable build, a recorded environment and an evidence manifest. G-11 governs workload, thresholds and readiness claims. Controlled calibration can inform that decision. Live execution also requires security, rollback and release approval.

## 8. Verification plan

Run the [planning verifier](VERIFICATION.md#reproduce-the-checks) against the master, test-suite map, worksheet and fixtures. It checks canonical SC-01–SC-12 coverage and role ownership, tenant-local stock and financial outcomes for deterministic cases, policy denial and replay, workload arithmetic, and rejection of unsupported measurement claims or verified segment coverage. Runtime tests progress through unit, PostgreSQL integration, contract, role isolation, UI/API E2E, queue/provider fault, performance and restore suites as the feature owners deliver them.

## 9. Operations

The [staffing plan](TEST_SUITE_MAP.md#operational-staffing) assigns proposed primary and backup roles for platform, security, provider, financial reconciliation, recovery and support. Confirm named owners before release. Track structured opaque request/correlation IDs, queue age, DLQ, lock hotspots and scoped ledger mismatches without PII. Operators reconcile retried events, quarantine uncertainty and validate restore data and access before declaring readiness. Calibrate alerts and helpdesk response objectives after evidence. Deployment, rollout, recovery execution and capacity/cost figures are outside this item.

## 10. Decision log

| State | Decision and owner |
|---|---|
| CONFIRMED | Master §§4, 16.6 and 21 require traceable and scoped transactions, synthetic datasets, separate targets and measurements, operational ownership and release evidence. Context is stock-tracked commerce. |
| PROPOSED | QA and Platform review fixture cardinality, load shapes, measurement windows, aggregation and failure classification. Product, Security, Architecture and Operations review scenario scope, isolation and staffing. |
| BLOCKED | M00.05 acceptance and RG0 signoff remain pending. The [decision register](../M00.05/DECISIONS_LOG.md) blocks live or unapproved behavior. G-11 and the owning slices are prerequisites for runtime measurements. G-18 reconciliation governs unresolved tool choices. G-02/G-15/G-17 gate new capabilities or jurisdictions. G-16 external validation remains PENDING. |
