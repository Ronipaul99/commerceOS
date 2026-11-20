# Stage 01-04 architecture

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
- `apps/api/src/integrations`: server-only Razorpay test gateway, HMAC verification and provider HTTP boundary.
- `packages/shared/src/schemas` and `types`: HTTP contracts.
- `prisma`: schema, reviewed initial SQL migration and opt-in development seed.
- `infrastructure`: multi-stage Dockerfile, Compose override, local Nginx proxy and operations notes.

## API conventions

Public versioned endpoints are under `/api/v1`; readiness is `/api/health`. Request schemas are explicitly parsed at route boundaries. Pagination is `page` (1-10000), `limit` (1-50), defaulting to 1 and 12. Unknown pagination keys and malformed slugs are rejected. Stage 03 adds validated category/collection/price/availability/featured filters, server sorting and API search; see SHOPPING.md.

Successful responses use `{ data }`. Product lists include page, limit, total and totalPages. List/count use one repeatable-read transaction and stable createdAt/id ordering. Public data excludes inactive products, inactive categories, inactive variants and inactive collection memberships. API output is an explicit projection: no password hashes, timestamps, stock quantities or internal foreign-key details. Categories/collections contain id/name/slug/description; products include ordered images and variants.

Errors use `{ error: { code, message, requestId, issues? } }`. 400 denotes request validation, 404 missing resources, 500 unexpected failures. Responses and logs avoid raw database exceptions. Database readiness returns 503 if its `SELECT 1` probe fails. A disconnected database fails API startup. A bounded PostgreSQL pool and timeouts avoid indefinite connection waits. Process signals close Fastify and the pool.

Fastify supplies JSON request logs and generated correlation IDs, Helmet security headers, explicit-origin CORS, a small body limit and no-store API responses. CORS is a browser policy, not authorization. Catalog mutations/admin authentication remain absent. Stage 04 adds guest checkout, payment verification and private token-gated order access; see CHECKOUT.md. No reverse-proxy client IP trust is enabled until the production proxy topology is qualified.

## Frontend and proxy

The newly approved festive homepage uses server components for editorial composition and streamed, deduplicated HTTP catalog queries. Client islands own manual carousels, native scroll rails, shared bag/wishlist actions and reduced-motion reveals. New Arrivals uses backend newest ordering; four collection requests use actual membership and the explicitly approved labelled current-catalog fallback when empty. No hardcoded product/price/stock fallback is rendered. Eight known new collection URLs have clear frontend preview destinations until their real API records/membership are configured; existing and unknown collection route behavior is preserved. See HOMEPAGE_REDESIGN.md.

Campaigns and fonts are local; dedicated mobile art direction uses Next.js optimized picture sources. Concept campaign assets are never substituted for actual product imagery, and catalog provenance labels remain. Header/footer use the approved burgundy identity; cart/checkout services and SEO metadata remain unchanged. Newsletter is still truthful when no subscription backend is supplied.

Cart and wishlist selections persist in versioned browser storage as identifiers, variant selection and quantity only. Fastify resolves current prices, availability and safe quantities. Cart resolution remains read-only; Stage 04 checkout separately persists guest orders and transactional stock reservations. No customer accounts are created. Product/collection pages perform server-side HTTP existence checks; lists use URL filters, server sorting and pagination. Search uses the Fastify API. Native dialogs preserve the existing keyboard/focus behavior; the homepage composition is retained. Newsletter integration is still pending and makes no submission claim. See SHOPPING.md for contracts, state/error behavior and isolated test setup.

The browser client fetches same-origin `/api/...`, validates successful responses using shared schemas, sanitizes errors and carries correlation IDs. Server callers can explicitly supply an HTTP origin. The dynamic homepage streams catalog data through the server-only HTTP client and does not require database access during build. The Next.js server-only upstream is validated and compiled into rewrites; Docker builds use the API service name and enable NEXT_OUTPUT_STANDALONE=true. Host builds use the normal next start output. Never make DATABASE_URL or API credentials public through NEXT_PUBLIC_.

## Deferred by design

Stages 02 and 03 are implemented. Stage 04 guest orders, checkout, Razorpay test integration and optional COD are implemented; real Razorpay-account qualification awaits credentials. Stage 05: minimal authenticated admin. Stage 06: live OCI/TLS deployment, backups and operational qualification. No later-stage functionality is claimed by the foundation.

## Checkout boundary

See CHECKOUT.md for immutable snapshots, precise totals, idempotency, token privacy, webhook handling, reservation expiry/late capture and the in-process maintenance loop. Only accepted orders receive operational state NEW. No admin, courier, queue or complex OMS is introduced.
