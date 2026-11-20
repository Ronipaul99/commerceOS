# Stage 05 verification - 20 November 2026

Stage 05 is implemented in the existing Next.js/Fastify application. The approved storefront, latest header removal, catalog HTTP contracts, cart/wishlist and guest checkout/payment flows are preserved. No Stage 06 deployment or additional administration modules are included.

## Checks

| Check | Observed result |
| --- | --- |
| Prisma client generation | PASS |
| Migrations | All four applied successfully to a new, explicitly selected local Stage 05 database |
| Migration/schema consistency | PASS: `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` reports no difference |
| TypeScript, lint | PASS; repeated after final changes |
| Unit tests | PASS: 38 in nine files, including local storage, OCI command boundary, secret-safe configuration and admin contracts |
| Database integration | PASS: 42 in four files (13 admin checks plus 29 existing checks), 36.17 seconds |
| Full production browser regression | PASS: 63 passed / six intentional duplicate-width/link-audit skips, 4.5 minutes |
| Final focused admin browser rerun | PASS: three projects, 39.4 seconds, after form alignment and narrow order-heading refinements |
| Frontend/backend production builds | PASS in browser runner; normal upstream build restored after verification |
| Initial admin script | PASS: random local owner created with hashed password; duplicate email refused without changing credentials; temporary account removed |
| Visual inspection | Desktop 1440px, tablet 834px and mobile 390px reviewed; product/order screens also checked at 320px |
| Test cleanup | Confirmed: 14 seeded products / 13 active; zero admin users, sessions, uploaded image metadata or orders left in the dedicated test database |

The six skips are existing duplicate viewport/link audits on non-desktop projects; admin workflows have no skips. The complete storefront/checkout regression ran before admin projects, preventing temporary admin-created products from altering pagination expectations. The final focused rerun follows the same production build path and re-exercises the owner workflow after visual corrections.

## Verified behavior

- All protected admin endpoints reject anonymous calls before processing request/file bodies. No public registration is introduced.
- Login uses generic failure messages, revocable hashed sessions, expiry, active-admin checks and a bounded login rate. Production cookies were verified to have Secure/HttpOnly/SameSite=Strict, a host-only name/path and no Domain attribute.
- Missing CSRF tokens and foreign origins are rejected. Logout and subsequent login invalidate old tokens. No frontend-only authorization is relied upon.
- Products can be searched/category-filtered, created, edited, archived and safely deleted when unused. Storefront responses reflect persisted changes; inactive products disappear.
- Invalid money, comparison prices, duplicate identifiers, foreign image URLs and stale product/variant stock edits are rejected.
- Actual image bytes, file limits and decoded dimensions are validated. Spoofed filenames/content types do not choose the object key or decoder policy. Supported content is re-encoded as WebP.
- Multiple images upload, preview, reorder and replace in the browser. Backend checks cover removal, variant image association, unattached-image privacy and safe object deletion. Historical image snapshots remain readable and protected from deletion after detachment.
- Products and variants referenced by orders cannot be destructively deleted. Deactivating all variants does not expose base stock as purchasable stock.
- Pending/failed/unaccepted payments are excluded from actionable lists, counts and detail/completion endpoints. ALL orders sorts NEW before COMPLETED; default view excludes completed orders.
- Accepted COD orders show customer phone/email/address, line-item snapshots and precise backend totals. Concurrent/repeated completion preserves completedAt and updates counts once. Completion does not change payment state or imply courier delivery.
- Browser checks cover owner login/logout, product creation/edit, two-image upload/reorder/replacement, variant imagery, public catalog availability, order detail/completion, dashboard refresh, archive/delete safeguards and unused-product deletion. No uncaught page errors were collected.
- Keyboard skip links work, native confirmation dialogs support cancel/confirmation and controls remain readable without page overflow or broken images at the recorded viewports.

## Screenshots

All screenshots are local ignored verification artifacts under `output/playwright/`. They use temporary test merchandise/customer details, not production records.

- `admin-desktop-login.png`, `admin-desktop-dashboard.png`, `admin-desktop-products.png`, `admin-desktop-product-edit.png`, `admin-desktop-order.png`.
- Matching `admin-tablet-*` and `admin-mobile-*` captures.
- `admin-mobile-product-edit-320.png` and `admin-mobile-order-320.png`.
- Existing storefront/homepage/checkout screenshots are regenerated by the full regression suite.

Final captures were inspected after correcting field alignment, long order-number typography and full-page focus/scroll capture behavior. No design changes to the storefront were required.

## Limits and handoff

The configured remote database was not migrated, reset or seeded, and no real owner account was created. Apply `npm run db:migrate` to the reviewed target database and provision the owner explicitly with `npm run admin:create`; see ADMIN.md.

Final local database shutdown was not executed: automatic approval review could not complete because its service hit a usage limit. This was a review-service failure, not an unsafe-action determination. The isolated PostgreSQL server started for tests remains on loopback port 5433; fixture records have been cleaned. No alternate stop mechanism was attempted. To finish this cleanup manually from the project root, run:

```powershell
& .\output\verification\package\native\bin\pg_ctl.exe -D output/verification/pg-data -m fast -w stop
```

OCI commands/configuration are implemented and unit-tested through the storage adapter; a real OCI bucket, IAM credentials and production TLS were not available or exercised. Docker Compose, live Nginx/TLS and Linux ARM64 runtime were not run in this environment. The lockfile contains Linux ARM64 Sharp packages, but that is not runtime qualification. These external deployment checks belong to Stage 06.

Cleanup resolved during the collection listing update: fixture counts were rechecked (14 products, 13 active; zero admins, sessions, uploaded assets or orders), and the exact pg_ctl command above returned "server stopped". The normal web production build was restored afterward. The preceding review-service delay is historical; the owned PostgreSQL test process no longer remains running.

Observed non-failing Node/pg warnings about queued client queries remain in existing transaction paths; current dependency checks and all suites pass. Revisit those paths before a future pg major-version upgrade. No performance score, live deployment or production Razorpay qualification is claimed.

Abandoned browser uploads may remain unattached until reviewed cleanup; preserve product/order references when setting retention policy. Actual product photography and taxonomy assignments remain owner data, not invented admin fixtures.
