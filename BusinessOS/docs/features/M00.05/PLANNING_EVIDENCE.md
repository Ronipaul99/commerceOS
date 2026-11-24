# M00.05 Planning evidence

**Evidence class** HYPOTHESIS. The approval-path cases use fictional Tenant A and Tenant B, symbolic values, and simulated authority. External validation is PENDING. This packet proposes review paths without approving a provider, jurisdiction, statutory rule or customer price. [RG0 decisions log](DECISIONS_LOG.md)

## Validation paths for policy owners

| Path | Required review packet | Validation and stop condition |
|---|---|---|
| GST, tax and invoices, G-06/G-17 | Product and Architecture establish the proposed launch jurisdiction, locale and currency scope with Finance/Legal. Qualified tax/accounting or legal reviewers and the merchant verify applicable registration, entity, transaction classification, tax treatment, effective dates, invoice series, returns/corrections and any reporting/adapters. Keep source and reviewed workpaper references restricted. | QA uses reviewer-approved fixtures for rounding, missing policies, effective-date cutover, sequence uniqueness and immutability with authorized corrections. Block live calculations and statutory issuance until the policy and jurisdiction are approved and the affected release is verified. GST is a validation path where applicable. No rate or applicability is assumed. |
| Payments and settlement, G-05/G-17 | Product, Finance and Security approve the method, provider/courier/account scope, manual verification and maker-checker roles, authoritative evidence by event/rail, payout/reconciliation rules and disputed/replayed states. Jurisdiction-specific payment operations also need G-17. | Use synthetic or approved sandbox fixtures for evidence and signature validation, duplicate and delayed provider observations, partial capture, COD delivery versus remittance, refunds and settlement discrepancies. Require independently verified provider evidence or a separately authorized audited manual path. Reject unsupported evidence and keep capture, allocation and settlement separate. RG2 evidence is required for live commercial operation. |
| SaaS charging, G-07/G-14 and applicable G-17 | Founder/Finance approve versioned plan terms, currency, tax treatment, effective dates, meter and exclusions, quotas, adjustments and prices. Founder/Legal approve grace, suspension and preserved data access. Jurisdiction-specific behavior requires G-17. | Verify an explainable invoice with approved fixtures, one effect per eligible usage, replay/correction, separation from merchant payment records, and preserved rights after suspension. Paid launch requires RG4 and the other applicable release gates. |
| Payroll, G-10/G-17 | HR, qualified payroll/legal reviewer and the merchant validate eligibility, payroll period, approved formulas and effective dates, attendance/leave/proration, input authorization, exceptions and jurisdiction. G-17 defines jurisdiction scope. | Have reviewers supply expected synthetic calculations. Verify preview against approved cases, privacy, maker-checker, deterministic computation, immutable finalization and corrective runs. Keep statutory automation and payout disabled until approvals and RG6 evidence exist. |
| Identity and recovery, G-01/G-18 | Product/Security approve verified owner authentication, privileged MFA, recovery, delivery budgets and provider/security controls. Architecture/Product reconcile engineering selections through ADR-024 before provider-dependent implementation. | Test synthetic enrollment, recovery, session revocation, scoped rate-limit behavior and failure modes before live activation. A scaffold, an OTP sample or a prior toolchain approval does not confer provider authority. |

## ADR-024 carry-forward proposal

