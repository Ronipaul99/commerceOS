# Stage 05: store administration

The existing Next.js app now has exactly seven admin screens: `/admin/login`, `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`, `/admin/orders` and `/admin/orders/[id]`. No customer accounts, public registration, analytics, courier, refund or warehouse modules are introduced. Storefront presentation and guest payment/checkout rules are preserved.

## Provision the owner

1. Configure the API environment and review the target database. Deploy migrations with `npm run db:migrate`.
2. Run `npm run admin:create` from the project root. The terminal prompts for an email and a hidden password of at least 14 characters, with confirmation. There is no default password and the development catalog seed creates no admin.
3. For controlled non-interactive provisioning, supply `ADMIN_EMAIL` and `ADMIN_PASSWORD` through the process environment, never command arguments or committed files. The script refuses to overwrite an existing email and does not print credentials.
4. Start the API and web; visit `/admin/login` on the same origin. Production requires HTTPS for the secure cookie. Use development/test mode locally over HTTP. Do not disable production cookie security to work around missing TLS.

The script writes only the selected database; it is not run automatically at startup or by migrations. No real store-owner account is created as part of implementation/testing. Test admins are randomly generated, confined to the dedicated local test database and cleaned up.

## Authentication and authorization

Passwords use Node's asynchronous scrypt with independent random salts, N=131072/r=8/p=1 and constant-time comparison. Session tokens are random 256-bit values; PostgreSQL stores only their SHA-256 hashes. Sessions expire after `ADMIN_SESSION_HOURS` (default eight; maximum 24), cannot slide indefinitely, are checked against active admins on each API request and are deleted on logout. A new login revokes the owner's previous sessions. Expired sessions are pruned at successful login.

Production uses the host-only `__Host-tiyas_admin` cookie with `Secure`, `HttpOnly`, `SameSite=Strict` and `Path=/`; local development/test uses `tiyas_admin` without Secure. No session token is exposed to JavaScript or local storage. A session-bound CSRF token must accompany every authenticated mutation. Exact configured origins and cross-site fetch metadata are checked. Login accepts only validated JSON and is limited to five requests per IP per 15 minutes. Admin traffic has a bounded per-process limiter; the deployment remains one Fastify instance, with no implicit proxy trust. Shared/distributed rate limiting and deployment-level IP policy are Stage 06 qualification work if topology changes.

Protected Next.js layouts and server HTTP requests enforce sessions; Fastify independently authorizes every protected endpoint before body/file parsing. Admin responses use no-store, sanitized errors and existing secret-safe logs. Order/customer data is never exposed by predictable unauthenticated order IDs.

## Secured REST endpoints

All paths below begin with `/api/v1/admin`. Only `POST /login` is public.

| Method | Path | Purpose |
| --- | --- | --- |
| GET / POST | `/session` / `/logout` | Current session/CSRF; session revocation |
| GET | `/dashboard` | Database counts and recent accepted orders |
| GET | `/options` | Existing categories and collections, including inactive choices |
| GET / POST | `/products` | Search/category filter/pagination; create product |
| GET / PUT / DELETE | `/products/:id` | Read/update/delete an unused product |
| POST | `/products/:id/archive` | Set inactive without removing history |
| POST | `/images` | One bounded, authenticated multipart image upload |
| DELETE | `/images/:id` | Delete an unattached upload not used in order snapshots |
| GET | `/orders` | NEW (default), COMPLETED or ALL accepted orders, paginated |
| GET | `/orders/:id` | Accepted order detail including delivery information |
| POST | `/orders/:id/complete` | Idempotent manual completion with timestamp |

Shared Zod contracts define validation and explicit response projections. Slugs/SKUs, integer-paise prices, compare-at bounds, stock, variants and image references are validated. Public catalog mutation routes remain absent. Category/collection creation screens are deliberately outside scope; product forms select the existing database taxonomy.

## Safe product changes

