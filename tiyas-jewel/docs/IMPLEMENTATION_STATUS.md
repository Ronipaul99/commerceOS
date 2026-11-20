# Implementation status

Current stage: **03 - Complete ecommerce storefront**. Stage 03 is implemented. Work stops here; checkout, payments, orders and admin are not implemented.

## Delivered

- Preserved the approved Stage 02 homepage structure, semantic design tokens, fonts, responsive compositions and campaign assets.
- Real shop/category/collection listings: counts, category/price/availability URL filters, stable price/newest sorting, pagination, empty/loading/error states and mobile filter drawer.
- Product details: backend existence checks and proper HTTP 404, multi-image gallery, mobile swipe, zoom, selected SKU/price/image/availability, quantity limits, wishlist and API-related products.
- Cards retain the editorial design with optional compare-at pricing, alternate images, wishlist and stock-aware bag/option actions.
- Anonymous cart/wishlist persistence uses versioned identifier-only local storage. Prices, stock and line/subtotals come from current backend resolution. Missing/unavailable items are excluded from totals, stock reductions are explained, and forged local prices are ignored.
- Cart drawer/page, quantity/removal, restore/focus revalidation, wishlist page/removal/move-to-cart, and recoverable network/storage errors.
- Fastify search with product thumbnails, category matches, suggestions, keyboard combobox navigation and no-results states.
- Additive catalog migration for featured products, SKU, compare-at prices, image provenance and product-scoped variant images. The foundation migration is unchanged.
- Existing v1 fields and collection-list API retained. New validated filters, collection detail, search and read-only cart resolver added; no public product mutations.
- Updated architecture, database, design-system, asset, test/setup and shopping-contract documentation.

## Database and environment

The supplied Neon connection remains only in ignored local .env; .env.example uses placeholders. A read-only inspection found an empty public schema before both checked-in migrations and the development seed were applied. No reset or destructive operation was used. The configured catalog now contains 13 public sample products, one archived sample, four featured products, four categories, three collections and three ring variants. No admin account was created.

Automated integration/browser tests used a separate local PostgreSQL 17.12 database (tiyas_stage03), not Neon. Temporary test records were removed/rolled back. Read-only Fastify smoke checks against Neon returned 200 for health, product list/detail, featured/category filters, collection detail and search.

## Verification - 20 November 2026

| Check | Result |
| --- | --- |
| TypeScript | PASS: API, web, shared contracts, tools and tests; next typegen refreshes route types |
| Lint | PASS: Next.js/TypeScript ESLint checks |
| Unit/API injection/storage tests | PASS: 25 tests in seven files |
| Real PostgreSQL integration tests | PASS: 12 tests in two files |
| API and frontend production builds | PASS |
| Production Playwright suite | PASS: 37 passed (2.1m); two duplicate tablet/mobile viewport sweeps intentionally skipped |
| Real shopping flows | PASS: browsing, URL filters/sort/pagination, search, variants, price/SKU/image changes, bag/wishlist persistence, quantity/removal/move and stale/unavailable selections |
| Trust boundaries | PASS: client prices rejected/discarded, server stock limits, variant-required/unavailable protection, current-price restore and product-scoped image FK |
| Product/collection not found | PASS: missing routes render not-found UI and return HTTP 404 |
| Responsive checks | PASS: 320, 390, 600, 834, 1024, 1280 and 1440px; no horizontal overflow or broken images in captures |
| Mobile/accessibility | PASS: filter dialogs, focus loop/Escape/return, touch gallery swipe, zoom and existing homepage/newsletter behavior |
| Manual visual review | PASS: desktop shop and mobile product/cart screens reviewed against the existing luxury system; homepage composition retained |
| Configured Neon catalog | PASS: migrations/seed applied after empty-schema inspection; read-only API smoke and counts verified |
| Docker/Nginx/ARM64 runtime | NOT RUN: Docker remains unavailable on this machine; live OCI deployment is Stage 06 |

## Screenshots

Under ignored output/playwright/:

- stage03-shop-desktop.png / stage03-shop-mobile.png
- stage03-product-desktop.png / stage03-product-mobile.png
- stage03-cart-desktop.png / stage03-cart-mobile.png
- stage03-wishlist-desktop.png / stage03-wishlist-mobile.png
- stage03-home-desktop.png / stage03-home-mobile.png
- stage03-shop-width-{320,390,600,834,1024,1280,1440}.png

The suite uses real local PostgreSQL/API responses for its normal paths; targeted request interception is limited to failure-path checks. The first browser runs exposed selector/waiting errors in the test harness (native select labels, Move-to-bag naming and refreshing before cart navigation completed). These were corrected; the final run exited successfully with all 37 active checks passing. Assertions wait for rendered UI signals, not global network idle.

## Scope and remaining items

Checkout and payment handling, order persistence/reservation and authenticated administration remain Stages 04-05. Cart resolution is read-only and is not an order or stock reservation. Stage 04 must revalidate prices/stock in its own transaction. Newsletter submission is still a truthful UI-only preview.

Actual product photography, confirmed materials/details, contact/social URLs and approved shipping/return/legal copy remain required; concept images are explicitly disclosed. See ASSETS.md. No new campaign imagery was needed in Stage 03.

The pg 8/Prisma adapter emits nonblocking query-queue and future SSL-mode notices; all current checks pass. The supplied connection settings were preserved, with no TLS verification bypass. Qualify future driver upgrades together. Historical Stage 01 database/container manifest checks and Stage 02 homepage checks remain documented in earlier work; this stage does not claim Docker or OCI runtime qualification.

See SHOPPING.md for HTTP contracts, storage/revalidation rules and isolated test setup. Rebuild normally with npm run build before production start after E2E, because the test API origin is compiled into rewrites. The final normal production build is restored after the suite. Stop after Stage 03.
