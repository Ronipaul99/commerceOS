# Customer experience, coupons, shoppable reels and media performance

Date: 22 November 2026  
Status: **Application implementation delivered; controlled activation and provider qualification remain required.** See [implementation and rollout notes](CUSTOMER_EXPERIENCE.md) and [current verification results](IMPLEMENTATION_STATUS.md). The starting-point observations and proposed design below are retained as the implementation brief.

## 1. Objective and boundaries

Extend the existing TIYAS JEWEL application with genuine customer feedback, safer checkout data entry, server-calculated coupons and a shoppable homepage reel gallery. Improve media delivery and storage efficiency alongside these additions.

Preserve the approved burgundy/ivory styling, DM Sans typography, current compact density, shared product cards, two-column mobile product listings, cart/wishlist behavior and existing payment/order architecture. Reuse the full-page translucent admin action loader, route skeletons, centered dialogs and existing CMS section preview.

Next.js continues to handle presentation and HTTP clients. Fastify owns validation, authorization, review publication, coupon eligibility, monetary calculations and database access. PostgreSQL stores structured records and references; OCI Object Storage stores media. Keep guest checkout and the simple NEW → COMPLETED operational workflow. No customer accounts, courier integration, new commerce platform or microservices are required.

## 2. Verified starting point

The following observations come from the current source, not a live database or provider audit.

| Area                     | Current implementation                                                                                                  | Required extension                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Checkout identity        | Shared `guestSchema` requires name, email and an Indian mobile number.                                                  | Improve field feedback and normalization; retain backend enforcement.                                                             |
| Checkout address         | `addressSchema` requires line 1, city, Indian state and six-digit PIN; country is IN. Line 2 and landmark are optional. | Add appropriate address consistency checks without claiming validation guarantees delivery.                                       |
| Discounts                | Order has `discountPaise`, but shared totals require literal zero and pricing always returns zero discount.             | Implement actual coupon rules, reservation/redemption and compatible response updates.                                            |
| Orders/payments          | Backend quotes, fingerprints, idempotent placement, stock reservations and private confirmation already exist.          | Integrate coupons into these paths; preserve payment verification and stock guarantees.                                           |
| Reviews                  | No review persistence model. Legacy homepage supports configured approved reviews, currently initialized empty.         | Add real submissions, moderation, aggregates and published homepage/CMS rendering.                                                |
| CMS                      | Draft/published snapshots, version checks, media references and private section-with-neighbours preview exist.          | Add reviews/reels section kinds and editors without replacing the CMS.                                                            |
| Email                    | SMTP adapter exists for admin RESET/INVITE OTPs.                                                                        | Add a separate customer review verification purpose/contract; qualify delivery. Existing SMTP configuration is not verified here. |
| Images                   | Backend validates and converts uploads to WebP at quality 88, fitting within 2400 × 2400.                               | Generate size-specific renditions and measure perceived quality.                                                                  |
| Uploaded image rendering | Shared responsive image component sets `unoptimized` for `/images/uploads/` sources.                                    | Supply pre-generated responsive sources; do not simply enable optimization for private images.                                    |
| Media access             | API checks product/public CMS/history references or an admin session before reading uploaded images.                    | Preserve this access boundary for derivatives, review media and posters.                                                   |

Relevant existing documentation: [Architecture](ARCHITECTURE.md), [Checkout](CHECKOUT.md), [Orders](ORDER_OUTCOMES.md), [Administration](ADMIN.md), [CMS](ADMIN_REDESIGN_CMS.md), [Admin content tools](ADMIN_CONTENT_TOOLS.md), [SMTP](SMTP_SETUP.md), [Product cards](PRODUCT_CARD.md) and [UI density](UI_DENSITY.md).

## 3. Customer reviews and ratings on product details

### Customer experience

Add a review summary beside the product title and a detailed Reviews section below specifications/care. Include a linked average score, published rating count, distribution from one to five stars, review list, newest/highest/lowest sorting, pagination and Write a Review.

- Compute aggregates from published product reviews only. Show a neutral “No reviews yet” state when empty; never manufacture a rating or use product-featured status as a bestseller claim.
- Reuse the same rating summary component wherever actual ratings appear, including the shared product card. Keep card dimensions consistent; no ratings block when there is no rating data.
- Review form: rating 1–5, optional title, review text, public display name, private email and publication consent. Explain that submissions require moderation. Proposed bounds: title 120 characters, text 20–3000, display name 2–80, email at most 254.
- Use accessible radio inputs for stars, keyboard controls, labeled errors, loading state and focus restoration. Preserve the review draft if submission fails.
- Submission success means “Submitted for review”, not “Published”. An email verification step confirms email control, not a purchase.

