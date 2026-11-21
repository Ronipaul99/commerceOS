# Shared product card

`apps/web/src/components/storefront/product-card.tsx` is the single public shopping card. Homepage arrivals/showcases, shop and collection grids, wishlist and PDP related products already import it. Placement (`default`, `campaign`, `listing`) controls container sizing only; `src/app/product-card.css` owns the common ivory/burgundy skin. Bag/checkout rows and compact search results remain task-specific rows.

The reference is implemented as real markup: rounded photographic frame, genuine Featured flag (or explicitly verified Bestseller metadata), wishlist control, accessible image dots, collection label, title, description, INR price, genuine compare-at discount, optional product facts, variant options and paired Add to Bag/Quick View controls. DM Sans remains the site-wide typeface.

The current compact dimensions are identical across homepage rails, shop/collection grids, wishlist and PDP recommendations: 260 x 400px desktop; below 768px, width is (viewport - 60px) / 2 with the same 400px height. The image is 132px desktop, 110px mobile and 96px below 360px. Detail bands and paired actions remain consistent. Earlier enlarged comparison screenshots below predate this compact sizing.

## Product facts

The catalog API now exposes optional validated Product.details: subtitle, material, weight, size and named colour swatches. The existing admin product form manages them, and presentProduct maps them into every shared card. The user-approved Premium Kundan Choker Set has complete supplied specifications and zero stock. Missing fields on other products remain hidden. See COMPLETE_PRODUCT_CARDS.md.

The user chose to hide missing details instead of showing placeholders. No empty detail bands or invented reviews appear on live products. The supplied card screenshots are not used as whole-card backgrounds or product photographs. The approved Kundan record uses labelled campaign concept imagery until real merchandise photographs are supplied.

A caller can supply verified metadata through the typed optional `details: ProductCardDetails` prop, or attach `cardDetails` to a `DisplayProduct` in its presentation data source. The shared component and quick view both consume the same metadata:

```tsx
<ProductCard
  product={presentProduct(product)}
  details={verifiedMerchandisingDetails}
/>
```

The component accepts subtitle, material, weightGrams, size and colors. Optional verified review or bestseller display metadata remains separate; the persisted/admin schema rejects those claims. Persisted swatches are informational. A component colour explicitly mapped to an available real variant can select it.

## Behaviour

- Real images are used in API order with the existing labelled fallback. Image dots are keyboard accessible; alternate hover imagery is used on devices with a precise pointer. Reduced motion is respected.
- Without a variant selection, the card shows the minimum actual variant price with From and requires a selection. When every actual variant is explicitly mapped to a verified colour, the first available colour is selected by default; unavailable colours are skipped. Size-only products still require a selection. Selecting an available option updates price, image and availability. Out-of-stock options cannot be added. No speculative discount is shown before selecting a variant.
- Quick View uses the existing native dialog, focus trap, Escape and focus restoration. It shows product information, variant selector, SKU, current price and product-details link. Add closes the preview before opening the existing bag dialog.
- Every add uses the existing provider and backend cart quote to verify price/availability. Only identifiers are persisted. Wishlist Move to Bag removes the favourite only after a successful add.
- Full product routes, checkout, payments, admin and database contracts are unchanged.

## Verification

Latest reference-fidelity correction: 44 unit tests, TypeScript, lint and both builds pass. The relevant homepage/collection/card browser run reports 24 passed and six intentional duplicate checks skipped, followed by a final three-project card rerun (three passed). Both complete reference variants and live catalog cards were visually reviewed; isolated full-detail cards also pass 320/390/834px overflow and button-clipping checks. See output/playwright/product-cards/reference-{rich,essential}-rendered.png, reference-two-column-{320,390,834}.png and live-{desktop,mobile}-card-review.png. The native anchor/image adapters used for static comparison live only in ignored verification artifacts; interaction tests exercise actual Next.js components and Fastify data. The earlier broader regression below predates this visual refinement.

TypeScript, lint, both production builds and 42 unit tests pass. The complete browser regression reports 73 passed and eight intentional duplicate-check skips; the final focused card rerun passes all three device projects after visual corrections. Unit coverage checks variant prices/stock, genuine discounts, absent/invalid facts and image fallbacks. Browser coverage in `tests/e2e/product-card.spec.ts` exercises image selection, Quick View focus/Escape, unavailable and available sizes, SKU/price changes, verified cart totals and wishlist reuse. Desktop/mobile cards and dialogs were visually inspected. Screenshots are generated under `output/playwright/product-cards/`; existing homepage and listing screenshots also reflect the shared card. Test fixtures are clean, the local test database process is stopped, and the normal production build is restored.
