# Payment failure and order confirmation

Updated 21 November 2026. Implements the supplied `Elegant Payment Failed Jewellery Page.png` and `Luxury Jewellery Order Confirmation Page.png` references inside the existing storefront.

## Routes and visual design

Confirmation follow-up (21 November): the accepted heading and tick are green, the hero/panels/status/actions have tighter spacing, and the delivery address/contact block uses compact desktop columns. WhatsApp and mail icons appear in the confirmation help panel. Contacts deliberately remain "Contact coming soon" placeholders linking to `/info/contact` until approved details are set in `homepageConfig.orderSupport`. Payment-failed and pending/review semantics are preserved. Three-item comparison captures reduced total height by 215px at 1440px and 254px at 390px; shared product cards retain their existing dimensions.

Follow-up validation: TypeScript, ESLint, both production builds, 49 unit tests and all nine existing checkout browser tests pass. Production review at eight widths (320/390/600/834/1024/1280/1440/1920px) found no overflow, broken images, clipped/partial cards or page exceptions. Both placeholder help links were exercised and review-required orders retained non-success styling. Final screenshots `output/playwright/confirmation-density-1440.png` and `confirmation-density-390.png` were visually inspected; evidence is in `output/verification/confirmation-density-*.log`. Temporary review services are stopped, isolated data is clean and the normal 3000/4000 preview remains healthy.

- `/payment-failed#<private-token>`: illustrated failed card, burgundy retry, alternative-method action, payment-status check, bag link, actual item snapshots/totals and verified help destinations.
- `/order-confirmation#<private-token>`: layered seal, stored order/date/payment/amount details, delivery snapshot, ordered products, horizontal desktop totals strip, manual fulfillment status, receipt download and actual catalogue recommendations.
- Pending payment, unaccepted payment review, invalid token, loading and recoverable errors share the purchase presentation. Pending/review cases do not display an accepted-order checkmark or offer receipts.
- Approved logo/header/footer, DM Sans, 80% density and identical ProductCard dimensions are preserved. Mobile uses a deliberate single-column order composition and complete-card recommendation rail. Ivory silk/jasmine artwork is reused with mirrored failure-page edges. Reference screenshots are never whole-page backgrounds.
- The card illustration and seal use lightweight CSS/Lucide compositions. No animation library or automatic animation was added.

## Recovery and privacy

Order data still comes from Fastify's token-gated `POST /api/v1/orders/confirmation`. Wrong outcome routes normalize to the authoritative accepted/payment/review state. The access token stays in the fragment and JSON request body; both routes are no-index/no-referrer. No predictable public order lookup is introduced.

Retry reconciles first. Paid, pending and review-required attempts return to their existing private confirmation. A definitive failure opens `/checkout#retry=<token>`; choosing another method also focuses the payment panel. Checkout reconciles again, restores product/variant identifiers and quantities through the backend cart resolver, pre-fills the address/contact snapshot in memory and requires approval of a fresh quote before placement. Other bag selections are preserved. No client prices or personal details are copied into persistent browser storage. A new idempotency key is generated only for the explicitly requested fresh checkout after failure. A reconciliation outage blocks advancement rather than creating another payment attempt.

Accepted purchases retain exactly-once bag completion. Recommendation controls reuse the shared favourites, Quick View and verified bag services. Order status can be refreshed. Razorpay pending/failed attempts retain bounded periodic reconciliation while the page is visible.

## Backend dates

The compatible response extension adds optional `createdAt` and nullable optional `completedAt` to `OrderView`. Fastify serializes existing PostgreSQL fields; no schema migration is required. UI dates explicitly use Asia/Kolkata.

Verification exposed that the installed Prisma pg adapter normalizes returned `timestamptz` offsets to UTC without converting a non-UTC session value. Connections now explicitly set the PostgreSQL session timezone to UTC before decoding. Stored records remain unchanged. Integration coverage verifies the session setting and compares the public ISO date with the database epoch.

## Reference features with real-state limits

- Fulfillment stays **NEW → COMPLETED**. The presentation shows confirmation, with-store and manual completion. It does not invent shipping/delivery milestones, tracking or expected dates.
- COD shows **Pay on delivery**. Development payments show **No money collected**. Browser tests use the development adapter, not live Razorpay transactions.
- The failed message does not promise a bank debit did not happen. Existing server verification/reconciliation remains authoritative, following [Razorpay's integration guidance](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).
- Reference phone/WhatsApp/support hours, discounts and ratings are not fabricated. Existing contact/delivery pages are linked; an approved configured contact is supported.
- Accepted delivery snapshots are immutable; there is no nonfunctional Change Address control.
- **Download order receipt** creates an escaped, self-contained HTML order record with snapshot line prices, totals, address, date and truthful payment wording. It has no access token or external scripts/assets and can be printed/saved as PDF after opening. It is labelled **Not a tax invoice**; GST/merchant invoice information is not invented.

## Components

Rebuilt `confirmation-page.tsx`; added `payment-failed-page.tsx`, `order-presentation.tsx`, `use-private-order.ts`, `/payment-failed` and `order-result.css`. Extended checkout recovery and provider cart restoration; reused OrderSummary, ProductCard, ProductRail and the catalogue/payment APIs. Added escaped receipt generation/tests and expanded the existing checkout browser suite.

## Validation evidence

- TypeScript/ESLint pass; 49 unit tests and 42 database integration tests pass. The final database run includes UTC/epoch verification.
- Final full production regression after reference/timezone corrections: **73 passed / eight intentional duplicate-responsive skips** (5.1 minutes). The earlier focused checkout suite also passed all nine cases across desktop/tablet/mobile.
- Responsive review: 41 checks across 320/390/600/834/1024/1280/1440/1920px, covering failed/paid/COD/pending/invalid links plus review-required state. No horizontal overflow, clipped card bodies, partial visible card frames, unnamed visible buttons or page exceptions in checked states. An offscreen recommendation image containing-block defect was fixed and the sweep repeated successfully.
- Nine additional interactions cover wrong-route redirects, retry blocked by reconciliation errors, status/refresh, recommendation favourites/bag, receipt download and unknown-token privacy. A completed fixture displays its persisted completion timestamp.
- Desktop/mobile captures: `output/playwright/order-outcomes-{failed,paid,cod,pending}-{1440,390}.png`; review case: `order-outcomes-review-390.png`. Final production images were visually inspected against the supplied references after the last build. Intentional differences are the approved global font/header/scale, actual catalogue images and supported business states described above.

Final cleanup removed all four visual-review orders and restored their stock. The isolated test database retains 14 products and zero orders/payments/admins; temporary review browser/API/web/PostgreSQL processes are stopped.

Logs: `output/verification/order-outcomes-*.log`. All fixture mutations use the dedicated local test database on port 5433. The configured store database is not reset, seeded or populated with review orders.