### Identity, eligibility and moderation

Use guest review verification through the existing SMTP transport with a new review-specific challenge service. Do not reuse admin session cookies, admin OTP records or password-reset purposes for customers.

1. Customer requests a review challenge using email and product ID. Return a generic response that does not reveal order history.
2. Send a short-lived code with a dedicated purpose, hashed server-side, bounded attempts, resend cooldown and per-IP/email rate limits. Initial proposed policy: ten-minute expiry, five attempts and a sixty-second resend cooldown.
3. Successful verification issues a short-lived, single-use submission grant bound to email, product and review purpose. Never return order addresses, phone numbers or an order list.
4. Backend checks for an accepted matching order item before applying **Verified purchase**. For COD, require manual COMPLETED status for this badge; an accepted but unfulfilled COD placement alone is insufficient. Neither badge nor COMPLETED claims courier-confirmed delivery.
5. Allow email-verified feedback without a matched purchase, clearly without the purchase badge. Enforce one review per verified email/product using a database uniqueness constraint; an update goes back through moderation.
6. OWNER/ADMIN can publish, reject or unpublish. Record actor, timestamp and internal reason. Moderate consistently regardless of rating; do not suppress genuine negative reviews merely because they are negative.
7. Public output contains approved display name, text, rating, date and badge only. No email, phone, order ID, verification grant or delivery address.

Initial release accepts text reviews. Customer-submitted photo/video uploads are deferred; approved customer images for the happy-customer page can be uploaded by an administrator after obtaining permission. This avoids creating an anonymous file-upload surface.

### Data and implementation

Create `ProductReview`: ID, product ID, normalized-email identity key, private email, public display name, title/text, rating, status, nullable qualifying order-item reference, verified-purchase flag, consent timestamp/version, created/updated/published timestamps, moderator and internal reason. Keep the purchase association internal and protect historical references.

Create a separate `ReviewChallenge`/submission-grant store for product and brand feedback: purpose, subject/product binding, hashed code/grant, expiry, attempt count and used timestamp. Product-review uniqueness uses normalized identity plus product; no uniqueness shortcut based on display name. Protect email/key material and apply a documented retention period to expired challenges.

Add database rating checks (`1 <= rating <= 5`), status checks, unique identity/product and indexes on `(productId, status, createdAt, id)`. Calculate average/count/distribution with backend queries over the same published scope; begin with aggregate queries, then add caching only when measured. Publication/unpublication invalidates affected summaries.

Proposed public contracts under `/api/v1`:

| Method and path                   | Purpose                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `GET /products/:slug/reviews`     | Validated paging/sort, published reviews and aggregate summary.              |
| `POST /reviews/challenges`        | Request product/brand-specific email verification without order enumeration. |
| `POST /reviews/challenges/verify` | Verify code and issue a bounded submission grant.                            |
| `POST /products/:slug/reviews`    | Consume grant and create/update a pending review idempotently.               |

Add `/admin/reviews` with product/store tabs and protected list/detail/moderation APIs. Use a filtered table, preview, confirmation and success/error feedback. Preserve public product APIs as read-only; review mutations belong to dedicated routes.

## 4. Overall store experience on the homepage

Store feedback is distinct from product feedback: it covers shopping, support, packaging and the overall Tiyas experience. A product rating must not silently become a store rating.

Create `StoreReview` with public display name, private verified email/identity key, text, optional overall rating, moderation state, consent, optional private order association and moderation timestamps. Allow one active store review per verified email initially; edits require moderation again.

Use the same customer verification and moderation primitives with a separate STORE purpose. Collect feedback after an accepted order or through a dedicated form on the happy-customer page. If sending invitations, reuse configured SMTP through a new customer-feedback method; do not send automatically until template, timing and recipient policy are approved.

- Homepage heading: **Our Customers Love Us**, configurable in CMS.
- Curate a bounded set of published store-review IDs in CMS; resolve those IDs server-side at render time. A stale CMS snapshot must not expose an unpublished review.
- Display real review text, approved public name, optional actual rating and consented portrait. No fictional people, placeholder five-star claims or invented “verified” labels.
- Use a lightweight scroll rail with keyboard buttons and touch scrolling. Hide the entire section if no eligible reviews exist.
- Link to `/happy-customers`; optionally link a referenced real product. Product/price/availability still come from the catalog API.
- Use the existing CMS preview with the section above and below. Do not add a second disconnected review source in homepage configuration.

## 5. Separate happy customers page

