import { describe, expect, it } from "vitest";
import type { Product } from "@tiyas/shared";
import { cartRequestSchema, catalogQuerySchema } from "@tiyas/shared";
import { resolveCart } from "../src/modules/catalog/cart.js";
const product: Product = {
  id: "p1",
  slug: "gold-ring",
  name: "Gold Ring",
  description: "Example",
  pricePaise: 100000,
  currency: "INR",
  available: true,
  maxQuantity: 5,
  category: { id: "c1", name: "Rings", slug: "rings", description: null },
  images: [],
  variants: [],
  collections: [],
};
const item = {
  productId: product.id,
  slug: product.slug,
  variantId: null,
  quantity: 2,
};
describe("shopping contracts and current-price cart resolution", () => {
  it("validates price bounds, sort values and explicit featured booleans", () => {
    expect(catalogQuerySchema.parse({ featured: "false" }).featured).toBe(
      false,
    );
    for (const query of [
      { minPricePaise: "200", maxPricePaise: "100" },
      { sort: "random" },
      { availability: "true" },
      { featured: "1" },
      { minPricePaise: "1.5" },
      { ids: Array.from({ length: 51 }, (_, index) => `p${index}`).join(",") },
    ])
      expect(catalogQuerySchema.safeParse(query).success).toBe(false);
  });
  it("rejects client prices, duplicate selections and invalid quantities", () => {
    expect(
      cartRequestSchema.safeParse({ items: [{ ...item, pricePaise: 1 }] })
        .success,
    ).toBe(false);
    expect(cartRequestSchema.safeParse({ items: [item, item] }).success).toBe(
      false,
    );
    for (const quantity of [0, 1.5, 100])
      expect(
        cartRequestSchema.safeParse({ items: [{ ...item, quantity }] }).success,
      ).toBe(false);
  });
  it("calculates only from current catalogue prices and clamps current stock", () => {
    const quote = resolveCart([{ ...item, quantity: 8 }], [product]);
    expect(quote.items[0]).toMatchObject({
      quantity: 5,
      requestedQuantity: 8,
      status: "adjusted",
      unitPricePaise: 100000,
    });
    expect(quote.subtotalPaise).toBe(500000);
    expect(
      resolveCart([item], [{ ...product, pricePaise: 150000 }]).subtotalPaise,
    ).toBe(300000);
  });
  it("requires an explicit matching variant and never falls back from an unavailable one", () => {
    const ring = {
      ...product,
      variants: [
        {
          id: "v1",
          name: "Size 12",
          sku: "R12",
          pricePaise: 125000,
          available: true,
          maxQuantity: 2,
        },
        {
          id: "v2",
          name: "Size 14",
          sku: "R14",
          pricePaise: null,
          available: false,
          maxQuantity: 0,
        },
      ],
    };
    expect(resolveCart([item], [ring]).items[0]?.status).toBe(
      "variant_required",
    );
    expect(
      resolveCart([{ ...item, variantId: "foreign" }], [ring]).items[0]?.status,
    ).toBe("variant_missing");
    expect(
      resolveCart([{ ...item, variantId: "v2" }], [ring]).subtotalPaise,
    ).toBe(0);
    expect(
      resolveCart([{ ...item, variantId: "v1" }], [ring]).subtotalPaise,
    ).toBe(250000);
  });
  it("excludes deleted, hidden and out-of-stock records", () => {
    expect(resolveCart([item], []).items[0]?.status).toBe("missing");
    expect(
      resolveCart([{ ...item, slug: "wrong-slug" }], [product]).items[0]
        ?.status,
    ).toBe("missing");
    expect(
      resolveCart([item], [{ ...product, available: false, maxQuantity: 0 }])
        .subtotalPaise,
    ).toBe(0);
  });
});
