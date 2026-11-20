# Stage 01-03 architecture

## Boundaries

```text
Browser - one origin
  |-- / and assets - Next.js App Router (web)
  |-- /api/* - Next.js rewrite in host dev / Nginx at the local edge
                    - Fastify REST API
                         - Prisma 7 + @prisma/adapter-pg
                              - PostgreSQL 17
```

This is one storefront and one backend, not a microservice system. Next.js owns layouts, presentation, loading/error UI and the typed HTTP client. It has no Prisma/pg dependency and no database code. The API owns persistence and business logic. `packages/shared` exports Zod schemas and inferred TypeScript contracts, without database models or secrets.

## Repository

- `apps/web/src/app`: root metadata/styles, public layout, homepage preview, loading, segment/global errors and 404.
- `apps/web/src/components`: storefront shared storefront components and preview state/dialogs.
- `apps/web/src/features`: feature presentation; the Stage 02 homepage and intentional preview destinations.
- `apps/web/src/lib`: typed HTTP client and integer-paise formatting.
- `apps/api/src/modules/catalog`: read-only catalog repository and routes.
- `apps/api/src/plugins`: database lifecycle; connection at startup, disconnect at shutdown.
- `apps/api/src/config`: environment validation with secret-safe errors.
- `apps/api/src/middleware`: centralized error and not-found handlers.
- `apps/api/src/integrations`: reserved for explicitly authorized later stages.
- `packages/shared/src/schemas` and `types`: HTTP contracts.
- `prisma`: schema, reviewed initial SQL migration and opt-in development seed.
- `infrastructure`: multi-stage Dockerfile, Compose override, local Nginx proxy and operations notes.

## API conventions

Public versioned endpoints are under `/api/v1`; readiness is `/api/health`. Request schemas are explicitly parsed at route boundaries. Pagination is `page` (1-10000), `limit` (1-50), defaulting to 1 and 12. Unknown pagination keys and malformed slugs are rejected. Stage 03 adds validated category/collection/price/availability/featured filters, server sorting and API search; see SHOPPING.md.

Successful responses use `{ data }`. Product lists include page, limit, total and totalPages. List/count use one repeatable-read transaction and stable createdAt/id ordering. Public data excludes inactive products, inactive categories, inactive variants and inactive collection memberships. API output is an explicit projection: no password hashes, timestamps, stock quantities or internal foreign-key details. Categories/collections contain id/name/slug/description; products include ordered images and variants.

Errors use `{ error: { code, message, requestId, issues? } }`. 400 denotes request validation, 404 missing resources, 500 unexpected failures. Responses and logs avoid raw database exceptions. Database readiness returns 503 if its `SELECT 1` probe fails. A disconnected database fails API startup. A bounded PostgreSQL pool and timeouts avoid indefinite connection waits. Process signals close Fastify and the pool.

Fastify supplies JSON request logs and generated correlation IDs, Helmet security headers, explicit-origin CORS, a small body limit and no-store API responses. CORS is a browser policy, not authorization. No mutation endpoints or authentication are present. No reverse-proxy client IP trust is enabled until the production proxy topology is qualified.

## Frontend and proxy

The homepage is a server component with isolated client boundaries for preview state, dialogs, galleries, footer disclosure and newsletter validation. The provider fetches up to four featured products through the typed same-origin HTTP client after hydration. A four-slot concept edit keeps the layout stable during loading, sparse results or API failure. Real API images/names/prices/availability are retained; any missing photograph is replaced only with explicitly labelled concept art. All fonts and campaign assets are local. The build has no database dependency.

Cart and wishlist selections persist in versioned browser storage as identifiers, variant selection and quantity only. Fastify resolves current prices, availability and safe quantities. No order, account, payment or inventory reservation is created. Product/collection pages perform server-side HTTP existence checks; lists use URL filters, server sorting and pagination. Search uses the Fastify API. Native dialogs preserve the existing keyboard/focus behavior; the homepage composition is retained. Newsletter integration is still pending and makes no submission claim. See SHOPPING.md for contracts, state/error behavior and isolated test setup.

The browser client fetches same-origin `/api/...`, validates successful responses using shared schemas, sanitizes errors and carries correlation IDs. Server callers can explicitly supply an HTTP origin. The homepage fetches catalog data in the browser and does not require a database during build. The Next.js server-only upstream is validated and compiled into rewrites; Docker builds use the API service name and enable NEXT_OUTPUT_STANDALONE=true. Host builds use the normal next start output. Never make DATABASE_URL or API credentials public through NEXT_PUBLIC_.

## Deferred by design

Stages 02 and 03 are implemented. Stage 04: guest orders, checkout, Razorpay and optional COD. Stage 05: minimal authenticated admin. Stage 06: live OCI/TLS deployment, backups and operational qualification. No later-stage functionality is claimed by the foundation.
