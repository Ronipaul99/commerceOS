# CommerceOS v2 → v3: Controlled change summary

**Source baseline:** 21 Markdown files in supplied `CommerceOS_v2_Revised_Codex_Blueprint(1).zip`. Their architecture and planned features were reviewed, but no implementation was supplied.

## Preserved

- Separate business web, mobile, POS, platform admin and future independent storefront; typed shared API; Expo React Native.
- NestJS modular monolith, Prisma/PostgreSQL, Redis/BullMQ with outbox/idempotent events.
- Shared-schema tenant isolation, branch RBAC, secure file access and audit.
- Ledger inventory, atomic reservations, sales attribution and payment verification authority.
- Effective-dated attendance/leave/payroll policies, immutable finalized payroll, online-first POS.
- Jewellery and saree pilot contexts and multilingual readiness.

## Expanded or newly required

- Resumable ten-step merchant onboarding, preview/commit bulk imports and activation checklist.
- Full fulfilment/shipping lifecycle, partial shipments, RTO, returns, exchanges and quarantine.
- Collection vs payment allocation vs settlement, cashbook, expenses, supplier bills, reconciliation, contribution-coverage semantics.
- Enquiries, quotation revisions, CRM interactions and follow-up operations.
- Action Center, approval tasks, merchant-configurable safe automation templates, event/rule execution logs and limits.
- Sales Channel/API credential manager, scoped public/partner API, webhooks/secret rotation/logs and security release gate.
- SaaS plans/entitlements, immutable usage metering, overage, subscription state and platform billing before paid launch.
- Updated data model, route targets, UX inventory, release evidence, QA scenarios and ADR gates.

## Reprioritized or deferred

- Native storefront, its 25 screens, builder, checkout and SEO are moved to a distinct **future** program; API seam retained.
- Advanced integrations (Meta/WhatsApp, Shopify/Woo), fully offline POS, full accounting, incentive settlement, AI and visual automation designer remain P2/F.
- Workforce identity and sales attribution remain core, while full payroll launch depends on demand and legal review.
- v2 `prompts/05-store-pos.md` and duplicated `06-hardening.md` are not valid v3 implementation steps; use numbered v3 prompts.

## Decision-making rule

A new feature is not 'done' because its doc/table exists. The master is a target contract. Implementation and statutory conformance require tests, UAT, accepted ADRs and relevant external approvals.