Add **`/happy-customers`** within the existing storefront layout, with title **Our Happy Customers** and restrained introductory copy. Add verified internal navigation/footer links through the existing CMS allowlist.

Build an editorial, paginated gallery combining published store feedback and consented customer stories. Provide optional filters for product/store feedback and star ratings where real rating data exists. Do not combine product and store aggregates into one rating.

Create `CustomerStory`: ID, title/caption, approved display name, optional linked published review, optional product references, consented image asset IDs, alt text, sort order and moderation/publication timestamps. Store evidence of permission and its scope privately. Publishing a story is separate from permission to display a customer's full name or photograph.

- Two columns on mobile where readable; use a balanced grid on larger screens. Text-only feedback remains valid when no photograph is available.
- Reuse shared review cards, pagination, empty/error states and responsive images. Do not crop a face or jewellery detail just to enforce a decorative layout.
- OWNER/ADMIN manage stories within `/admin/reviews`, avoiding another top-level operational module. CONTENT_MANAGER may select already approved records in CMS, but cannot approve customer identities/feedback.
- Public API: `GET /customer-stories` and `GET /store-reviews`, with validated paging/filtering and explicit public projections.
- Provide a removal/correction contact workflow and internal unpublish action. Document retention, image permission withdrawal and cache invalidation before production launch.
- Add page metadata/canonical URL and sitemap entry. Keep empty pages truthful. Product review structured data, if added, uses real product-specific published data only; do not advertise a store aggregate as a product rating.

## 6. Mandatory checkout name, phone and address

The backend already requires the core fields. Extend and test the existing shared schemas and checkout form rather than implementing parallel validation.

| Field                     | Planned rule                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full name                 | Required, trimmed, current 2–100 character bounds; reject control characters and whitespace-only input. Support Indian scripts, initials, spaces and legitimate punctuation; do not require a surname. |
| Email                     | Keep existing required validated email; normalize consistently without lowercasing or rewriting customer-visible name/address text.                                                                    |
| Indian mobile             | Required; normalize supported `+91`/spacing input into the existing ten-digit storage contract; validate ten digits beginning 6–9. Do not claim syntactic validity proves ownership.                   |
| Address line 1            | Required, current 5–160 character bounds; prompt for house/building and street/locality.                                                                                                               |
| Address line 2 / landmark | Optional; do not block customers who do not have these details.                                                                                                                                        |
| City                      | Required, current 2–80 character bounds; support Unicode text.                                                                                                                                         |
| State / country           | Valid Indian state/territory; country fixed to IN.                                                                                                                                                     |
| PIN                       | Required six digits with nonzero first digit; quote PIN and submitted address PIN must match. Apply existing serviceability rules.                                                                     |

Address correctness has two levels: mandatory syntax/completeness now, and PIN-to-city/state consistency when a maintained postal dataset or approved lookup service is supplied. A PIN can cover multiple localities; offer suggestions and allow an explicit correction instead of assuming one city label is definitive. Do not claim a complete address is deliverable solely because a regex passes. No courier/address provider is introduced without a separate decision.

Use visible required labels, `autocomplete`, appropriate mobile keyboards, field-specific messages and an error summary that focuses the first invalid field. Validate on submit and sensible blur points, not aggressively on every keystroke. Revalidate server-side before stock reservation/payment initiation and for direct API calls. Preserve entered details on recoverable errors and never log the full address or phone.

Customer phone OTP is outside this request; mandatory phone entry does not mean verified ownership. Payment must remain blocked for invalid customer/address data even if a frontend check is bypassed.

## 7. Checkout coupon code and authoritative pricing

### Shopper flow

Add a compact **Apply coupon** control in the checkout order summary, with Apply/Remove, loading state, actionable error message and applied-code label. Show merchandise subtotal, coupon discount, shipping, applicable tax and final total without fabricating offers.

Applying a coupon requests a new authoritative quote. Changing items, quantity, PIN or payment method invalidates relevant eligibility and triggers revalidation. An invalid code does not silently leave an old discounted total visible. Retain the user's address/payment selection when applying or removing a code.

Extend existing `POST /checkout/quote` and `/checkout/place` contracts with an optional normalized coupon code. Include payment method in quote context when a coupon restricts ONLINE/COD. No separate frontend discount calculation is authoritative. Place rechecks coupon rules, amounts, availability and quote fingerprint in the backend transaction.

Per-customer limits need the normalized checkout email. Request that context when applying such a coupon, and distinguish a provisional quote from confirmed eligibility when it is missing. Recheck against the final submitted customer email at placement; a browser-supplied identity key must never bypass usage limits.

### Initial coupon rules

