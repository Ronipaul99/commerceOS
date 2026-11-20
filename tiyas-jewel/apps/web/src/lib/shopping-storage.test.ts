import { describe, expect, it } from "vitest";
import { parseShopping, cartKey } from "./shopping-storage";
import { formatINR } from "./money";
const ref = {
  productId: "p1",
  slug: "gold-ring",
  variantId: "v1",
  quantity: 2,
};
describe("anonymous persisted selections", () => {
  it("stores identifiers and quantities, discarding forged prices and other fields", () => {
    const stored = parseShopping(
      JSON.stringify({
        version: 1,
        cart: [{ ...ref, pricePaise: 1, name: "Forged" }],
        wishlist: [{ productId: "p1", slug: "gold-ring", pricePaise: 2 }],
        subtotal: 1,
      }),
    );
    expect(stored.cart).toEqual([ref]);
    expect(stored.wishlist).toEqual([{ productId: "p1", slug: "gold-ring" }]);
    expect(JSON.stringify(stored)).not.toContain("price");
  });
  it("rejects corrupted, incompatible or duplicate selection data", () => {
    for (const raw of [
      "invalid",
      JSON.stringify({ version: 0, cart: [], wishlist: [] }),
      JSON.stringify({ version: 1, cart: [ref, ref], wishlist: [] }),
      JSON.stringify({
        version: 1,
        cart: [{ ...ref, quantity: -1 }],
        wishlist: [],
      }),
    ])
      expect(() => parseShopping(raw)).toThrow();
    expect(parseShopping(null).cart).toEqual([]);
    expect(cartKey(ref)).toBe("p1:v1");
  });
  it("formats safe integer cart totals beyond a single database Int", () => {
    expect(formatINR(2147483648)).toContain("2,14,74,836.48");
    expect(() => formatINR(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => formatINR(1.5)).toThrow();
  });
});
