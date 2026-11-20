# Stage 03 shopping contracts and behavior

## Ownership and routes

Fastify owns the catalog, current prices and availability. Next.js uses the versioned HTTP API exclusively, including server-rendered product and collection existence checks. Public product mutations remain unavailable. No checkout, payments, customer accounts or admin features are implemented.

The approved homepage composition, typography, tokens and campaign assets are retained. Shop/collection pages reuse the same layout and four-column/two-column card system. Product, cart and wishlist screens extend semantic styles through `apps/web/src/app/shopping.css`.

## Catalog API

| Endpoint | Behavior |
| --- | --- |
| GET /api/v1/products | Paginated, filtered catalog |
| GET /api/v1/products/:slug | Active product, ordered images and active variants; real 404 for missing/hidden products |
| GET /api/v1/categories | Active category navigation |
| GET /api/v1/collections | Existing active-collection contract retained |
| GET /api/v1/collections/:slug | Collection metadata or 404 |
| GET /api/v1/search?q=...&limit=6 | Case-insensitive product-name/category matches; empty query supplies suggestions |
| POST /api/v1/cart/resolve | Read-only current-price/availability resolution; no database mutation or reservation |

Product-list query parameters: `page` (1-10000), `limit` (1-50), `category`, `collection`, `minPricePaise`, `maxPricePaise`, `availability` (`in-stock`/`out-of-stock`), `sort` (`newest`/`price-asc`/`price-desc`), `featured` (`true`/`false`), and bounded comma-separated `ids` for saved items. Unknown filters, malformed values and inverted price ranges return 400. Price filtering/sorting uses the displayed catalog base price; variant overrides are applied on product selection and cart resolution. Pagination is stable with an ID tie-breaker and repeatable-read list/count snapshots.

Active variants control availability when a product has variants; an inactive variant never falls back to product-level stock. Public `maxQuantity` caps the selectable quantity at min(current stock, 99). A product's full inventory is not exposed beyond this purchase limit. Product responses add optional SKU, featured, compare-at and quantity-limit fields while retaining existing v1 fields. Image records declare concept provenance. Variant image IDs are constrained by a composite foreign key to the same product's images.

## Listing and product experience

Filters and sorting live in URL query parameters and survive refresh/back/forward. Rupee form inputs convert to integer paise without floating-point monetary arithmetic. The mobile filter dialog uses the existing focus trap, Escape close and focus return. Results have counts, pagination, empty states and recoverable API errors; shop pages never invent purchasable products during failures.

Product pages fetch through the API before rendering and return a proper HTTP 404 for missing slugs. The shared ancestor loading boundary was moved to appropriate shopping screens so it does not flush a 200 response before a product existence check. Product galleries have native horizontal swipe/scroll, visible previous/next controls, thumbnails and a keyboard-accessible zoom dialog. Variant selection updates SKU, price, quantity limit, availability and image. Unavailable variants can be inspected, but cannot enter the bag. Cards with variants lead to the option picker. Related products come from the API.

## Anonymous cart and wishlist

Local storage key: `tiyas.shopping.v1`. The versioned payload contains only:

```json
{"version":1,"cart":[{"productId":"...","slug":"...","variantId":null,"quantity":1}],"wishlist":[{"productId":"...","slug":"..."}]}
```

Prices, names, images and subtotals are never trusted from storage. Unknown stored price fields are discarded. Parsing bounds quantities to 1-99 and selections to 50, rejects duplicate/corrupt or incompatible data, and handles storage denial gracefully. Cross-tab storage events update the view. Wishlist records resolve current products by ID; removed catalog records can be cleared. Moving variant products to the bag first requires choosing a valid variant.

Adding or changing quantities first calls the backend resolver. Unavailable, missing, mismatched or unselected variants are rejected; stock reductions clamp quantities and are explained. On restore and window focus the bag is revalidated. Missing/out-of-stock lines remain removable and contribute zero to the subtotal. The bag uses only server-computed integer-paise line totals/subtotal; aggregate formatting supports safe totals larger than one PostgreSQL Int. Mutations are queued and detect intervening cart changes before committing.

`POST /cart/resolve` accepts no client prices. It uses a consistent read snapshot and does not write an order, persist a cart, decrement stock or make a reservation. Its CORS method allowance does not grant product mutation routes. Stage 04 must independently revalidate everything transactionally when creating an order; this stage's cart quote is not checkout authority.

## Search and image boundaries

The search dialog debounces API requests and cancels stale ones. It shows current-product thumbnails/prices, category matches, suggestions and no-results/error states. The combobox/listbox supports Arrow Up/Down, Enter, Tab, Escape and focus restoration.

The existing generated campaign assets remain explicitly labelled concept imagery. The development seed has 13 public sample products, four featured products, four categories, three collections, one archived fixture, compare-at pricing and three ring variants (one unavailable). It creates only missing records and no admin user. Actual product photographs/materials and approved policy/contact/social copy remain required before launch; see ASSETS.md. Offline homepage concept cards preserve the approved composition but cannot be added to the real cart or wishlist.

## Validation setup

`npm test` covers shared inputs, identifier-only storage and cart price/stock trust boundaries. `npm run test:integration` requires explicit TEST_DATABASE_URL to an isolated migrated/seeded database. It creates/removes temporary test records and must not target a shared/live database.

`npm run test:e2e` requires E2E_DATABASE_URL to a separate migrated/seeded database. The runner builds the API/web with the test API origin, starts owned loopback API/web servers at 4100/3200, runs Playwright and closes them. It does not fall back to the application's DATABASE_URL. Rebuild with `npm run build` before using production `npm start` outside the test environment, since rewrites are compiled at build time.

The browser suite verifies real PostgreSQL browsing/filter/sort/search, variants, cart refresh/quantity/removal, wishlist persistence/move, tampered storage, API failures, out-of-stock protection, 404s, image navigation/zoom/mobile touch, and the existing homepage/newsletter. Desktop/mobile screenshots cover shop, product, cart, wishlist and homepage. The responsive sweep covers 320, 390, 600, 834, 1024, 1280 and 1440px with reduced motion.
