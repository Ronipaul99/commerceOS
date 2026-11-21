import { describe, it, expect } from "vitest";
import { productTransferSchema, rupeesToPaise } from "../src/index.js";
function transfer() {
  return {
    format: "tiyas-product",
    version: 1,
    currency: "INR",
    product: {
      name: "Silver floral necklace",
      slug: "silver-floral-necklace",
      description: "Necklace with matching earrings.",
      categorySlug: "necklaces",
      collectionSlugs: ["silver-replica"],
      price: "1490.25",
      compareAtPrice: "1990.00",
      sku: "SR-001",
      stockQuantity: 0,
      active: false,
      featured: true,
      details: {
        subtitle: "Necklace set",
        material: "Confirmed by owner",
        weightGrams: null,
        size: "",
        colors: [{ name: "Silver tone", hex: "#C0C0C0" }],
      },
      images: [
        {
          fileName: "front.webp",
          alt: "Floral necklace and matching earrings",
        },
      ],
      variants: [
        {
          name: "Standard",
          sku: "SR-001-STD",
          price: null,
          stockQuantity: 0,
          active: true,
          imageFileName: "front.webp",
        },
      ],
    },
  };
}
describe("portable product details", () => {
  it("accepts complete product facts, optional weight and filename-linked variants with exact INR conversion", () => {
    const data = productTransferSchema.parse(transfer());
    expect(rupeesToPaise(data.product.price)).toBe(149025);
    expect(data.product.details?.weightGrams).toBeNull();
    expect(rupeesToPaise("0.29")).toBe(29);
  });
  it.each(["-1", "1.999", "NaN", "Infinity", "1000001.00", "0.00"])(
    "rejects invalid or excessive price %s",
    (price) => {
      const v = transfer();
      v.product.price = price;
      expect(productTransferSchema.safeParse(v).success).toBe(false);
    },
  );
  it("rejects comparison-price and stock violations", () => {
    const v = transfer();
    v.product.compareAtPrice = "1.00";
    v.product.stockQuantity = -1;
    expect(productTransferSchema.safeParse(v).success).toBe(false);
  });
  it("rejects duplicate SKUs, filenames and unknown variant image references", () => {
    const v = transfer();
    v.product.variants[0]!.sku = v.product.sku;
    v.product.variants[0]!.imageFileName = "missing.webp";
    v.product.images.push(v.product.images[0]!);
    const parsed = productTransferSchema.safeParse(v);
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues.length).toBeGreaterThanOrEqual(3);
  });
  it.each([
    "../photo.webp",
    "https://example.com/photo.png",
    "folder/photo.png",
    "photo.svg",
  ])("rejects non-image or path filename %s", (fileName) => {
    const v = transfer();
    v.product.images[0]!.fileName = fileName;
    expect(productTransferSchema.safeParse(v).success).toBe(false);
  });
  it("rejects currency/version drift and hidden payload fields", () => {
    expect(
      productTransferSchema.safeParse({ ...transfer(), currency: "USD" })
        .success,
    ).toBe(false);
    expect(
      productTransferSchema.safeParse({ ...transfer(), version: 2 }).success,
    ).toBe(false);
    expect(
      productTransferSchema.safeParse({
        ...transfer(),
        product: { ...transfer().product, id: "another-product" },
      }).success,
    ).toBe(false);
  });
});
