# Favourites page refresh

Updated 21 November 2026 to match the approved bag, checkout and collection presentation.

## Presentation

- `/wishlist` uses the shared warm ivory/blush purchase background, burgundy heading/actions, breadcrumb and saved-item count.
- A compact toolbar offers saved order, ascending/descending price sorting and the existing bag link. Sorting uses current API product prices and does not change stored favourite order.
- Saved products retain the shared ProductCard, Quick View, colour/variant availability controls and Move to Bag behavior. Card dimensions and the 80% site density are unchanged. Mobile keeps two columns.
- The empty state combines a clear shopping action with existing campaign photography, explicitly labelled as inspiration. No campaign imagery is substituted for catalog products.
- Matching route/client loading skeletons, recoverable errors, missing-product cleanup, device-persistence copy and collection/new-arrival links complete the screen.
- Page metadata now identifies Your favourites and retains the preview's no-index behavior.

## Existing behavior preserved

The storefront provider continues to persist product identifiers locally and resolve cart prices/availability with Fastify. The page reads saved products through the existing `GET /api/v1/products?ids=...` API. The shared card removes a favourite only after a successful Move to Bag action. Missing products remain visible as a recoverable notice until removed; API failures retain all stored favourites.

Retry now returns to the loading state before fetching again. This is the only change to the existing request-state behavior. No backend endpoint, database schema, environment configuration, customer account or payment code changed.

## Verification

- TypeScript, ESLint and 46 existing unit tests pass.
- Live browser measurements pass at 320, 390, 430, 768, 834, 1024, 1440 and 1920px. Mobile remains two columns, card heights remain 320 rendered pixels, and no horizontal overflow occurs.
- Thirteen targeted browser checks pass: two-column layout, shared dimensions, saved persistence, both price sorts, Quick View/Escape, Move to Bag/persistence, removal/persistence, missing-product cleanup, API-error data retention, loading on retry, successful retry, bag navigation and empty-state shopping navigation. No page exceptions or broken images in reviewed captures; no orders created.
- Both production builds pass. All six existing favourites/shared-card production browser tests pass across desktop/tablet/mobile, including saved-state persistence, variant availability, Quick View, Move to Bag and identical card dimensions.
- Desktop and mobile saved/empty screenshots were visually reviewed. The page imports the same `components/storefront/product-card.tsx` used by homepage, shop, collections and related products; wishlist CSS changes the surrounding layout, not the shared card skin or dimensions. The established wishlist-mode action is Move to Bag.

Screenshots:

- `output/playwright/favourites-saved-1440.png`
- `output/playwright/favourites-saved-390.png`
- `output/playwright/favourites-empty-1440.png`
- `output/playwright/favourites-empty-390.png`
- `output/playwright/favourites-error-390.png`

The targeted browser script and evidence are under ignored `output/verification/review-favourites.js` and `favourites-review.log`. Validation uses the dedicated local PostgreSQL catalog rather than the configured store database.

Final production captures were reviewed without development overlays; all six saved cards measured 208 x 320px at 1440px and 132 x 320px at 390px. The production capture log is `output/verification/favourites-final-captures.log`. Temporary services are stopped and the normal production build/API rewrites are restored. Cleanup verified 14 local test products and zero orders, payments or admins.
