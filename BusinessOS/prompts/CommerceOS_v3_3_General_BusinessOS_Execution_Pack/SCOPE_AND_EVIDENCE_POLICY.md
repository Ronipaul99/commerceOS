# CommerceOS v3.3 — Scope and evidence policy

## Product target
CommerceOS is a modular, multi-tenant Business OS intended to accommodate different **commerce-oriented** organizations without presuming any reference business. The initial source blueprint is strongly oriented toward inventory-led transactions, but organization and customer domains must not hardcode a particular business vertical.

## Confirmed capability baseline
- Tenant, branches, employee identities, role-based access, onboarding and configuration.
- Native catalog and variant metadata, **stock-tracked** inventory and procurement, orders, operational POS, returns, collections/settlements, CRM, expenses, analytics, automation and SaaS subscriptions.
- Manual/social channel data entry, optional social-session workflow, sales-channel registration and secured partner/storefront APIs.
- Web, mobile, POS, and restricted platform administration.

## Capability seams, not default supported functionality
- Service-only jobs/appointments and non-stock item fulfillment, manufacturing/BOM, lots/serials, wholesale price/tax/credit terms, industry-regulated item tracking, rental, marketplace multi-seller, subscription services sold by tenants and sector-specific workflows require distinct scoped specifications.
- Country-specific financial obligations, tax invoices, statutory payroll and multi-currency settlement require approved jurisdiction-specific rules.
- The native storefront/builder/customer-facing checkout remains future scope.

## Test evidence truthfulness
- All current business actors, scenarios, datasets and tenant references are **fictional**. There are **no reference merchants**, customer interviews, usability sign-offs, live transaction data, pilot conversion numbers or validated industry policies.
- M00 creates hypotheses, sample workflows and validation questions. M08 executes engineering/internal synthetic UAT. A separate, later real-customer validation gate is required before claiming merchant fit or commercial readiness.
- Use Tenant A (small stock-led business, manual/POS transactions) and Tenant B (multi-location stock-led business with varied taxonomy/channels) to prove isolation; invent no customer names or testimonials. Optional non-stock tests exercise policy-gated rejection until implemented.

## Architecture
Preserve locked existing NestJS/Node.js/TypeScript modular-monolith, Postgres/Prisma, Redis/BullMQ, outbox/inbox and Expo choices. New technology choices must be approved through ADR-024/G-18 rather than silently treated as final.