Support one coupon per order, with fixed INR discount or percentage discount. Defer stacking, gift cards, referral systems and automatic loyalty rewards.

- Code: uppercase, trimmed, case-insensitive unique; proposed pattern `[A-Z0-9_-]{3,32}`.
- Type/value: fixed discount in integer paise, or percentage as integer basis points. A type-specific schema rejects irrelevant/ambiguous values.
- Optional minimum eligible merchandise subtotal, percentage discount cap, total usage limit and per-customer limit.
- Optional product/category/collection scope and allowed payment methods. Default is all eligible merchandise and both enabled payment methods.
- Starts/ends at UTC instants with IST labels/input in admin; enforce `startsAt < endsAt`, start-inclusive/end-exclusive.
- Active/archive state and internal description. Disable/archive instead of deleting a previously used coupon.
- Per-customer limits use the server-normalized checkout email. Explain that guest email limits reduce casual reuse but are not strong identity verification; no new customer account system is implied.

### Calculation order and snapshots

1. Resolve current product/variant prices and eligible line amounts from PostgreSQL.
2. Validate code status, date window, scope, payment method, minimum and remaining usage capacity.
3. Calculate discount using integer/BigInt-safe arithmetic and deterministic rounding; cap at eligible merchandise subtotal and any configured maximum. Never produce negative totals.
4. Proposed initial policy: minimum spend and free-shipping threshold use pre-discount merchandise subtotal. Record this policy explicitly and display it in coupon terms.
5. Allocate discount across eligible lines deterministically, distributing rounding remainders so line allocations exactly equal the order discount. Keep existing line amounts as pre-discount snapshots and add explicit discount/net fields; do not silently change existing field meaning.
6. Calculate inclusive/exclusive tax on discounted eligible amounts using the store's approved tax configuration. Final total is subtotal minus discount plus shipping plus exclusive tax; inclusive tax is reported within the discounted amount. Confirm tax/shipping treatment with the owner before enabling coupons; this plan supplies no new tax rate or tax-law assertion.
7. Fingerprint items, coupon ID/rule version, eligibility context and complete totals. A price/rule change requires a new quote; `expectedTotalPaise` remains a change detector, never a trusted input.
8. Snapshot code, rule version, discount allocations and totals on the order. Razorpay order amount and COD total use the same persisted server-calculated amount. Later coupon edits cannot rewrite historical orders.

Validate the configured gateway's supported payable range before accepting the quote. Reject coupons that produce an unsupported zero/below-minimum payable amount with a clear message. A separate free-order acceptance path is deferred; do not send zero-amount requests to a payment gateway or silently change the coupon amount.

### Concurrent limits and payment lifecycle

Create `Coupon` and `CouponRedemption` models. Redemption stores order ID, coupon ID, identity key, reserved/redeemed/released state, expiry, amount and timestamps. Enforce one redemption per order and add indexes for coupon/state/expiry and coupon/customer identity.

Use database row locks or equivalent transactional capacity checks for global and per-email limits. Lock in a consistent order with existing stock operations and retry bounded serialization conflicts. Quotes do not reserve capacity; placement does. Unlimited coupons must not require incrementing nullable limits incorrectly.

- Pending online payment: reserve coupon capacity with the stock reservation deadline.
- Verified accepted online payment or valid COD placement: redeem exactly once in the same acceptance transaction.
- Failed/expired attempt: release capacity idempotently through the existing maintenance/failure flow.
- Duplicate placement/callback/webhook: return the existing result; do not reserve/redeem twice. Include coupon context in the existing request hash.
- Late payment after release: reconcile against the original amount. Reacquire stock and coupon capacity atomically only if the original promotion can still be honored under the chosen policy. Otherwise retain the existing manual-review/unaccepted-payment behavior; never silently increase the amount, oversell or violate a usage cap.
- Disabling a coupon blocks new reservations. Existing reservations may redeem before their stored expiry; make this rule explicit in admin. No refund/cancellation pipeline is added.

### Compatibility requirement

`totalsSchema.discountPaise` currently accepts only zero, so nonzero responses will break old clients that validate them. Update shared schemas, cart/checkout/confirmation/order/admin views, receipt totals and payment tests together. Deploy additive database/API support with coupons disabled, deploy compatible clients, then enable coupon creation/application. Preserve zero-discount behavior and existing routes for orders without coupons.

## 8. Coupon creation in administration

Add `/admin/coupons`, `/admin/coupons/new` and `/admin/coupons/[id]/edit`. These screens are explicitly part of this new request; they are not an expansion into advanced analytics.

