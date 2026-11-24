# CommerceOS — Technology decision state for v3.3

**Already baseline/selected in v3 master:** TypeScript; Node.js/NestJS modular monolith; PostgreSQL with Prisma; Redis and BullMQ; transactional outbox/inbox; REST + OpenAPI/generated clients; React Native/Expo; independent apps, API and workers; pnpm/Turborepo baseline; Docker/container delivery.

**Proposals, NOT approved selections unless ADR-024 is signed:** Next.js (Business Web), Tailwind CSS, shadcn/ui/Radix, TanStack Query, React Hook Form/Zod, Zustand, Fastify HTTP adapter, Jest, Testcontainers, Playwright, Supertest, k6, GitHub Actions, OpenTelemetry backend/collector choices, Terraform, PgBouncer, authentication/OTP provider, payment/courier providers and OCI operating topology.

**Action:** During M00, write `docs/adr/ADR-024.md` and amend the master in the same approved change; block incompatible dependency installation in M01 until decided. Lock supported Node and package versions at implementation time, not by inventing a version here.
