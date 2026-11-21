# Admin design pack and content management

Updated 21 November 2026. Extends the existing Next.js/Fastify admin using the seven references in `../Tiyas_Jewel_Minimal_Admin_7_Designs`. The storefront's approved DM Sans and 80% density remain in place.

## Screens and design

- `/admin/login`: supplied silver-jewellery photograph region, curved burgundy brand panel, email/password icons, password visibility and existing secure sign-in.
- `/admin/forgot-password`: email OTP request and password reset, with the supplied recovery photograph region.
- `/admin/accept-invitation`: invitation email OTP and initial password setup.
- Existing dashboard, create/edit products, product list, orders and order details retain their database services and receive the new sidebar, toolbar, forms, tables, pills and actions.
- `/admin/users` and `/admin/users/new`: owner-only invitations, role changes, activation/deactivation and resend/reset actions. There is no public registration or customer account system.
- `/admin/content`: Homepage, Banners & Carousel, Static Pages, and Menus & Links tabs.
- `/admin-preview?key=...`: authorized, private, no-index draft preview in the real storefront layout.

The reference's login/recovery photograph regions are rendered from supplied assets with CSS cropping; the reference UI is never used as a page background. Other imagery and product rows use the actual existing campaign assets and catalog. Reference sample prices, orders, ratings and contact information are not fabricated. Matching Lucide outline icons and the existing lotus motif are reused.

The authentication cards are capped at 640px before the global density adjustment, with compact controls and responsive spacing. Short desktop screens constrain the card to the available viewport and scroll longer OTP forms inside it; phone forms follow the page flow. The sidebar uses a separate vertically scrolling navigation area while branding and sign-out remain accessible. Content (CMS) is a keyboard-accessible disclosure that expands/collapses on every admin route, with its collapsed links removed from navigation focus. Mobile retains the same vertical menu rather than the previous horizontal-link styling.

The references contain inconsistent extra navigation and advanced fulfillment states. Inventory, reports, CRM, warehouse, courier states and additional settings modules remain excluded. Orders still use **NEW → COMPLETED**, with accepted-payment safeguards and idempotent manual completion.

## CMS behavior

Fastify owns `ContentDocument` persistence. Each key has a validated draft, a separate published snapshot, an incrementing version and publication timestamp. An advisory transaction lock and expected version reject stale writers with HTTP 409. Saving a draft never changes the public site. Publishing atomically saves and publishes the current value; unpublishing restores built-in storefront content or removes a custom information page.

Homepage composition supports enabled/hidden, ordered sections: hero carousel, quick categories, editorial collections, new arrivals, campaign banners, occasions, product showcases, promotions, trust content, story and newsletter copy. Editors can add sections/items, reorder, replace/remove images, change copy/links and preview saved drafts. Product sections always query the existing catalog APIs; an empty collection retains the approved labelled current-catalog fallback. Existing homepage code remains the fallback until a homepage document is published.

Replacing an uploaded banner clears its previous mobile crop so the new image appears on both desktop and mobile. An optional separate mobile image can then be set under Image sources & mobile composition. Mobile edit actions reveal the editor using an offset that respects the established global density; reduced-motion users get an immediate transition. Closed mobile navigation is hidden from keyboard focus, and the open menu wraps focus and supports Escape.

Disabled sections/items are omitted from the public snapshot. All content is structured text, never executable HTML. Internal storefront links are allowlisted; script URLs, protocol-relative URLs, traversal and admin/API destinations are rejected. Image paths must be a bundled asset from `packages/shared/src/content-assets.ts` or a validated uploaded asset. New bundled images must be added to that manifest. Information pages publish at `/info/[slug]`, with title/description metadata and escaped paragraphs. Menus control mobile navigation and footer groups without restoring the removed desktop collection row.

Content reads use server-side HTTP and no-store responses; Next.js never imports database code. Draft previews require an admin session. Uploaded private preview images bypass the image optimizer so the browser supplies its HttpOnly cookie. Published uploads are readable through the existing API image route.

## Images and storage

Product JSON import/export, placement-specific downloadable image prompts, separate mobile hero uploads and contextual section previews are described in [ADMIN_CONTENT_TOOLS.md](ADMIN_CONTENT_TOOLS.md).

CMS uploads reuse the existing authorized multipart endpoint, actual-content JPEG/PNG/WebP validation, 5 MB limit, dimension checks, WebP conversion and local/OCI storage adapter. PostgreSQL stores metadata and content references; binaries remain in object storage. `ContentAssetUse` retains draft/published references, preventing deletion of referenced media and allowing public access only when published. Draft-only/unattached assets remain private. Removing a reference does not silently destroy an object; explicit removal still enforces product/order/CMS safeguards.