List columns: code, type/value, active/date status, validity, redeemed/reserved counts and Edit/Disable. Form fields match the rules above, with rupee inputs converted to paise, percentage converted to basis points, IST date controls, product/collection selection and an example calculation clearly marked as a preview.

- OWNER/ADMIN can create/edit/activate/archive. CONTENT_MANAGER cannot access coupon administration or APIs.
- Protected endpoints: `GET/POST /admin/coupons`, `GET/PATCH /admin/coupons/:id` and an archive action, all under `/api/v1` with existing session/CSRF protections.
- Apply version checks to edits; reject stale updates, invalid dates/limits and limits reduced below redeemed plus reserved capacity.
- Keep stable code/value rules for coupons with usage history; prefer cloning and disabling for materially different campaigns. Record editor and time without introducing an analytics system.
- Test against a private preview quote, never by placing a real payment/order. Use existing centered dialogs, notifications, skeletons and full-page action overlay.

## 9. Homepage: Shop Our Reels

Required heading: **Shop Our Reels**  
Requested subtitle: **Watch & shop the latest saree looks**

Keep both strings configurable. The supplied subtitle is preserved; confirm before publishing that reels feature saree styling with Tiyas jewellery. This does not add saree products to the catalog.

### Shopping and content management

Add a CMS `reels` section, proposed immediately before the story/review area and newsletter, with existing drag ordering available. Add a `reviews` section kind as well. Both sections use shared renderers in the actual homepage and private section-with-neighbours preview.

Each reel includes a public Instagram Reel URL, title, portrait poster, caption, visual description or transcript, display order and tagged catalog products. Use draft/published state, version checks and rights confirmation. Store ordered reel IDs and presentation copy in the CMS. Resolve published records at render time.

- Show a portrait swipe rail on mobile with keyboard-accessible controls on larger screens.
- Selecting a card opens the shop-the-look dialog with live catalog cards and a **Watch on Instagram** link. Instagram opens in a new tab. Escape dismisses the dialog and restores focus.
- Accept HTTPS Instagram `/reel/` URLs, strip share query parameters, and store the canonical link. Admins should check that the link is public and opens the intended reel. The storefront makes no Instagram request until the customer follows the link.
- OWNER, ADMIN and CONTENT_MANAGER can manage reels. Validate authorization, poster reference, tags, rights and description on the server. Reuse private CMS preview and the image upload pipeline for posters.
- Hide the rail when it has no eligible reels. Archived products are omitted from the shop-the-look dialog.

## 10. Media/page-load and storage optimization

### Image renditions and quality

Generate responsive derivatives once on upload, extending the existing Sharp WebP pipeline. Preserve a normalized high-quality master for PDP zoom and future renditions; keep legacy image URLs working during migration.

| Usage                         | Initial width targets                     | Delivery                                                                |
| ----------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Cart/search/review avatar     | 160, 320 px                               | Smallest appropriate source; lazy outside viewport.                     |
| Shared product card           | 320, 480, 640 px                          | Match rendered card width and device pixel ratio with accurate `sizes`. |
| Product gallery / zoom        | 960, 1440 px; master up to 2400 px        | Visible gallery first; master only on zoom intent.                      |
| Desktop campaign              | 1280, 1920, up to 2400 px                 | Prioritize first visible hero only.                                     |
| Mobile campaign / reel poster | Dedicated crop, typically 480–960 px wide | Respect actual aspect ratio and mobile focal point.                     |

These are starting profiles, not a requirement to generate every width for every asset. Do not upscale small sources. Different mobile crops require approved art direction; width resizing alone does not fix composition.

Add an `ImageRendition` relation (asset, profile/width, dimensions, format, bytes, object key, processing version) and a content hash on source metadata. Retain `ImageAsset` ownership and reference checks. Resolve a legacy source to its rendition manifest in the shared image infrastructure, avoiding database lookups in Next.js and avoiding arbitrary transformation URLs.

Keep WebP initially. Trial quality profiles against real jewellery: fine engraving, chains, stone edges, gold colour, silver textures and gradients at normal/retina/zoom sizes. Accept no visible quality degradation in reviewed examples; do not promise byte-identical results from lossy compression. Do not repeatedly recompress a derivative as a new master. Strip sensitive metadata and respect orientation.

