# Customer experience implementation

Implemented from [the approved plan](CUSTOMER_EXPERIENCE_IMPLEMENTATION_PLAN.md). This document describes application behavior and release requirements; it does not claim live SMTP, OCI, Razorpay, CDN or ARM64 qualification.

## Delivered behavior

- Product reviews: email-code verification, rating distribution, sorting, pagination, guest submission, draft-preserving retry and pending moderation. Only published product reviews contribute to product/card ratings.
- Store feedback: separate aggregate scope, CMS-curated homepage rail, truthful empty states and `/happy-customers` with feedback filters and paginated consented stories. Stories can link real catalog products. Empty homepage sections remain hidden.
- Administration: OWNER/ADMIN moderation and stories at `/admin/reviews`; coupon list/create/edit at `/admin/coupons`; CMS reel management on `/admin/content?tab=reels`. Existing sessions, CSRF checks, action overlay and responsive shell are reused. CONTENT_MANAGER can manage reels and select approved content but cannot moderate reviews or manage coupons.
- Checkout: mandatory normalized guest identity/address, coupon apply/remove/error feedback and authoritative backend totals. Order confirmations, receipts and admin totals retain persisted discount snapshots.
- Reels: CMS-managed Instagram Reel links and optimized posters. The shop-the-look dialog shows real catalog products and a Watch on Instagram link that opens in a new tab. Published entries require a valid Reel link, poster, rights confirmation, visual description or transcript, and at least one active product.
- Images: WebP master plus non-upscaled 160/320/480/640/960/1440/1920-width renditions, responsive source selection, ownership-scoped deduplication and reference-safe deletion. Original image URLs remain usable.

The schema uses one `CustomerReview` table with explicit PRODUCT/STORE subject keys rather than two otherwise identical review tables. Constraints, verification grants, queries and aggregates keep the subjects separate. Customer stories currently have one optional cover image each; anonymous media submission and automatic feedback invitation emails remain deferred.

Reel posters use the existing image storage adapter. The site stores only a canonical Instagram Reel link for playback. The browser opens Instagram after the customer selects **Watch on Instagram** in the shop-the-look dialog. Link validation checks the host and path. It does not check whether a particular reel is public or still available.

## Security and lifecycle

Review codes expire after ten minutes, permit five attempts and have a sixty-second resend cooldown plus request-rate limits. Submission grants are short-lived, subject-bound and single-use; identical successful retries are idempotent. Email verification proves control of an address, not a purchase. The purchase badge requires an accepted paid online order or a manually completed COD order. Public responses omit email, identity hashes, order associations and consent evidence. Rejected/unpublished feedback and stories are not resolved from stale CMS snapshots.

With background processing enabled, verification challenges expired for more than 24 hours are removed in bounded batches. Review/story retention and consent withdrawal require the owner's policy: unpublish first and remove references before deleting media. Customer portraits remain `no-store`. The mixed legacy upload route uses `private, no-store`. The opt-in CDN gateway serves content-hashed public product/CMS media with bounded browser and edge TTLs and publication revocation. See the [CDN activation runbook](CDN_ACTIVATION_RUNBOOK.md). No one-year immutable policy is applied to revocable content.

Public catalog, CMS and review responses keep the existing fresh reads so edits and unpublishing take effect on the next request. Shared response caching is deferred until publication and removal can invalidate it reliably.

Coupons use integer paise, percentage basis points and deterministic line allocation. Eligibility, dates, payment method, scopes and usage limits are rechecked under database locks with stock placement. Pending online attempts reserve usage; verified capture redeems once; failure/expiry releases it. COD redeems on accepted placement. Late capture after released reservations is marked paid but unaccepted and `needsReview`, without silently consuming stock or coupon capacity. Per-email limits are guest-email limits, not strong identity verification. Disabling new coupon application does not stop reconciliation of persisted discounted orders.

Uploads validate actual content and dimensions. The configured storage adapter holds images and reel posters. PostgreSQL stores reel links and catalog associations. Deduplication shares immutable bytes only within one uploader's ownership scope; separate asset records retain independent permissions. Deleting one reference cannot remove another asset's bytes. Simultaneous first uploads can still produce separate safe copies; maintenance reports these rather than merging ownership automatically.

## Configuration and rollout

