import { buildApp } from "../src/app.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { describe, expect, it } from "vitest";
import { randomBytes, createHmac } from "node:crypto";
import {
  addressSchema,
  guestSchema,
  checkoutQuoteRequestSchema,
} from "@tiyas/shared";
import { parseEnv } from "../src/config/env.js";
import { calculateTotals } from "../src/modules/checkout/pricing.js";
import {
  validSignature,
  razorpayGateway,
} from "../src/integrations/payments.js";
const config = (extra: Record<string, string> = {}) =>
  parseEnv({ DATABASE_URL: "postgresql://test@localhost/test", ...extra });
describe("Checkout contracts and precise pricing", () => {
  it("normalizes Indian guest contact details and rejects malformed mobile numbers", () => {
    expect(
      guestSchema.parse({
        fullName: "Test Guest",
        email: "Guest@example.test",
        mobile: "+91 9876543210",
      }).mobile,
    ).toBe("9876543210");
    expect(
      guestSchema.safeParse({
        fullName: "T",
        email: "invalid",
        mobile: "1234567890",
      }).success,
    ).toBe(false);
  });
  it("requires a complete serviceable-shaped Indian address", () => {
    const a = {
      line1: "10 Sample Road",
      city: "Mumbai",
      state: "Maharashtra",
      pinCode: "400001",
    };
    expect(addressSchema.parse(a).country).toBe("IN");
    expect(
      addressSchema.safeParse({ ...a, state: "Invalid", pinCode: "000000" })
        .success,
    ).toBe(false);
    expect(addressSchema.safeParse({ ...a, country: "US" }).success).toBe(
      false,
    );
  });
  it("does not accept empty checkout carts or client prices", () => {
    expect(
      checkoutQuoteRequestSchema.safeParse({ items: [], pinCode: "400001" })
        .success,
    ).toBe(false);
    expect(
      checkoutQuoteRequestSchema.safeParse({
        items: [
          {
            productId: "test",
            slug: "test",
            variantId: null,
            quantity: 1,
            pricePaise: 1,
          },
        ],
        pinCode: "400001",
      }).success,
    ).toBe(false);
  });
  it("rounds included and exclusive taxes using integer arithmetic", () => {
    expect(
      calculateTotals(
        100001,
        config({ TAX_BPS: "300", TAX_MODE: "inclusive" }),
      ),
    ).toMatchObject({ taxPaise: 2913, totalPaise: 109901, discountPaise: 0 });
    expect(
      calculateTotals(
        100001,
        config({ TAX_BPS: "300", TAX_MODE: "exclusive" }),
      ),
    ).toMatchObject({ taxPaise: 3000, totalPaise: 112901 });
  });
  it("applies free shipping at the exact threshold and enforces total bounds", () => {
    expect(calculateTotals(199900, config()).shippingPaise).toBe(0);
    expect(calculateTotals(199899, config()).shippingPaise).toBe(9900);
    expect(() => calculateTotals(100000001, config())).toThrow();
  });
  it("blocks development payments in production, live keys and incomplete Razorpay setup", () => {
    expect(() =>
      config({ NODE_ENV: "production", PAYMENT_ADAPTER: "development" }),
    ).toThrow();
    expect(config({ NODE_ENV: "production" }).PAYMENT_ADAPTER).toBe("disabled");
    expect(() => config({ RAZORPAY_KEY_ID: "rzp_live_fixture" })).toThrow();
    expect(() => config({ PAYMENT_ADAPTER: "razorpay" })).toThrow();
  });
  it("verifies exact raw webhook bytes and rejects altered/invalid signatures", () => {
    const secret = randomBytes(32).toString("hex");
    const body = Buffer.from('{ "test": true }');
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(validSignature(body, signature, secret)).toBe(true);
    expect(
      validSignature(Buffer.from('{"test":true}'), signature, secret),
    ).toBe(false);
    expect(validSignature(body, "invalid", secret)).toBe(false);
  });
  it("creates only INR provider orders server-side without forwarding customer details", async () => {
    let request: RequestInit | undefined;
    const gateway = razorpayGateway(config(), async (_url, init) => {
      request = init;
      return new Response(
        JSON.stringify({
          id: "order_test",
          amount: 20000,
          currency: "INR",
          receipt: "TJ-test",
          status: "created",
        }),
        { status: 200 },
      );
    });
    await gateway.createOrder(20000, "TJ-test");
    expect(JSON.parse(String(request?.body))).toEqual({
      amount: 20000,
      currency: "INR",
      receipt: "TJ-test",
      partial_payment: false,
    });
    expect(request?.redirect).toBe("error");
  });
});

it("rate-limits checkout creation even when forwarding headers are spoofed", async () => {
  const app = await buildApp(config(), {
    db: {} as PrismaClient,
    logger: false,
  });
  try {
    for (let i = 0; i < 12; i++)
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/checkout/place",
            payload: {},
            headers: { "x-forwarded-for": `192.0.2.${i}` },
          })
        ).statusCode,
      ).toBe(400);
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/checkout/place",
      payload: {},
    });
    expect(r.statusCode).toBe(429);
    expect(r.headers["retry-after"]).toBeDefined();
  } finally {
    await app.close();
  }
});
