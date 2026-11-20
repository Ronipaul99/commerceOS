# STAGE 01 — TIYAS JEWEL PROJECT FOUNDATION

Act as a senior full-stack architect experienced in Next.js, Node.js, Fastify, PostgreSQL and OCI deployment.

We are developing TIYAS JEWEL, a premium jewellery ecommerce website serving customers in India.

This is the first stage of a six-stage implementation.

## Project scope

Build only:
1. A premium customer-facing jewellery storefront.
2. A Node.js backend API.
3. A PostgreSQL database.
4. A minimal admin panel, which will be built in Stage 05.

Customer functionality:
- Homepage
- Shop and collections
- Product details
- Search and filters
- Wishlist
- Shopping cart
- Guest checkout
- Razorpay and optional Cash on Delivery
- Order confirmation
- Basic informational pages

Admin functionality:
- Admin login
- Add, edit and archive/delete products
- Upload product images
- Change price and basic availability
- View total/new/completed orders
- View order details
- Manually mark an order Completed after fulfillment

Do NOT implement:
- CommerceOS
- Multitenancy or multiple storefronts
- Complex OMS or fulfillment management
- Courier integrations
- Advanced inventory management
- Customer accounts
- Employee management
- CRM
- Analytics platforms
- Microservices

## Technology stack

Frontend:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Lucide icons

Backend:
- Node.js
- Fastify
- TypeScript
- Zod validation
- REST APIs

Database:
- PostgreSQL
- Prisma ORM

Testing:
- Vitest
- Playwright

Infrastructure:
- Docker Compose
- Nginx
- OCI ARM64 deployment compatibility

Use maintained, compatible dependency versions.

## Monorepo structure

Create:

```text
tiyas-jewel/
  apps/
    web/
      src/app/
      src/components/
      src/features/
      src/lib/
    api/
      src/modules/
      src/plugins/
      src/middleware/
      src/integrations/
      src/config/
  packages/
    shared/
      src/schemas/
      src/types/
  prisma/
  infrastructure/
    docker/
    nginx/
    scripts/
  design/
    reference/
  docs/
  AGENTS.md
  .env.example
  README.md
```

Use an appropriate workspace manager.

The Fastify API must own database access and business logic. Next.js must not directly connect to PostgreSQL.

Use shared Zod schemas and TypeScript contracts where appropriate.

## Database foundation

Set up the first migration with the foundational tables:

- Product
- ProductImage
- ProductVariant
- Category
- Collection
- ProductCollection association
- AdminUser

Prepare the schema architecture for:
- Order
- OrderItem
- Payment

Those commerce tables can be finalized in Stage 04.

Use integer paise for INR money amounts or another precise, consistently enforced monetary representation.

Support product slugs, active status, basic stock quantities and timestamps.

Seed a small development catalog.

## Backend foundation

Implement:
- GET /api/health
- GET /api/v1/products
- GET /api/v1/products/:slug
- GET /api/v1/categories
- GET /api/v1/collections

Create:
- Database connection plugin
- Central error handler
- Request validation conventions
- Environment variable validation
- Structured request logging
- Basic security headers
- CORS configuration
- Typed API contracts

Use versioned REST endpoints.

No public product mutation endpoints.

## Frontend foundation

Initialize Next.js with:
- App Router
- Global styles
- Root layout
- Storefront layout
- Error boundaries
- Loading states
- Typed API client
- Header/footer placeholders
- Homepage placeholder

Configure same-origin /api requests through a development proxy or rewrites so the production architecture can use one domain.

## Docker

Create a local Docker Compose environment with:
- Next.js
- Fastify
- PostgreSQL

The database must use a persistent volume.

Do not expose PostgreSQL publicly.

Ensure every required container image supports Linux ARM64.

Use health checks and service startup dependencies.

## Development commands

Configure reliable commands for:
- Install dependencies
- Start development
- Start local database
- Run migrations
- Seed products
- Run tests
- Build frontend
- Build backend

## Documentation

Create:
- AGENTS.md
- docs/ARCHITECTURE.md
- docs/DATABASE.md
- docs/IMPLEMENTATION_STATUS.md
- docs/DEPLOYMENT_PLAN.md
- README.md
- .env.example

AGENTS.md must instruct Codex to:
- Preserve the approved visual design
- Avoid unnecessary features
- Keep frontend/backend responsibilities separate
- Never hardcode credentials
- Run tests after changes
- Maintain API compatibility
- Update the implementation status
- Stop after the requested stage

## Acceptance criteria

- Next.js starts successfully.
- Fastify starts successfully.
- PostgreSQL connects successfully.
- Prisma migrations run.
- Seed data is available.
- Read-only product APIs work.
- Docker Compose runs locally.
- TypeScript checks pass.
- No unnecessary enterprise modules exist.

Inspect the repository before modifying files.

Implement the foundation, run the relevant checks, document results, and stop after Stage 01.
