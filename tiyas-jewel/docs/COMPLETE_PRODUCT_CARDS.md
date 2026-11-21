# Complete product facts and compact shared cards

The storefront now reads optional `Product.details` JSON through the shared `productDetailsSchema`. Fastify owns the data and admin mutations. Fields are subtitle, material, positive weight in grams, size and up to twelve named six-digit-hex colour swatches. Ratings and bestseller claims are not accepted in this field. Existing API consumers may omit details; existing products retain null until edited. Missing facts stay hidden.

The additive migration `20261121000500_product_details` adds nullable JSONB plus an object-type constraint. The admin product form edits the same validated fields. Existing optimistic form-version checks still protect concurrent product/stock edits; older clients omitting details preserve them. PDP specifications, Quick View and every shared card read the persisted values.

## Supplied Kundan product

The user requested the complete approved card and agreed to adding the supplied product. `apps/api/src/scripts/add-approved-kundan.ts` adds only `premium-kundan-choker-set` and its Premium Kundan association, refusing to overwrite an existing product. It saves the supplied name/subtitle, Brass with Kundan, approximate 78g, adjustable 14–16in, Green/Ruby Red/Pearl White/Navy Blue, ₹7,490 and ₹8,999 compare-at. Stock remains zero because no quantity was supplied. No actual review count, rating, sales ranking or Bestseller claim is invented.

The two product images use existing Kundan campaign concept art and remain marked `concept: true`. Actual merchandise photography is still required. Informational colour swatches are not fake purchasable variants; add real stock/variants in admin when confirmed.

Run after review of the target database and applying migrations:

```powershell
npm.cmd run build:api
node apps/api/dist/scripts/add-approved-kundan.js
```

The script uses the configured backend database and has an advisory transaction lock for repeated invocations. It does not seed/reset the catalog or modify credentials.

## Common dimensions

All nine reference pages were compared together; their list cards are compact. Desktop cards are now 260 × 400 CSS pixels in homepage rails, all collection/shop grids, wishlist and PDP recommendations. At widths below 768px, two cards per row use `(viewport width - 60px) / 2`, with the same 400px height. At 390px this is 165 × 400. Image height is 132px desktop, 110px mobile and 96px below 360px, independent of optional facts. Grid columns adapt to the common width instead of stretching cards. Both buttons stay visible at the foot of the frame. List mode uses the same card size. Quick View remains a separate, scrollable full-detail dialog.

Long product descriptions are clamped, full copy remains on the product page/Quick View. Legacy products without details retain the same size. Missing data is not duplicated onto unrelated products. Compact metadata uses two columns on desktop and a narrow-screen composition within each card. Future long facts should be checked for clipping before publishing.

See IMPLEMENTATION_STATUS.md for executed migration, persistence, browser and visual checks.


Verification: 46 unit and 42 database integration checks pass, along with TypeScript/lint and both production builds. Browser coverage includes 68 initial passes, then a five-check rerun covering two image-capture failures and all three admin projects; the final standalone production mobile admin rerun also passes. The complete configured-catalog product was measured across homepage/shop/Premium Kundan/wishlist at desktop and narrow mobile widths with no clipped facts or page overflow. Normal build rewrites and test-process cleanup were restored. See IMPLEMENTATION_STATUS.md for the complete attempt history.
