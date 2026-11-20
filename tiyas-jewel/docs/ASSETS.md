# Stage 02 asset inventory and replacement guide

## Reference

The attached desktop/mobile homepage composite was visually studied and compared with browser screenshots. The requested file `design/reference/tiyas-homepage.png` is not present on disk. Preserve the source screenshot there when available for future image-level comparisons; current visual review is against the attached reference.

## Development campaign art

Nine original concept images were generated using the built-in image_gen tool, then saved as WebP assets under `apps/web/public/images/editorial/`. No unrelated stock photographs or remote image hotlinks were used. Original generated PNGs remain in the tool's generation folder; working copies are under ignored `output/imagegen/`. No source screenshot was embedded in the page.

| Asset            | Usage                                                       |
| ---------------- | ----------------------------------------------------------- |
| hero.webp        | Wide stone/gold hero; separately cropped mobile composition |
| hoops.webp       | Earrings category and demo Everyday Hoops                   |
| pendant.webp     | Necklace category and demo Curve Pendant                    |
| rings.webp       | Rings category and demo Fine Ring                           |
| bracelet.webp    | Bracelets category and demo Sculpted Cuff                   |
| flowers.webp     | Statement campaign, styling and journal                     |
| celebration.webp | Occasion campaign and styling                               |
| story.webp       | Our Story, styling and journal                              |
| portrait.webp    | Lifestyle styling gallery                                   |

See `generated-asset-prompts.json` for the prompt set and saved paths. The images depict hypothetical jewellery and models, not actual Tiyas products or brand ambassadors. The footer labels the campaign as concept imagery; product cards with substituted art also carry a Concept image badge and explicit alternate text. The featured edit explains that concept imagery is not actual product photography. All purchase-like actions are labelled preview state in their destination.

## API mapping

The existing read-only product API is consumed without changing its contract or database. When the API provides a real image, it is retained with its supplied alternate text. Missing images or the Stage 01 placeholder use visibly labelled concept imagery. API name, integer-paise price and availability are retained. Sparse catalogues are padded with clearly marked demo cards to preserve four positions; empty/error/loading results use the four sample concepts. These are not offers for sale.

Replace paths centrally in `src/lib/storefront-config.ts`; finalized product photography should be supplied by the API. No remote image domains are enabled. Category/editorial crops are handled by CSS and next/image sizes. Source images retain their original composition; WebP conversion only changes encoding.

## Production assets and decisions still required

- Original reference PNG and approved vector wordmark/logo, with usage rules.
- Approved wide hero and mobile crop/source, showing the actual collection.
- Actual front/detail product photos for every SKU, confirmed names/prices/materials and availability.
- Category images for earrings, necklaces, rings and bracelets.
- Licensed/approved occasion, statement, lifestyle, styling and journal photography with any required model permissions.
- Approved brand story and journal copy; current copy is an editorial draft without material/hallmark claims.
- Confirmed shipping threshold, return window, payment and packaging copy. Values remain configurable in storefront-config.ts; no invented free-shipping threshold or return duration is published.
- Confirmed client care email/contact, official social URLs, legal policies and newsletter provider. Placeholder destinations disclose these pending details; newsletter integration is intentionally absent.

Do not remove concept/preview disclosures until real merchandise and campaign assets are approved. Stage 02 does not implement uploads, a blog CMS or a subscription backend.

## Required before production

- Approved Tiyas wordmark/logo and brand ownership details.
- Actual product photography mapped to catalog IDs/SKUs, with faithful materials, finish, proportions and variants. The current development seed provides 13 public samples and four featured products. Their names/prices and actual photographs still need production approval.
- Approved desktop/mobile hero, occasion and lifestyle campaign images, plus journal imagery. Current crops are art-directed from development images, not final brand assets.
- Confirmed product names/descriptions/prices, contact details and official social profile URLs.
- Approved free-shipping eligibility, return window, packaging and payment copy. No unconfirmed threshold or guarantee is invented.
- Completed privacy, terms and shipping/returns documents before orders open. Current informational pages are honest preview notices.

## Replacing assets

Replace files at the paths above or update `src/lib/storefront-config.ts` and the presentation mapper in `src/lib/catalog-presentation.ts`. Product API photographs take precedence when present; the foundation's catalog-placeholder.svg is never treated as an actual product photo. Remove concept badges only when the API supplies the actual approved photographs. Keep image dimensions/crops responsive and rerun the screenshot suite after replacements.

Stage 03 retains the original campaign assets. Development catalog image records explicitly mark them as concept imagery; variant image references are scoped to the same product. Styling images are illustrative and do not establish actual materials or variant appearance.

## Approved festive redesign

Eight concept assets are under apps/web/public/images/campaign/: tyohar, tyohar-mobile, diamond, temple, brace, pearl, silver and bride (.webp). They were generated with the built-in image_gen tool and delivery-encoded to WebP; originals remain in the tool's generated-image directory. These are campaign concepts, never substituted for actual catalog product images. See homepage-campaign-prompts.json for exact final prompts and paths. Production replacements remain required.

The attached approved screenshot was studied directly. The file design/reference/tiyas-homepage-approved.png was not present and should be restored for handoff. No full reference screenshot is used as website artwork.
