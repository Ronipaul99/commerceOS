# Collection listing redesign

The nine PNGs in `Tiyas_Jewel_Desktop_Collection_Designs/` are the visual basis for this update. The existing Next.js storefront now uses their ivory/blush/burgundy composition: campaign heroes, editorial collection headings, thumbnail navigation, a framed desktop filter sidebar, compact shopping cards, restrained campaign panels and newsletter/benefit strips.

## Routes and composition

| Reference | Existing destination |
| --- | --- |
| All Collections | `/collections` and `/shop` |
| Premium Kundan | `/collections/premium-kundan` |
| American Diamond | `/collections/american-diamond` |
| CZ | `/collections/cz` |
| 1 Gram Gold | `/collections/1-gram-gold` |
| Temple Jewellery | `/collections/temple-jewellery` |
| Brace Kundan | `/collections/brace-kundan` |
| Silver Replica | `/collections/silver-replica` |
| Pearl Jewellery | `/collections/pearl-jewellery` |

Existing category URLs and database-backed collection edits use the same listing system and retain their own names, descriptions and membership. Unknown collection slugs retain the established not-found response. The newly added `/collections` index reuses CatalogPage and supplies collection metadata; it does not introduce a second catalog service.

`collection-design.ts` centralizes campaign presentation and the three/four-column desktop choices. `CatalogHero`, `CatalogSectionHeading`, `CatalogEditorial` and `CatalogClosing` provide reusable compositions. `collections.css` is scoped to the listing page/card variant so the approved homepage, shared header/footer, PDP, cart, wishlist, checkout and admin layouts remain intact. The latest requested removals of the announcement strip and header collection-link row remain in effect, even though those elements appear in the older mockups.

The shared ProductCard has a listing variant with actual category/name/description, INR price, optional real compare-at price, favourite state, Add to Bag/Choose Options and a product details link. Homepage/default card behavior is preserved. The reference's Quick View control is represented by an explicit View Details route, since the existing application has no product quick-view feature. It is not a nonfunctional modal button.

## Data and interaction boundaries

All purchasable products, photographs, prices, stock, counts, variant choices and collection membership still come from the existing typed Fastify catalog API. The previously approved **More from Tiyas** fallback remains explicitly labelled for the eight campaign assortments that do not yet have backend assignments. No heritage product records, prices, ratings or stock are invented. Assigned database collections continue to use actual membership.

Category, integer-paise price range, availability, featured filtering, sorting and pagination retain URL parameters and server-side API behavior. Active chips can remove filters. Desktop filter sections expand/collapse; mobile uses the existing accessible slide-out dialog with keyboard/Escape/focus handling. New grid/list controls change only presentation and expose their selected state. Category and collection thumbnails navigate to working URLs. Bag and wishlist reuse their existing persistence and validation services.

The design pack explicitly describes its ratings, discounts, counts, materials, policy claims and other content as illustrative. Only supported filters are published. No occasion/material/stone/rating facets, popularity rankings, fabricated reviews, guaranteed shipping/return promises, certification claims, account links or app-download badges are added. Newsletter reuses the existing truthful preview integration and does not claim to store subscriptions.

## Artwork and responsive delivery

The PNG pack supplies flattened designs, not original photography. Forty-nine isolated photographic regions were extracted for campaign and navigation use, then encoded as replaceable WebP assets under `apps/web/public/images/collections/` (approximately 479 KB combined). Full source filenames, extraction rectangles and output paths are recorded in `collection-design-assets.json`. No complete screenshot, embedded product-price UI, or reference text is used as a page background. Purchasable product images are not replaced by reference artwork.

The original reference images are only 1086px wide, so extracted artwork has limited source resolution. High-resolution original hero/category photography remains the production replacement requirement. Existing category art is used where the mockup has no matching ring/photo treatment. Artwork is explicitly disclosed as illustrative; it does not establish actual catalog material or category membership.

Mobile uses an image-first hero with its own text region, horizontal category/collection rails, a compact filter/sort toolbar and a two-column product grid. Tablet uses three columns; desktop uses three columns or four for CZ/Silver Replica/Pearl at 1280px and above. Native swipe scrolling, reserved image ratios, Next Image source sizes, lazy offscreen images, a prioritized hero and reduced-motion skeleton/hover fallbacks are retained. The list view is usable at narrow widths too.

## Verification and handoff

The application must be visually checked at desktop/mobile sizes against all nine source PNGs. Browser coverage in `collections.spec.ts` checks distinct campaign artwork, all routes, real API card identity, fallback disclosure, filters, sorting integration, view controls, wishlist/bag behavior, and image/overflow checks from 320 to 1920px. Existing shopping/checkout and admin tests remain regression coverage.

Full-page captures are under `output/playwright/collections/{all,premium-kundan,american-diamond,cz,1-gram-gold,temple-jewellery,brace-kundan,silver-replica,pearl-jewellery}-{desktop,tablet,mobile}.png`. Additional `pearl-width-{width}.png` files cover the responsive sweep. These are ignored local verification artifacts. See IMPLEMENTATION_STATUS.md for actual final results rather than assuming a passing result from source inspection.

No API contract, database schema, payment service, admin workflow, credentials or remote database is changed by this visual update. Stage 06 remains outside scope.


Final regression evidence: TypeScript, lint, both production builds and 38 unit tests pass. The complete production-browser run reports 70 passed / eight intentional duplicate viewport or link-audit skips (4.5 minutes), including all nine collection designs at desktop/tablet/mobile plus existing storefront, checkout and admin flows. The final focused desktop/mobile collection rerun passed after the Silver Replica photo-crop correction (five checks and one intentional duplicate-width skip; Playwright last-run status passed, no failed tests). Full-page desktop/mobile captures were inspected against the supplied designs after corrections. The regular production build was restored and the isolated local PostgreSQL test server stopped after checking fixture cleanup.

The first restricted browser invocation completed its individual assertions but did not finish process cleanup, so it was interrupted and is not counted as a completed suite. The reported full regression used normal process permissions and returned the final successful summary.
