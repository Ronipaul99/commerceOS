# Storefront consistency audit

Updated 21 November 2026 at the owner's request: increase footer text by 20%, fix cut-off product cards and keep shared UI semantic and consistent.

## Findings and fixes

| Location | Observed gap | Fix |
| --- | --- | --- |
| `apps/web/src/features/home/product-rail.tsx:16` | New Arrivals and collection showcases could expose part of the next card. Percentage-based scrolling also stopped between cards. | Measure the available width in complete card units. Centre the track, page by whole cards and clamp the last page and resized position. Existing category swipe affordances remain unchanged. |
| `apps/web/src/app/product-card.css:1066` | Supporting-product arrows were hidden on desktop, leaving some products difficult to reach. | Show shared previous/next controls whenever the product rail overflows. Hide the controls when every product fits. |
| `apps/web/src/features/home/product-rail.tsx:94` | Keyboard focus could reach an offscreen card without revealing the whole frame. | Reveal the focused card's full page; support Left/Right when the track itself has focus. Touch scrolling keeps native snap behaviour and reduced-motion navigation remains immediate. |
| `apps/web/src/components/storefront/product-card.tsx:126` | Material, colours, weight, size and inline variant chips together could overflow a fixed-height detailed card. | Preserve specifications, use the existing Quick View variant selector for full-detail cards and keep both actions visible. Essential cards retain inline options. Long fact values have a two-line preview with their complete text in Quick View. More than four colours use a compact preview and an accessible all-colours trigger. |
| `apps/web/src/app/product-card.css:1080` | Shop/collection and recommendation grid tracks were left-aligned while home and favourites used centred tracks. | Centre shared grid tracks without changing card dimensions or mobile column counts. |
| `apps/web/src/app/shopping.css:449` | The product-page Add to Bag used the previous brown styling, and its note incorrectly said checkout was a later release. | Use the established burgundy action token and wine hover, hide its decorative wishlist icon from assistive technology and describe the existing checkout accurately. |
| `apps/web/src/app/homepage.css:1103` | Small footer copy and separate typography overrides made a uniform increase difficult. | One footer scale token increases copy, navigation, group headings and captions by exactly 20%, retaining the logo size and current site density. |
| `apps/web/src/components/storefront/footer-group.tsx:24` | Footer navigation lacked list semantics and group headings skipped to level three. | Use labelled navigation lists and level-two group headings. Native mobile disclosures remain available. |
| `apps/web/src/components/storefront/product-card.tsx:240` | Product facts used nested grouping wrappers inside one description list. | Each fact now has a valid description list containing its term and value. Visual rows remain presentation wrappers. |
| `apps/web/src/app/globals.css:103` | Selects and textareas lacked the shared explicit focus treatment. | Apply the same visible focus indicator as other controls. |
| `apps/web/src/app/globals.css:908` | Scrollable dialogs could chain scrolling to the page. | Contain dialog overscroll. |
| `apps/web/src/components/storefront/header.tsx:10` | Decorative header icons were exposed unnecessarily; header and footer logos shared the same loading treatment. | Hide decorative SVGs from assistive technology, identify menu/search dialog triggers and load the header logo eagerly while leaving the footer logo lazy. |

## Preserved design and behaviour

- Shared card design tokens stay **260 x 400px** everywhere, with the existing 80% screen density: **208 x 320px** desktop, **132 x 320px** at 390px and **104 x 320px** at 320px. Mobile grids remain two columns.
- Existing DM Sans, logo, colours, hero height/autoplay, product imagery, missing-field handling and collection routes remain intact.
- Product values come from the existing API. Wishlist, bag revalidation, checkout, payment rules and admin authorization are unchanged. No backend, schema, configured database or environment-file changes were made.
- Normal builds retain `.next`. Optional `UI_REVIEW_BUILD=true` uses ignored `.next-ui-review` output, allowing an isolated review/build without overwriting the owner's running development output. This is a review flag, not a production requirement.

Footer typography before the existing density scale:

| Text | Before | After |
| --- | --- | --- |
| Brand copy / mobile links | 12px | 14.4px |
| Desktop links | 11px | 13.2px |
| Group headings | 13px | 15.6px |
| Copyright / captions | 10px | 12px |

## Verification

- **110 responsive page checks:** home, shop, Premium Kundan collection, product details including recommendations, favourites, bag including recommendations, checkout, information, journal and admin login. Widths: **320, 375, 390, 430, 600, 768, 834, 1024, 1280, 1440 and 1920px**.
- No horizontal page overflow, partial visible card frames or overflowing card bodies/actions in the checked views. Every checked page has one main heading; visible controls have accessible names. Footer typography measurements confirm the exact 20% increase at every width.
- **55 rail checks** cover next/previous boundaries, keyboard navigation and focus visibility across the 11 widths. Additional normal-motion checks cover smooth paging, a real touch swipe with snap and resizing an end-positioned rail to 834/1440/320px; all settle on complete cards.
- **Eight rich-card checks:** normal and stress fixtures at 320/390/834/1440px, including 100-character facts and 12 colours. All facts and actions remain within the card. Quick View exposes all colours; unavailable variants remain disabled. These fixtures exist only in browser response overrides, never in the catalogue database.
- After the visual-review alignment correction, **44 additional production grid checks** pass across the same 11 widths for shop, collection, product recommendations and favourites. They verify shared dimensions, centred track alignment, no overflowing card bodies, the burgundy product action and removal of stale checkout copy.
- Browser checks record no page exceptions. Full-page desktop/mobile captures are reviewed separately from automated geometry assertions.
- TypeScript, ESLint, both production builds and all **46 unit tests** pass. The full production regression reports **73 passed / eight intentional duplicate-check skips**. After the final alignment/copy corrections, both builds pass again and the affected collection/card/shopping regression reports **seven passed / two intentional skips**. These checkout checks exercise development payments, not live Razorpay transactions.

Evidence: `output/verification/ui-consistency-audit.log`, `ui-rich-card-audit.log`, `ui-rail-motion.log`, `ui-consistency-e2e.log`, `ui-consistency-final-regression.log`, `ui-consistency-final-grids.log`, `ui-consistency-typecheck.log`, `ui-consistency-lint.log` and `ui-consistency-production-captures.log`.

Final production screenshots use `output/playwright/ui-consistency-{home,shop,product,wishlist}-{1440,390}.png` and `ui-consistency-footer-{1440,390}.png`. Mobile footer detail captures expand its groups to make the larger links visible. Development sweep captures also cover collection, bag, checkout, information and admin login under `ui-audit-*`.

Final production screenshots were visually inspected after the alignment correction. Their images load correctly with no page exceptions or horizontal overflow. The temporary review services and browser are stopped; the dedicated test database retains 14 products and zero orders, payments or admins.

This is a focused visual/interaction review of the checked routes and states, not a formal accessibility certification. Existing campaign concepts and missing merchandise facts remain labelled or omitted; this work does not invent product specifications or business claims.
