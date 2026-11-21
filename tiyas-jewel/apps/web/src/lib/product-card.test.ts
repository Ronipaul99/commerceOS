import { describe, expect, it } from "vitest";
import type { Product } from "@tiyas/shared";
import { presentProduct } from "./catalog-presentation";
import {
  cardSelection,
  cardImages,
  verifiedCardDetails,
  formatCardPrice,
  defaultColorVariant,
} from "./product-card";

const product: Product = {
  id: "p1",
  slug: "test-ring",
  name: "Test ring",
  description: "Test catalogue item",
  pricePaise: 325000,
  compareAtPaise: 400000,
  currency: "INR",
  available: true,
  category: { id: "c1", name: "Rings", slug: "rings", description: null },
  images: [],
  collections: [],
  variants: [
    {
      id: "v1",
      sku: "S14",
      name: "Size 14",
      pricePaise: 335000,
      available: false,
    },
    {
      id: "v2",
      sku: "S16",
      name: "Size 16",
      pricePaise: 345000,
      available: true,
    },
  ],
};
describe("shared product card", () => {
  it("defaults only complete colour variants and skips unavailable colours", () => {
    const card = presentProduct(product);
    expect(defaultColorVariant(card)).toBeNull();
    expect(
      defaultColorVariant(card, {
        colors: [{ name: "Green", hex: "#005a35", variantId: "v2" }],
      }),
    ).toBeNull();
    expect(
      defaultColorVariant(card, {
        colors: [
          { name: "Ruby", hex: "#a00000", variantId: "v1" },
          { name: "Green", hex: "#005a35", variantId: "v2" },
        ],
      }),
    ).toBe("v2");
    expect(
      defaultColorVariant(presentProduct({ ...product, available: false }), {
        colors: [
          { name: "Ruby", hex: "#a00000", variantId: "v1" },
          { name: "Green", hex: "#005a35", variantId: "v2" },
        ],
      }),
    ).toBeNull();
  });
  it("matches reference rupee formatting without losing fractional paise", () => {
    expect(formatCardPrice(749000)).toBe("₹7,490");
    expect(formatCardPrice(749050)).toBe("₹7,490.50");
    expect(() => formatCardPrice(-1)).toThrow(RangeError);
  });
  it("uses actual variant prices and requires a real available selection", () => {
    const card = presentProduct(product);
    expect(cardSelection(card)).toMatchObject({
      pricePaise: 335000,
      from: true,
      available: false,
      compareAtPaise: null,
    });
    expect(cardSelection(card, "v1")).toMatchObject({
      pricePaise: 335000,
      available: false,
    });
    expect(cardSelection(card, "v2")).toMatchObject({
      pricePaise: 345000,
      from: false,
      available: true,
    });
    expect(cardSelection(card, "invalid")).toMatchObject({
      from: true,
      available: false,
    });
    expect(
      cardSelection(presentProduct({ ...product, available: false }), "v2")
        .available,
    ).toBe(false);
  });
  it("derives genuine discounts and never shows invalid or unselected-variant discounts", () => {
    expect(
      cardSelection(
        presentProduct({
          ...product,
          variants: [],
          pricePaise: 749000,
          compareAtPaise: 899900,
        }),
      ).discountPercent,
    ).toBe(16);
    expect(
      cardSelection(
        presentProduct({ ...product, variants: [], compareAtPaise: 300000 }),
      ).compareAtPaise,
    ).toBeNull();
    expect(cardSelection(presentProduct(product)).discountPercent).toBe(0);
  });
  it("keeps missing attributes and reviews absent and rejects invalid display metadata", () => {
    expect(verifiedCardDetails()).toMatchObject({
      colors: [],
      weightGrams: undefined,
      rating: undefined,
    });
    expect(
      verifiedCardDetails({
        weightGrams: -2,
        colors: [{ name: "Unsafe", hex: "url(example)" }],
        rating: { value: 8, count: 10 },
      }),
    ).toMatchObject({ colors: [], weightGrams: undefined, rating: undefined });
    expect(
      verifiedCardDetails({
        material: "Brass with Kundan",
        size: "Adjustable (14–16 in)",
        weightGrams: 78,
        colors: [{ name: "Green", hex: "#005a35", variantId: "v2" }],
      }),
    ).toMatchObject({
      size: "Adjustable (14–16 in)",
      weightGrams: 78,
      colors: [{ name: "Green", hex: "#005a35", variantId: "v2" }],
    });
  });
  it("keeps placeholder and missing imagery on the existing labelled fallback", () => {
    expect(cardImages(presentProduct(product))[0].url).toMatch(/^\/images\//);
    expect(
      cardImages(
        presentProduct({
          ...product,
          images: [
            {
              id: "missing",
              url: "/images/catalog-placeholder.svg",
              alt: "Pending",
              position: 0,
            },
          ],
        }),
      )[0].url,
    ).not.toContain("placeholder");
  });
});
