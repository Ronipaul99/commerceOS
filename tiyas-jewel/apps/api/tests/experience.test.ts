import { describe, it, expect } from "vitest";
import { allocateDiscount } from "../src/modules/coupons/service.js";
import {
  instagramReelUrlSchema,
  reelInputSchema,
  guestSchema,
  addressSchema,
  couponInputSchema,
  reviewSubmitSchema,
  contentSectionSchema,
  storefrontHrefSchema,
} from "@tiyas/shared";
describe("customer experience invariants", () => {
  it("allocates every paise deterministically without discounting ineligible lines", () => {
    expect(allocateDiscount([1, 1, 1, 0], 2)).toEqual([1, 1, 0, 0]);
    for (let n = 1; n < 400; n++) {
      const lines = [100001, n, 0, 3209],
        discount = Math.min(n * 3, 103210 + n),
        result = allocateDiscount(lines, discount);
      expect(result.reduce((a, b) => a + b, 0)).toBe(discount);
      result.forEach((a, i) => expect(a).toBeLessThanOrEqual(lines[i]!));
    }
  });
  it("rejects impossible discount amounts", () => {
    expect(() => allocateDiscount([10], 11)).toThrow();
    expect(() => allocateDiscount([10], -1)).toThrow();
  });
  it("normalizes phone input while preserving Indian names", () => {
    expect(
      guestSchema.parse({
        fullName: "अनन्या रॉय",
        email: "ASHA@example.test",
        mobile: "+91 (98765) 43210",
      }),
    ).toMatchObject({
      fullName: "अनन्या रॉय",
      email: "asha@example.test",
      mobile: "9876543210",
    });
    expect(
      guestSchema.safeParse({
        fullName: " ",
        email: "a@example.test",
        mobile: "123",
      }).success,
    ).toBe(false);
  });
  it("requires core address fields and keeps landmark optional", () => {
    expect(
      addressSchema.parse({
        line1: "12 Lake Road",
        city: "Kolkata",
        state: "West Bengal",
        pinCode: "700001",
      }).landmark,
    ).toBe("");
    expect(
      addressSchema.safeParse({
        line1: "",
        city: "",
        state: "West Bengal",
        pinCode: "000000",
      }).success,
    ).toBe(false);
  });
  it("validates code, percent, dates and consent", () => {
    expect(
      couponInputSchema.safeParse({
        code: "SAVE",
        type: "PERCENT",
        value: 10001,
        startsAt: "2026-01-01T00:00:00Z",
        endsAt: "2026-01-02T00:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      reviewSubmitSchema.safeParse({
        grant: "a".repeat(64),
        displayName: "Asha",
        text: "An honest review of this lovely jewellery piece.",
        rating: 5,
        consent: false,
      }).success,
    ).toBe(false);
  });
  it("normalizes Instagram Reel links and rejects unrelated destinations", () => {
    expect(
      instagramReelUrlSchema.parse(
        "https://instagram.com/reel/Fake_Example/?igsh=share",
      ),
    ).toBe("https://www.instagram.com/reel/Fake_Example/");
    for (const url of [
      "https://instagram.com.example.test/reel/abc/",
      "https://instagram.com/p/abc/",
      "http://instagram.com/reel/abc/",
      "https://other.example.test/reel/abc/",
    ])
      expect(instagramReelUrlSchema.safeParse(url).success).toBe(false);
  });
  it("requires a product tag and rights before publishing an Instagram reel", () => {
    const draft = {
      title: "Look",
      posterId: "abbbdfbf-f46b-4385-8e3f-abdeab1c2345",
      instagramUrl: "https://www.instagram.com/reel/Fixture123/",
      transcript: "An ivory saree and matching jewellery.",
    };
    expect(reelInputSchema.parse(draft).published).toBe(false);
    expect(
      reelInputSchema.safeParse({
        ...draft,
        published: true,
        rightsConfirmed: true,
      }).success,
    ).toBe(false);
    expect(
      reelInputSchema.safeParse({
        ...draft,
        published: true,
        rightsConfirmed: true,
        productIds: ["active-id"],
      }).success,
    ).toBe(true);
  });
  it("keeps CMS review and reel sections compatible with existing documents", () => {
    expect(
      contentSectionSchema.parse({
        id: "feedback",
        title: "Customer feedback",
        kind: "reviews",
      }).recordIds,
    ).toEqual([]);
    expect(storefrontHrefSchema.safeParse("/happy-customers").success).toBe(
      true,
    );
    expect(storefrontHrefSchema.safeParse("/admin/reviews").success).toBe(
      false,
    );
  });
});