Use dimensions/aspect ratios to prevent layout shifts, small placeholders/skeletons and appropriate `srcset`/`sizes`. Keep private image optimization behind authenticated server delivery; the default Next.js optimizer does not forward source authentication headers, so removing `unoptimized` globally is unsafe. [Next.js Image documentation](https://nextjs.org/docs/app/api-reference/components/image) covers responsive sizing and this authentication limitation.

### Delivery, caching and rendering

For the detailed provider, DNS/TLS, origin, cache-rule, purge and rollout procedure, see [CDN implementation guide](CDN_IMPLEMENTATION_GUIDE.md). That guide is a separate planned implementation; no CDN is deployed by either document.

- Measure a production build on mobile and desktop: transferred bytes, request counts, image dimensions, cold/warm cache and LCP/CLS/INP. Total repository media size is not page transfer size.
- Cache only published public media with versioned URLs/ETags and deliberate TTLs. Use private/no-store for admin, private order data and draft media. Do not cache authorized/private responses under a public cache key.
- Define unpublish/removal invalidation before choosing long TTLs. A one-year immutable cache is suitable only for assets intentionally safe to remain public that long; it is not the default for customer portraits or revocable content.
- Evaluate edge caching near Indian customers while retaining the configured OCI storage adapter. No region migration, public-bucket conversion or paid CDN is assumed by this plan.
- Render initial catalog/review content on the server where appropriate; fetch independent sections concurrently and stream slower sections. Keep review forms and reel shopping interactions as small client components.
- Give only the first hero suitable preload/high priority. Prepare the next carousel slide shortly before it is needed; preserve existing autoplay/pause and reduced-motion behavior. Fetch alternate product imagery on intent and zoom masters on demand.
- Cache public CMS/catalog/review summaries with documented publication/product invalidation and a fallback TTL. Never reuse those policies for checkout quotes, customer data or authenticated admin responses.
- Use locally optimized posters and direct Instagram Reel links. A skeleton improves perceived loading but does not reduce bytes by itself.

### Storage efficiency and safe cleanup

Responsive renditions may increase stored object count while reducing delivered bytes. Storage savings come from sensible masters, deduplication and safe orphan cleanup; do not promise a fixed percentage before measurement.

Deduplicate matching content within the correct authorization context. Do not reveal another user's private asset or share mutable ownership just because hashes match. Keep references for products, variants, order history, CMS drafts/published versions, review stories, reels, posters and renditions. Deleting one use must not remove a shared object.

Start cleanup with a dry-run report. Delete only unreferenced assets after an approved grace period, checking references again at execution time. Retain snapshots needed by existing orders. Clean interrupted uploads and obsolete derived versions separately. OCI lifecycle rules can handle narrowly scoped temporary/multipart data, but they do not understand application database references; never age-delete the entire product prefix. See [OCI lifecycle management](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usinglifecyclepolicies.htm).

Backfill existing assets in restartable, bounded batches with checkpoints and per-asset failure reporting. Keep the original delivery path until derivatives pass checks. Use IAM permissions restricted to required object operations/prefixes, with credentials only in the backend secret store.

## 11. Cross-cutting architecture and security

| Capability                                  | OWNER         | ADMIN         | CONTENT_MANAGER | Public customer           |
| ------------------------------------------- | ------------- | ------------- | --------------- | ------------------------- |
| Publish/reject reviews and customer stories | Yes           | Yes           | No              | No                        |
| Select approved feedback in CMS             | Yes           | Yes           | Yes             | No                        |
| Create/edit/disable coupons                 | Yes           | Yes           | No              | No                        |
| Upload/manage/publish reels in CMS          | Yes           | Yes           | Yes             | No                        |
| Submit feedback                             | Guest flow    | Guest flow    | Guest flow      | Verified-email grant      |
| Apply valid coupon                          | Checkout flow | Checkout flow | Checkout flow   | Server-validated checkout |

Enforce roles on every API, not just navigation. Reuse secure sessions, CSRF/origin checks and centralized safe errors. Rate-limit public challenge, submission and coupon-validation paths; cap pagination and query complexity. Log correlation IDs and operational error codes without review emails, address snapshots, codes, OTPs, signed URLs or order confirmation tokens.

Treat reviews/captions as plain text, escape output and reject unsafe links/HTML. Publish only explicit public projections. Encrypt transport, restrict private records and document retention/deletion with the owner before release. Personal-data policy/legal wording requires separate business approval; do not invent compliance claims.

Do not introduce stored promotional/customer records through hardcoded homepage arrays. All published reviews are genuine submissions, all promotion terms are actual configuration and all reel shopping data comes from real catalog records. Test fixtures stay out of production.

## 12. Suggested code map

Existing paths below are integration points. New module/file names are proposals.

| Layer               | Existing files to extend / proposed additions                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared contracts    | Extend `packages/shared/src/schemas/checkout.ts` and `content.ts`; add `reviews.ts`, `coupons.ts`, `reels.ts` and rendition contracts. Export through existing shared package.       |
| Database            | Add reviewed migrations in `prisma/migrations`; extend `prisma/schema.prisma` with review/challenge/story/coupon/redemption/reel/rendition models.                                   |
| Checkout            | Extend `apps/api/src/modules/checkout/{pricing,service,routes}.ts`; preserve current reservation/payment lifecycle and private order access.                                         |
| New backend domains | `apps/api/src/modules/reviews`, `coupons`, `reels`; register through the existing Fastify application.                                                                               |
| Media/email         | Extend `apps/api/src/integrations/image-storage.ts`; reuse the image pipeline for reel posters and add a customer-feedback email adapter alongside `admin-email.ts`.                         |
| Admin APIs/CMS      | Extend `apps/api/src/modules/admin/routes.ts`, `content.ts` and authorization conventions; add independently protected moderation/coupon/reel routes.                                |
| Product UI          | Extend `apps/web/src/features/shopping/product-detail.tsx`; add reusable review form/list/summary components; preserve `components/storefront/product-card.tsx`.                     |
| Checkout UI         | Extend `apps/web/src/features/checkout/checkout-page.tsx`, `order-summary.tsx` and all order/receipt total presentations.                                                            |
| Homepage/CMS        | Extend `apps/web/src/features/home/content-homepage.tsx`, homepage fallback configuration and `features/admin/content-editor.tsx`; share review/reel renderers and existing preview. |
| Happy customers     | Add `/happy-customers` under the existing storefront route group; extend validated navigation links and metadata/sitemap handling.                                                   |
| Media UI            | Extend `apps/web/src/components/ui/responsive-image.tsx`; retain safe private media handling and update consumers consistently.                                                      |
| Admin UI            | Add review moderation and coupon screens under the existing admin layout; reuse shared forms, dialogs, loaders, notifications and role-aware navigation.                             |

## 13. Implementation sequence and release gates

| Phase                                       | Deliverables                                                                                                                                  | Gate before continuing                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Baseline and contract design            | Record checkout/review/media baseline, freeze existing visual snapshots, confirm coupon policies, document data/privacy and feature switches. | Existing checks pass; dedicated integration DB selected; no live reset/seed.                                                                 |
| B — Mandatory checkout fields               | Improve existing shared normalization/errors, backend bypass protection and mobile form behavior.                                             | Direct invalid API requests fail; valid Indian names/addresses remain usable; payment regressions pass.                                      |
| C — Image delivery foundation               | Rendition model/pipeline, access-safe manifests, cache policy, restartable backfill and quality samples.                                      | Old image URLs work; private assets stay private; mobile/desktop quality comparison and byte measurements recorded.                          |
| D — Reviews and happy customers             | Review models, email verification, moderation, PDP section, homepage CMS reviews and `/happy-customers`.                                      | SMTP delivery qualified; genuine consented records available; aggregate/moderation/privacy tests pass. Empty sections otherwise stay hidden. |
| E — Coupons                                 | Coupon administration, shared totals changes, quote/place integration and transactional usage lifecycle.                                      | Isolated concurrency/payment tests pass; all clients accept nonzero discounts; owner approves terms/tax/shipping policy before activation.   |
| F — Reels                                   | Instagram URL validation, CMS editor/preview, poster rail and real product tags.                                                         | Rights and accessible descriptions recorded, Instagram links verified, and tags resolve through the catalog.                  |
| G — Integrated QA and controlled enablement | Responsive screenshots, keyboard review, performance comparison, rollback notes and final status update.                                      | Every acceptance item below has evidence; unresolved provider/business dependencies are stated explicitly.                                   |

Use independent feature switches for public review submission, homepage review display, coupon application and reels. Additive migrations run before feature enablement. Database backups and restore instructions precede deployment; do not delete existing orders, products, CMS or admin sessions.

Rollback disables the new feature and keeps historical reviews/coupon snapshots/orders readable. Existing discounted pending attempts must still reconcile using their persisted totals/redemptions even when new coupon application is disabled; do not roll back to a zero-discount-only server/client while those orders exist. Media rollback retains original URLs/objects and stops backfill instead of deleting assets.

## 14. Test plan and acceptance evidence

### Automated checks

- Shared unit tests: review schemas, stars/rounding/aggregate scope, public projections, email/phone normalization, address requirements, code normalization, dates, eligibility, deterministic discount allocation and zero/negative/maximum boundaries.
- Isolated PostgreSQL integration: review uniqueness/moderation/identity grants; coupon last-use races, per-email races, transactional stock plus discount, expiry/release, duplicate placement/webhooks, late capture and rollback; published/draft asset access and deletion safeguards.
- API security: unauthenticated/incorrect-role moderation/coupon/CMS mutations rejected; CSRF/rate limits; expired/replayed review grants; order enumeration; HTML injection; non-Instagram URLs, spoofed hosts and invalid image uploads.
- Playwright: review submission/OTP states using a test mail transport, moderation-to-PDP/homepage visibility, happy-customer filters/paging, coupon apply/remove/errors, changed cart/PIN/payment eligibility, checkout required-field bypass, real product tagging/variant/cart/wishlist behavior and CMS neighbour preview.
- Regression: no-coupon ONLINE/COD checkout, failed/retried payments, confirmation/receipt/admin totals, shared product card sizes, hero autoplay, existing admin authorization and centered full-page action overlay.
- Accessibility: keyboard review stars, error summary, screen-reader labels, dialog focus/Escape, carousel controls, accessible reel links, contrast, reduced motion and touch targets.
- Media: verify dimensions/content, WebP output and rendition fallback, private caching, reference-safe deduplication, deferred Instagram navigation and single-slide hero preload.

When implementing, use existing scripts such as `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run test:integration`, `npm.cmd run test:e2e` and relevant builds. Integration/E2E runs must use explicitly isolated data and test mail/payment transports. Real SMTP, OCI and Razorpay qualification are separate checks; a mock passing does not prove a provider works.

### Visual and performance checks

Capture and inspect PDP, checkout, happy-customer page, homepage reviews/reels and new admin screens at 390 px and 1440 px. Check layout at 320, 375, 430, 768, 1024 and 1920 px too. Verify no page overflow, clipped cards/text, stretched images, blocked controls or playback overlays trapped offscreen.

Record a repeatable production-build benchmark before and after with the same content/device/network profile. Proposed goals: LCP at most 2.5 seconds, CLS at most 0.1 and field INP at most 200 ms at the 75th percentile when enough real traffic exists. Lab results are diagnostics, not proof of field INP. Treat targets as goals to validate, not achieved claims. Document per-page transferred media bytes, cache hit behavior, responsive source selection and any third-party requests before navigation. Performance wins must preserve reviewed image quality and shopping responsiveness.

### Feature completion checklist

- [ ] PDP shows genuine published reviews, rating distribution and accessible guest submission.
- [ ] Only qualifying purchases get the correct badge; no customer private data is exposed.
- [ ] Homepage displays curated approved store feedback and hides itself when empty.
- [ ] `/happy-customers` works with real permissioned content, paging and existing storefront navigation.
- [ ] Name, Indian phone and core address are mandatory on both frontend and backend.
- [ ] Coupon administration is protected; codes apply/remove with accurate backend-calculated totals.
- [ ] Coupon usage cannot exceed limits under concurrency or duplicate payment notifications.
- [ ] Existing payment/stock/order/receipt flows remain correct with and without coupons.
- [ ] Shop Our Reels is CMS-managed, accessible, product-linked and efficient on mobile.
- [ ] Images remain visually crisp with appropriate derivatives and safe access/cache policies.
- [ ] Screenshots, quality comparisons, tests and provider qualification results are recorded.
- [ ] Implementation documentation distinguishes completed work from deferred dependencies.

## 15. Inputs to confirm before production enablement

Implementation can begin with the proposed defaults; these dependencies must be resolved before publishing or activating the affected feature:

1. Approved real customer feedback, display names, photography permissions and a removal contact workflow. No fictional seed testimonials in the live store.
2. Verified SMTP sender/delivery and customer verification/review-request wording; customer review challenges remain separate from admin OTP flows.
3. Actual coupon values, scopes, validity, limits and owner-approved shipping/tax treatment. No invented discount banner or always-valid example code.
4. Public Instagram Reel links with permission to feature them, tagged products, posters and descriptions and confirmation of the requested saree-styling subtitle.
5. Whether a maintained PIN consistency dataset is available. Without one, promise mandatory completeness and syntax validation only.
6. Approved privacy/consent/retention wording, media cache removal policy and the cleanup grace period.
7. Measured OCI delivery behavior, any CDN decision and ARM64 processing qualification. No infrastructure purchase or public bucket exposure is authorized by this plan.

## 16. Original documentation-only verification (historical)

The original plan-only change created this document and linked it from implementation status without changing application behavior. The subsequent implementation is documented in [CUSTOMER_EXPERIENCE.md](CUSTOMER_EXPERIENCE.md). Its test evidence, migrations, screenshots and outstanding live-provider/business qualification are tracked in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md); the checklist above remains a release checklist, not a claim that live content or infrastructure is enabled.
