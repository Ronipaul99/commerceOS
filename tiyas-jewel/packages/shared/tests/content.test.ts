import { describe, it, expect } from "vitest";
import {
  storefrontHrefSchema,
  contentImageSchema,
  contentValueSchema,
  otpCompleteSchema,
} from "../src/index.js";
describe("safe CMS contracts", () => {
  it.each([
    "javascript:alert(1)",
    "//evil.test",
    "/admin",
    "/api/v1/admin",
    "/shop/../admin",
    "/shop%2f..",
    "https://evil.test",
  ])("rejects unsafe link %s", (v) =>
    expect(storefrontHrefSchema.safeParse(v).success).toBe(false),
  );
  it.each([
    "/shop",
    "/shop?sort=newest",
    "/collections/silver-replica",
    "/info/our-story",
    "/#our-story",
    "/cart",
  ])("accepts storefront link %s", (v) =>
    expect(storefrontHrefSchema.safeParse(v).success).toBe(true),
  );
  it.each([
    "https://evil.test/image.png",
    "/images/../secret.webp",
    "/images/file.svg",
    "/images/a%2fb.png",
  ])("rejects unsafe image %s", (v) =>
    expect(contentImageSchema.safeParse(v).success).toBe(false),
  );
  it("does not allow unknown page fields or HTML instructions", () =>
    expect(
      contentValueSchema.safeParse({
        type: "page",
        content: {
          title: "Page",
          description: "",
          body: "Plain text",
          image: "",
          script: "alert(1)",
        },
      }).success,
    ).toBe(false));
  it("requires a valid hero when enabled", () =>
    expect(
      contentValueSchema.safeParse({
        type: "homepage",
        content: { sections: [{ id: "hero", kind: "hero", title: "Hero" }] },
      }).success,
    ).toBe(false));
  it("requires a six-digit OTP and a strong password", () =>
    expect(
      otpCompleteSchema.safeParse({
        email: "owner@example.test",
        purpose: "RESET",
        code: "12345",
        password: "short",
      }).success,
    ).toBe(false));
});
