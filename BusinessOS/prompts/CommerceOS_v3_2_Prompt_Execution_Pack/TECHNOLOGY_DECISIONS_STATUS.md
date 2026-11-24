# Technical choices — locked vs proposed

## Source-confirmed baseline

- Node.js + NestJS + strict TypeScript for modular API, PostgreSQL + Prisma for authoritative transactions, Redis + BullMQ for background processing; outbox + inbox deduplication.
- React Native + Expo for Business Mobile, React-based Business Web and POS PWA, shared typed REST/OpenAPI APIs.
- pnpm + Turborepo execution baseline, OCI-compatible container deployment, role/tenant/branch authorization and object storage interface.

## NOT automatically locked by this prompt pack

Next.js rather than a React SPA; Fastify adapter; shadcn/ui/Radix/Tailwind; TanStack Query, React Hook Form/Zod, Zustand; provider choices; exact authentication protocols/identity vendor; Jest vs alternative testing framework; Playwright/k6 and CI/CD/observability vendors. These were recommended in discussion but not uniformly approved in master decisions.

**Proposed ADR-024 (approval required before M01 implementation):** settle framework/adapters, validation, frontend UI and state, test runners, CI/CD/IaC and observability; specify supported version policy, lockfiles, change approval and exception process. Do not mark ADR-024 approved merely because listed here.

Where no technology choice is approved: write a design comparison and mark the task blocked at the relevant gate; do not silently pick one.
