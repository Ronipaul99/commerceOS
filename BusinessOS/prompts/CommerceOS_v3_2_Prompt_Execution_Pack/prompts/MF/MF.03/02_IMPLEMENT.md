# MF.03 — Future customer checkout and channel experience — Implement

**CommerceOS prompt execution pack v3.2** · **Stage:** Implement · **Work item:** `MF.03` · **Milestone:** MF: Future storefront, builder and customer checkout  
**Master trace:** `15.4 STR-F02; INT-009` · **Applicable milestone gate:** Separate future storefront program  
**Feature scope policy:** Design-only until separate approval; never activate runtime in this pack

Mandatory sources (read from the repository, not from memory):
1. `source_v3_1/MASTER_BLUEPRINT.md` (sole authority, v3.0.0).
2. `AGENTS.md` (original binding engineering agent policy).
3. `source_v3_1/ENGINEERING_EXECUTION_ROADMAP.md` (v3.1 implementation companion).
4. `source_v3_1/WORK_ITEMS.csv` (exact work-item row).
5. `source_v3_1/MILESTONE_GATES.md` (derived milestones; master wins).
6. `PROMPT_OPERATING_RULES.md` and `TECHNOLOGY_DECISIONS_STATUS.md`.
If any named source is missing, unreadable, or contradictory, stop and report; never replace it with guesses.

## The exact work item (source-derived)

**Source implementation actions:**
- Build storefront search/cart/PDP, quote/hosted tokenized payment, delivery/tax, guest/customer identity, order/status/return portal only on approved future scope.

**Source contracts / data / UI deliverables:**
- Customer-facing site consumes public/partner business APIs.

**Source risk and scaling controls:**
- Server reprices/locks stock, prevents fraud, tenant isolates storefront sessions, no raw card storage.

**Source acceptance evidence:** Dedicated checkout performance/security and payment certification before release.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Specify eventual checkout/channel contract and customer journey without shipping it.

**Mandatory adversarial/exception exercise:** No merchant browser secrets, stock/payment authority or live checkout endpoint.

## Non-negotiable constraints

Non-negotiable engineering constraints:
- NestJS modular monolith, TypeScript, PostgreSQL/Prisma, Redis/BullMQ; durable transactional outbox and idempotent consumers. Use declared domain facades instead of direct cross-module mutations.
- Trusted tenant from verified actor/credential context; tenant-safe FKs, branch/action/field policy, deny-by-default authorization in controllers, services and workers. Never trust a tenantId from the body.
- PostgreSQL is authoritative for money, stock, usage and finalized payroll; Redis and read projections are never their source of truth. Integer minor currency units and decimal-safe quantities. Track invariants in tests.
- Every sensitive mutation must define idempotency, version/conflict behavior, transaction scope, audit and outbox impact. No external network calls inside a DB transaction. No unbounded retries.
- Mask PII/secrets in APIs, logs, metrics, export, object links and jobs. Handle rate limits, abuse, timeouts and backpressure.
- Domain read models may be eventually consistent but must disclose freshness. Plan bounded pagination and indexes for tenant filters; never assert performance without measurements.
- Production rollout requires explicit release gates and a real reviewer. No test command/result may be claimed unless executed.
- Native storefront/editor, offline authoritative POS, external catalog/inventory/OMS replacement, generic ledger/accounting and unapproved automation money/stock/payroll actions are out of scope.
- Technology decisions not explicitly locked in v3 remain proposals; do not independently choose provider, auth method, price limits, statutory rates or cloud capacity. Record ADR proposal and block dependent work.


## How this feature must work end-to-end

- **Actor/operational journey:** Future separate approved storefront program, builder editor/rendering and checkout customer experience.
- **Data and aggregate boundary:** Native CommerceOS catalog/inventory/orders remain authoritative; no storefront-owned operational duplicate.
- **Security/tenancy/privacy:** Only scoped server-side integrations; no browser API secrets or direct DB/money/stock changes.
- **Scale/reliability:** Future API projections, versioned themes/render schema, and cache consistency planning only.
- **UI and usability:** Future drag-and-drop schemas and responsive accessible storefront design exploration only.
- **Test emphasis:** Design contract reviews only before separate project approval; never claim storefront implementation.
- **Feature-specific deep check:** Model authentication scopes, key lifecycle, webhook HMAC verification, SSRF and replay defenses, per-key rate limits, tenant-safe public projection; RG7 before partner order writes.

**Scope isolation:** Work on `MF.03` only. Previous work item: `MF.02`; inspect prerequisites, but never auto-implement unapproved dependencies.

**HARD STOP — FUTURE SCOPE:** M-F is future scope. Unless there is an explicitly approved separate storefront program ADR, only review/plan; never implement or test a live storefront/builder/checkout. Do not advance any M-F work item during the Business OS execution queue.

## HARD STOP — FUTURE PROGRAM NOT AUTHORIZED

This stage is deferred and must NOT implement a native storefront, visual builder, customer checkout or storefront runtime. If a separate signed future-program ADR and gate approvals are not in the actual repository, record `BLOCKED / FUTURE` and STOP. Do not generate code, APIs or customer checkout from this prompt.
