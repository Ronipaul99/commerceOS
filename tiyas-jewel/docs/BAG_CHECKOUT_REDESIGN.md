# Bag and checkout redesign

Implemented 21 November 2026 from the supplied **Tiyas Jewel Luxury Shopping Bag Page.png** and **Tiyas Jewel Secure Checkout.png** references in `Tiyas_Jewel_Desktop_Collection_Designs`.

## Presentation

- `/cart` now uses a cream and blush bag panel, product rows, burgundy summary/actions, removal selection, delivery-PIN disclosure, shopping information and live catalogue recommendations.
- `/checkout` uses matching address, delivery and payment panels with a separate order summary. Desktop keeps the summary beside the form; small screens show a single readable form and summary in sequence.
- `purchase-ui.tsx` shares progress navigation, shopping information and contact links. `purchase.css` scopes the new visual system to these screens.
- The approved existing logo, header/footer, DM Sans typography and standard product cards remain shared with the rest of the storefront. No removed announcement strip or category navigation was restored.
- Form labels, inline errors, first-invalid-field focus, native disclosures, accessible controls, visible focus and reduced-motion behavior remain available.

## Existing integrations

The storefront provider continues to own anonymous cart/wishlist persistence, identifier-only storage and API cart resolution. Product recommendations use the existing server-side catalog HTTP client and actual in-stock products. No frontend database access was added.

The delivery checker calls the existing checkout quote API. Its result is keyed to the current cart references and PIN, so changing either removes the old quote. Shipping, tax and payable totals are displayed only after the backend has supplied them.

Checkout retains shared Zod validation, server quotes, idempotency, private confirmation tokens and the existing online/COD placement flow. The summary's external submit button targets the actual guest checkout form. Payment notices continue to identify development simulation or unavailable online payments accurately.

No backend endpoint, payment adapter, database schema or environment configuration changed. A pre-existing shared test import was given its required `.js` extension so the NodeNext tools typecheck succeeds. Existing bag regression selectors now target the redesigned summary.

## Reference features requiring separate business support

The mockups contain saved address management, express shipping/estimated dates, coupons, order notes, customer accounts, specific phone/WhatsApp contacts and business guarantees. Those features or claims are not added by this visual task. Guest address entry, actual configured shipping/COD and existing information-page links are used instead. No offer, delivery estimate, certification or subscription success is invented.

## Decorative asset

`apps/web/public/images/purchase/ivory-silk-jasmine.webp` is a newly generated decorative background, not a product photograph. It uses ivory silk, jasmine and burgundy velvet at the edges with an empty centre, inspired by the supplied references. It contains no UI or text. Generated with the built-in image generation tool, then converted to a 1536 x 1024 WebP (99,350 bytes) with Sharp. The CSS fades the artwork into warm ivory; mobile uses a dedicated crop. Replace this file to supply approved brand photography without changing product data.

## Verification

- TypeScript: pass, including shared contracts, API, web and tool/test sources.
- ESLint: pass with no warnings.
- Vitest: 46 tests pass across 11 files.
- Live Chromium visual sweep: both pages pass at 320, 390, 600, 834, 1024, 1280, 1440 and 1920px with no horizontal overflow, broken images or page exceptions.
- Desktop 1440px and mobile 390px full-page captures were inspected, corrected and captured again. Corrections include intermediate-width progress overflow, the artwork fade, mobile address grouping, contact-link alignment and compact desktop fields.
- Thirteen focused browser interaction checks pass: wishlist/quantity persistence, catalog-backed subtotal, invalid/valid PIN, stale-quote removal, individual/selected removal, recommendation add-to-bag, empty bag, first-invalid-field focus, COD selection and reduced motion.
- Production browser regression: 46 passed with two intentional duplicate-responsive-check skips. The focused checkout suite passed again after the final summary-style isolation: nine passed across desktop, tablet and mobile. This includes development payment success/failure, COD and private confirmations; it does not qualify live Razorpay transactions.
- Repeated the eight-width visual sweep and reviewed all four final captures against the production preview. No page exceptions, broken images or overflow. Existing confirmation presentation is preserved through the optional purchase-summary layout.
- Tests used the dedicated local PostgreSQL database, never the configured store database. Cleanup verified 14 catalog products and zero orders, payments or admins; temporary preview/database processes are stopped. The normal production build is restored and API/upload rewrites point to port 4000. No environment files were changed.

Screenshots:

- `output/playwright/bag-redesign-1440.png`
- `output/playwright/bag-redesign-390.png`
- `output/playwright/checkout-redesign-1440.png`
- `output/playwright/checkout-redesign-390.png`

The final responsive check log is `output/verification/purchase-visual-checks.log`. Temporary browser scripts and test artifacts are under ignored `output/`.
