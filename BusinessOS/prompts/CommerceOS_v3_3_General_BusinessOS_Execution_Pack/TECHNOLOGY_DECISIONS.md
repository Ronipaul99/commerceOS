# CommerceOS — Technology decision state for v3.3

**Baseline selected in v3 master** TypeScript, Node.js/NestJS modular monolith, PostgreSQL/Prisma, Redis/BullMQ, transactional outbox/inbox, REST/OpenAPI with generated clients, React Native/Expo, independent applications and workers, pnpm/Turborepo, and containers.

**Approved carry-forward** The earlier engineering selections are adopted in v3.3 under [ADR-024](../../docs/adr/ADR-024.md), including its PgBouncer condition. This covers the scaffold toolchain for M01.01. Adopt each selection and pin applicable dependency versions in its owning work item.

**Open decisions** Fastify, the authentication/OTP provider, payment and courier providers, hosting topology, and OpenTelemetry collector/exporter choices remain subject to their respective approvals.