**PROPOSED for v3.3.** The earlier BusinessOS master records approval on 24 November 2026 for the choices below. The v3.3 technology inventory treats these as proposed pending a signed ADR. Carry the approved scope forward in one reviewed v3.3 ADR/master amendment, as required by master §1. Do not expand that approval to tools, providers or contexts omitted from the earlier ADR. No amendment is effective in this packet. [Prior approved ADR-024](../../../doc/CommerceOS_v3_1_Engineering_Development_Package/commerceos-execution-v3.1/MASTER_BLUEPRINT.md#234-adr-024-businessos-engineering-toolchain) · [v3.3 technology decisions](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/TECHNOLOGY_DECISIONS.md) · [Reconciliation preflight](../../../REPOSITORY_PREFLIGHT.md#adr-024-reconciliation-proposal)

| Component | Previously approved choice proposed for v3.3 carry-forward |
|---|---|
| Business Web | Next.js + TypeScript |
| Web UI components | shadcn/ui + Radix UI + Tailwind CSS |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Web local state | Zustand |
| Backend unit tests | Jest |
| Integration tests | Testcontainers + PostgreSQL |
| Browser end-to-end tests | Playwright |
| API tests | Supertest + OpenAPI contract validation |
| Load tests | k6 |
| CI/CD | GitHub Actions |
| Telemetry | OpenTelemetry |
| Database connection pooling | PgBouncer when warranted |
| Infrastructure as code | Terraform |

Preserve the locked TypeScript, Node.js/NestJS modular monolith, PostgreSQL/Prisma, Redis/BullMQ, outbox/inbox, REST/OpenAPI, Expo, pnpm/Turborepo and container baseline. PgBouncer remains conditional on measured pressure and Prisma/transaction verification, with direct database connections for migrations if pooling is adopted. OpenTelemetry instrumentation is distinct from the collector, exporter and hosting topology. Terraform does not choose a cloud provider or authorize an apply.

**Open decisions.** Leave Fastify unselected, with the current Express scaffold as repository evidence. Leave auth/OTP provider and recovery choices to G-01/G-18, payment/courier providers and evidence to G-05, and hosting topology, capacity and collector/exporter operational choices to G-11/G-18 as applicable. Do not infer POS shell timing or capability adoption from toolchain approval. Alternatives are to retain a proposed stack pending later reconciliation or to adopt replacements under the same change protocol and compatibility tests. Carry-forward preserves the previous scope and reduces tool churn while leaving the v3.3 authority question explicit. Prove fresh builds, OpenAPI/HTTP compatibility, real PostgreSQL and browser tests, gated CI and rollback, redacted telemetry, measured load and reviewed Terraform plans in the owning work items. Pin versions there.

## Approval model fixtures

The following cases use symbolic references, no legal or financial values. Required gates for each example are scoped to the proposed policy publication. Human release authorization and domain effects are separate.

~~~json
{
  "provenance": "HYPOTHESIS",
  "external_validation": "PENDING",
  "tenant_scopes": ["TENANT-A", "TENANT-B"],
  "cases": [
    {"id": "TAX", "policy": "TAX_POLICY", "scope": "TENANT-A", "gates": ["G-06", "G-17"]},
    {"id": "PAYMENT", "policy": "PAYMENT_AUTHORITY", "scope": "TENANT-A", "gates": ["G-05", "G-17"]},
    {"id": "SAAS_PRICE", "policy": "PLAN_PRICE", "scope": "PLATFORM", "gates": ["G-07"]},
    {"id": "PAYROLL", "policy": "PAYROLL_FORMULA", "scope": "TENANT-A", "gates": ["G-10", "G-17"]},
    {"id": "OTP", "policy": "OTP_PROVIDER", "scope": "PLATFORM", "gates": ["G-01", "G-18"]}
  ],
  "revision": "SYNTHETIC-REVISION-1",
  "synthetic_jurisdiction": "TEST-SCOPE",
  "operation": "SIMULATED-DECISION-01"
}
~~~

Start each case from the blocked register. Simulate all applicable roles approving the exact scope, revision and evidence to test the gated model without creating a decision in the register. Deny unsigned, partial, agent-originated, stale or wrong-scope decisions. Verify exact replay has one modeled record and changed content cannot replace the accepted revision. [Verification results](VERIFICATION.md)

## Review record

Product/Architecture review, required gate owners, independent reviewer, approval date, allowed scope and evidence links are pending. M00.04 remains in security review. No human decision or release was inferred from the synthetic results. [M00.04 verification](../M00.04/VERIFICATION.md)
