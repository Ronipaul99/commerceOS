import { describe, expect, it } from "vitest";
import type { Product } from "@tiyas/shared";
import { featuredProducts, presentProduct } from "./catalog-presentation";
const product: Product = {
  id: "p1",
  slug: "catalog-ring",
  name: "Catalog ring",
  description: "Example",
  pricePaise: 125000,
  currency: "INR",
  available: false,
  category: { id: "c1", name: "Rings", slug: "rings", description: null },
  images: [],
  variants: [],
  collections: [],
};
describe("homepage catalog presentation", () => {
  it("keeps four cards during sparse or empty API results", () => {
    expect(featuredProducts([])).toHaveLength(4);
    const cards = featuredProducts([product]);
    expect(cards).toHaveLength(4);
    expect(cards[0]).toMatchObject({
      name: "Catalog ring",
      pricePaise: 125000,
      source: "api",
      available: false,
    });
    expect(cards.slice(1).every((card) => card.source === "demo")).toBe(true);
  });
  it("labels concept imagery when real catalog images are unavailable", () => {
    expect(presentProduct(product).conceptImage).toBe(true);
    expect(
      presentProduct({
        ...product,
        images: [
          {
            id: "i1",
            url: "/images/catalog-placeholder.svg",
            alt: "Pending",
            position: 0,
          },
        ],
      }).conceptImage,
    ).toBe(true);
    expect(
      presentProduct({
        ...product,
        images: [
          {
            id: "i1",
            url: "/images/approved.jpg",
            alt: "Actual product",
            position: 0,
          },
        ],
      }),
    ).toMatchObject({
      image: "/images/approved.jpg",
      alt: "Actual product",
      conceptImage: false,
    });
  });
});
