# Product JSON, image prompts and section previews

These helpers use the existing admin product form, CMS, authorized image upload and private preview. They add no public mutation endpoint, database migration or external AI dependency.

## Fill a product using JSON

Open Add Product or an existing product's edit screen. Select **Download JSON template** to receive a versioned file containing every product field, available category/collection slugs and examples for variants, colours and image descriptions. Fill the `product` object, then select **Import JSON** and confirm **Fill product form**. Review the populated form and save normally. **Export current details** downloads the current draft, including unsaved changes.

The blank template intentionally has no invented specifications, price or stock. Complete required strings and the price before importing. Categories and collections use slugs from `_guide`; the guide is informational and never becomes product data. Prices are INR rupee strings with at most two decimal places; the shared schema validates precise integer-paise conversion and the existing product rules. Use `null` for an absent compare-at price, variant price or weight. Empty variant/image/colour arrays are supported.

Example file structure (replace illustrative values with verified product data):

```json
{
  "format": "tiyas-product",
  "version": 1,
  "currency": "INR",
  "product": {
    "name": "Your product name",
    "slug": "your-product-name",
    "description": "Your verified product description.",
    "categorySlug": "necklaces",
    "collectionSlugs": [],
    "price": "1490.00",
    "compareAtPrice": null,
    "sku": "YOUR-UNIQUE-SKU",
    "stockQuantity": 0,
    "active": false,
    "featured": false,
    "details": {
      "subtitle": "",
      "material": "",
      "weightGrams": null,
      "size": "",
      "colors": []
    },
    "images": [
      { "fileName": "front.webp", "alt": "Describe the actual front view" }
    ],
    "variants": [
      {
        "name": "Your option",
        "sku": "YOUR-UNIQUE-VARIANT-SKU",
        "price": null,
        "stockQuantity": 0,
        "active": false,
        "imageFileName": "front.webp"
      }
    ]
  }
}
```

JSON files are limited to 256 KB. Invalid JSON, unsupported versions/currency, unknown fields, invalid prices/facts, duplicate SKUs/filenames and invalid variant-image references are rejected. Unknown category/collection slugs leave the current form intact. Importing does not create or publish a product.

Image bytes are uploaded separately. Use exact filenames, including case, to automatically apply descriptions, image order and variant links from JSON. Pending files are listed and block saving until uploaded or explicitly removed from the import. Existing attached images are retained; matching descriptions are updated. Existing edit-screen exports use the displayed stored filenames, allowing re-import without uploading those images again. Variant SKU matching preserves existing identifiers and optimistic stock versions; use the normal form when renaming an existing SKU. The backend still enforces historical-variant, asset-ownership and stock concurrency safeguards.

## Product and CMS image prompts

Use **View image prompt** to inspect/copy the prompt or **Download prompt** for a text file. Attach the real product photograph to an image-capable AI tool and use that prompt. Prompts specify product fidelity, crop-safe composition, the established Tiyas palette and no baked-in UI/text/prices. They do not call an AI provider or upload photographs to a third party automatically. Review generated imagery against the real product before using it.

| Placement | Requested size | Aspect ratio |
| --- | --- | --- |
| Product master | 1800 × 1200 | 3:2, with margins for narrower card crops |
| Desktop hero | 2400 × 800 | 3:1 |
| Mobile hero | 900 × 1125 | 4:5 |
| Category thumbnail | 800 × 800 | 1:1 |
| Collection / occasion card | 1200 × 800 | 3:2 |
| Campaign banner | 2400 × 800 | 3:1 |
| Collection showcase | 1500 × 900 | 5:3 |
| Promotional strip | 2400 × 400 | 6:1 |
| Brand story | 1800 × 800 | 9:4 |
| Static page image | 1800 × 720 | 5:2 |

Hero prompts offer desktop/mobile selection. Under **Image sources & mobile composition**, **Upload mobile hero image** stores a dedicated crop without replacing the desktop image. Static pages also expose the prompt helper. Text-only/product-driven CMS sections do not request decorative imagery.

The prompt requests a compressed sRGB WebP under 5 MB, preferably quality 85–88. AI tools vary in supported output formats and dimensions; the prompt explicitly asks them to state limitations rather than pretend to produce WebP. Renaming an extension is not conversion.

The actual upload guarantee is enforced by the existing Fastify image pipeline: validate actual JPEG/PNG/WebP bytes and dimensions, reject unsupported/animated/oversized input, normalize orientation, resize within 2400 × 2400 without enlargement, strip source metadata and encode WebP at quality 88. Only generated UUID `.webp` objects are stored through the configured local/OCI adapter. CMS and products share this path. Prompt downloads contain no credentials or storage endpoints.

## Preview a CMS section in context

The homepage editor's **Preview** saves a private draft and opens `/admin-preview?key=homepage&section=<selected-section-id>`. It renders the entire selected section with the nearest visible section above and below, in the saved order, using the real storefront components, product API, header and footer. The selected section has a subtle outline; the page scrolls to it with some preceding content visible. A selected hidden draft section can be previewed with a notice while remaining hidden on the live page. First/last sections naturally have one neighbour.

**Preview entire page** opens the complete saved draft. Static-page preview continues to render the full draft page. Unknown section identifiers return not found. Both modes retain admin authorization and no-index/no-referrer metadata; draft-only images remain private and previewing never publishes content. Responsive composition follows the current browser width.

Verification results and screenshot locations are recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
