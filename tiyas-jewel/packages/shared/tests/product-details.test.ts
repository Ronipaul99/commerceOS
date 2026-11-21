import { describe, expect, it } from "vitest";
import { productDetailsSchema } from "../src/schemas/catalog.js";
describe("product jewellery details", () => {
  it("accepts the approved specifications and optional absent fields", () => {
    expect(
      productDetailsSchema.parse({
        material: "Brass with Kundan",
        weightGrams: 78,
        size: "Adjustable",
        colors: [{ name: "Green", hex: "#00582d" }],
      }).weightGrams,
    ).toBe(78);
    expect(productDetailsSchema.parse({})).toEqual({});
  });
  it("rejects invalid weights, colours, oversized data and fabricated review fields", () => {
    for (const data of [
      { weightGrams: -1 },
      { weightGrams: 0 },
      { colors: [{ name: "Green", hex: "url(foo)" }] },
      { rating: 4.8 },
      { bestseller: true },
      { subtitle: "a".repeat(161) },
    ])
      expect(productDetailsSchema.safeParse(data).success).toBe(false);
  });
});