## Authorization and OTP

Existing owners migrate to `OWNER`. `ADMIN` can manage products/orders/content; `CONTENT_MANAGER` can access only CMS and image operations. Only `OWNER` can manage admin users. Fastify checks current database role/activity on every request, plus the existing cookie, origin and mutation CSRF protections. Changing a role or deactivating an account revokes its sessions and outstanding codes. Owner access cannot be removed through these endpoints.

Recovery and invitations use six-digit SMTP email OTPs, ten-minute expiry, a 60-second resend cooldown, at most five verification attempts, IP rate limits and HMAC-protected stored hashes. Codes are consumed once; password changes revoke all prior sessions. Passwords still require 14–128 characters and use the existing salted scrypt hashing. There are no copyable password-reset links, public OTP responses, production email simulation or OTP logging. Public requests return the same conditional response for eligible and unknown addresses; an unconfigured SMTP service returns a clear global unavailable error. SMTP failures leave no usable code. A failed invitation delivery leaves an explicitly pending account that the owner can resend from Admin Users.

See [SMTP_SETUP.md](SMTP_SETUP.md) for required configuration. Live SMTP delivery cannot be qualified until the store's actual settings are supplied. Tests use an injected email transport with isolated test inbox capture.

## API additions

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/v1/admin/access/request` | Public, rate/origin limited |
| POST | `/api/v1/admin/access/complete` | Public, rate/origin limited, valid OTP |
| GET / POST | `/api/v1/admin/users` | Owner only |
| PUT | `/api/v1/admin/users/:id` | Owner only |
| POST | `/api/v1/admin/users/:id/resend` | Owner only |
| GET | `/api/v1/admin/content` | Authenticated content access |
| GET / PUT / DELETE | `/api/v1/admin/content/:key` | Authenticated; delete only static pages |
| POST | `/api/v1/admin/content/:key/publish` | Authenticated + CSRF |
| GET | `/api/v1/content/:key` | Published snapshot only |

Existing products add compatible status filtering. Existing accepted-order listing adds name/order/email/phone search and payment-method filtering; acceptance and fulfillment rules are unchanged.

## Migration and verification

`20261121000600_admin_content` is additive: admin name/role/invitation fields, expiring OTPs, versioned content documents and media references. It does not reset, seed or rewrite products/orders/passwords. Apply with `npm run db:migrate` against the reviewed target before running this API version.

Implementation checks and visual evidence are recorded in `IMPLEMENTATION_STATUS.md`; review captures and logs are under ignored `output/playwright/admin-design-*` and `output/verification/admin-*` paths. All test records, uploads and OTPs are confined to the explicit local database on port 5433.

Final validation: TypeScript/ESLint and both production builds pass; **72 unit tests**, **52 database integration tests**, and the full production browser regression (**73 passed / eight intentional duplicate-responsive skips**) pass. The final affected admin rerun also passes all three viewport projects. The Prisma migration/schema diff reports no difference; dependency audit reports zero vulnerabilities.

Production visual review covers 96 combinations of 12 screens and eight widths, with no overflow, broken images, page exceptions or console errors. Desktop/mobile captures were visually inspected after correcting spacing, form layout, mobile navigation focus and editor scrolling. See `output/playwright/admin-design-cms-1440.png`, `admin-design-cms-390.png`, plus the login/recovery/invitation/products/create-product/orders/users/create-user/dashboard/pages/menu captures in the same directory.

Final production browser flows exercise image upload and private saved preview, homepage publication with the new image on mobile, draft/live separation, static-page content/SEO escaping, published mobile menus, section add/remove, banner ordering, page deletion and unpublishing. Email OTP invitation activation, restricted content-manager login, forbidden products/orders access, logout, password recovery and subsequent owner login pass using the injected test inbox. Live SMTP and live OCI portal upload were not exercised in this review; the existing storage adapter is preserved.

The additive migration was also applied to the preflight-checked configured store. Before/after checks retain 16 products, one order, one active admin and no missing product/variant references. No test records, CMS publications, seeds/resets or credential changes were made there.

Cleanup restored review stock and left 14 isolated catalog products with zero admins, orders, payments or content documents. Temporary browser/web/API/PostgreSQL services are stopped; port 3000 remains stopped as requested. The normal build passes with port-4000 API/image rewrites restored, development type imports restored and environment files unchanged. Browser artifacts are collected under ignored verification output. SMTP settings and a real inbox delivery test remain an external configuration step.