Product and variant updates acquire database locks in the same product-then-variant order used by checkout. Edits compare product and retained-variant timestamps with the submitted form versions. A stock or product change requires reloading rather than restoring stale quantities. Stock fields represent currently available units, excluding quantities already reserved by checkout. Checkout's transactional reservation/release/finalization logic remains authoritative.

SKU checks serialize across admin saves, and database unique indexes enforce individual table uniqueness. Image ordering uses a temporary positive offset to avoid unique-position collisions. Existing image IDs and variant IDs must belong to the edited product. New images must reference uploads owned by the administrator; arbitrary URLs/object keys are not accepted.

Products and variants referenced by any historical or pending order cannot be deleted. Foreign keys enforce this outside the API as well. Archive products or deactivate used variants instead. Ordered item names, SKUs, amounts and image paths remain immutable snapshots.

## Images: local and OCI

`STORAGE_ADAPTER=local` uses `STORAGE_LOCAL_DIR`, relative to the repository root unless absolute. The default is `var/uploads`; Compose mounts a persistent `product_images` volume at `/app/var/uploads`. Files are not stored in PostgreSQL or in the Next.js public directory. PostgreSQL holds ownership, object key, dimensions, size and associations only.

For production, set `STORAGE_ADAPTER=oci`, `OCI_S3_ENDPOINT`, `OCI_REGION`, `OCI_BUCKET`, `OCI_ACCESS_KEY_ID` and `OCI_SECRET_ACCESS_KEY` on the API. The adapter uses Oracle's [Amazon S3 Compatibility API](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm), path-style access and [Customer Secret Keys](https://docs.oracle.com/en-us/iaas/Content/Identity/access/working-with-customer-secret-keys.htm). Use a private, pre-created bucket and an IAM policy restricted to object create/read/delete in that bucket. The application does not need bucket creation, bucket listing or IAM administration permissions. No bucket-wide public access or per-object public ACL is added. Keep credentials exclusively on the backend.

Actual decoded file content must be static JPEG, PNG or WebP, no more than 5 MiB, 200–6000 pixels per side and at most 24 MP. Extreme aspect ratios that would produce an output side below 200px are rejected. Images are decoded and re-encoded as WebP, automatically oriented, metadata stripped and resized to at most 2400px per side. Names are generated UUIDs; submitted filenames are discarded. SVGs, animations, corrupt files and oversized content are rejected. Next rewrites and Nginx route `/images/uploads/:uuid.webp` to the API. Published merchandise and historical order images are readable publicly; unattached or unpublished images require an active admin session. The API never exposes storage credentials or private bucket URLs.

Removing/replacing an image in the form changes its association on Save; detached upload deletion is attempted afterwards. Images used by historical order snapshots are retained. Abandoned browser uploads can remain unattached; production operations should review aged unattached `ImageAsset` records and remove them through the authorized deletion service after checking snapshot references. Do not enable a blind bucket age-expiry rule that deletes referenced product/order images. Storage retention and backup procedures are finalized in Stage 06.

## Orders and completion

All lists, counts and details include only accepted, finalized orders with verified PAID online payment or valid COD_PENDING placement. Pending, failed and needs-review payments are excluded. The default order view is NEW; ALL sorts NEW before COMPLETED.

The owner reviews the phone/address and arranges shipment manually outside the platform. After confirmation, a conditional database update changes NEW to COMPLETED and sets completedAt once. Repeated/concurrent completion returns the existing completed record without changing its timestamp or inventory. COMPLETED records the owner's manual fulfillment action; it is not verified courier delivery. COD payment state is unchanged by fulfillment completion. No extra order-status pipeline is introduced.

## Verification

See IMPLEMENTATION_STATUS.md and STAGE05_VERIFICATION.md for actual checks, screenshots and outstanding external qualification. Tests require an explicitly selected dedicated PostgreSQL database; they never fall back to the root `.env` database. The browser admin projects run after shopping/checkout regression projects so temporary owner-created products cannot change catalog pagination expectations. Real OCI credentials and an actual bucket are not assumed or fabricated.