1. Back up the target PostgreSQL database and verify the restore procedure before applying migrations. Confirm the target belongs to this store. Do not reset or seed a shared/store database.
2. Build shared contracts and generate Prisma: `npm.cmd run db:generate` and `npm.cmd run build:shared`.
3. Apply the additive migrations with `npm.cmd run db:migrate`. The new migrations are `20261122090000_customer_experience`, `20261122091000_image_deduplication` and `20261122092000_image_alias_guard`. They preserve existing products/orders and replace the old zero-discount-only money constraint.
4. Configure independent switches, initially false: `REVIEWS_ENABLED`, `HOMEPAGE_REVIEWS_ENABLED`, `COUPONS_ENABLED`, `REELS_ENABLED`. For reviews set a separate random `REVIEW_OTP_SECRET` of at least 32 characters and qualify the existing SMTP sender. Keep secrets in `.env`/secret storage; `.env.example` must contain placeholders only.
5. In **Content (CMS) ? Shop Our Reels**, paste a public Instagram Reel link, upload a poster, enter a description, tag products, confirm permission and publish. Preview the placement from the homepage editor. Link validation checks format. Verify public availability on Instagram before publishing.
6. Optionally set `SITE_PUBLIC_URL` to the real HTTPS storefront origin before building web. Without an approved origin, the sitemap is empty and no guessed production hostname is emitted. Existing preview `noindex` remains in place.
7. Approve actual coupon terms/tax/shipping policy, SMTP delivery, genuine feedback/consent and approved Instagram Reel links and posters before enabling each feature. No example reviews, discounts or reels are inserted into the store by migrations.
8. Older CMS snapshots receive empty-hidden review/reel section slots before newsletter when those kinds are absent. Explicitly disabled sections remain disabled. Normal CMS preview, draft/publish and curated record selection still apply; no automatic CMS publication occurs.

Rollback disables the relevant switch and retains new tables, discounted orders and immutable media. Do not deploy an older zero-discount-only checkout implementation over discounted orders. Original image paths remain the fallback if rendition generation is stopped. CDN activation is separate. See [CDN_ACTIVATION_RUNBOOK.md](CDN_ACTIVATION_RUNBOOK.md).

## API map

All JSON endpoints use `/api/v1` and shared Zod contracts.

| Endpoint                                                      | Behavior                                        |
| ------------------------------------------------------------- | ----------------------------------------------- |
| `GET /experience/settings`                                    | Independent public feature switches             |
| `POST /reviews/challenges`, `POST /reviews/challenges/verify` | Guest email code and subject-bound grant        |
| `GET/POST /products/:slug/reviews`                            | Published product feedback / pending submission |
| `GET/POST /store-reviews`                                     | Separate store feedback / pending submission    |
| `GET /customer-stories`                                       | Published consented stories, bounded pagination |
| `GET /reels`                                                  | Published, rights-confirmed reel records        |
| Existing checkout quote/place endpoints                       | Optional coupon context; server prices only     |
| `/admin/reviews`, `/admin/customer-stories`                   | Protected moderation and story management       |
| `/admin/coupons`                                              | Protected list, create and version-checked edit |
| `/admin/content/reels`                                        | Protected CMS reel list, creation and editing   |

Existing `/images/uploads/:uuid.webp?width=...` checks visibility before resolving a rendition; arbitrary transformations and remote URL ingestion are not supported.

## Media maintenance

`npm.cmd run media:images` reports missing renditions, duplicate source groups and aged unreferenced metadata without deleting anything. To backfill, use `npm.cmd run media:images -- --apply --confirm=HOST/DATABASE` only after checking the selected database and taking a backup. Processing is sequential in batches of 25, restartable and retains original masters. The confirmation is a hostname/database label, never a credential. The report does not authorize deletion. Automated aged-object deletion and retention-policy decisions remain deferred; OCI lifecycle policies must not age-delete the product prefix.

## Verification and release limits

The implementation is tested using an explicitly dedicated local PostgreSQL database, test SMTP transport, development payment adapter and local object storage. Browser fixtures use `@example.test` identities and are not real testimonials. Tests cover moderation/privacy/roles, OTP retries, money allocation, last-use coupon races, payment expiry/capture/idempotency, stock regressions, upload visibility, deduplication and deletion safeguards.

Set `E2E_DATABASE_URL` to a migrated and seeded local `tiyas_customer_experience_*` database, then run `npm.cmd run test:e2e:experience`. The runner starts temporary loopback servers and uses a test email transport, local image storage and test fixtures. Final check counts, screenshots and remaining qualifications are recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

Local measurements do not prove field Core Web Vitals or India-edge performance. Live SMTP delivery, OCI image delivery, real Razorpay qualification, ARM64 deployment, consent/retention policy, owner-approved coupon terms and CDN deployment remain explicit release dependencies.
