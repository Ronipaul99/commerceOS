import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { checkoutService } from "../src/modules/checkout/service.js";
import {
  checkoutRequestSchema,
  orderViewSchema,
  checkoutQuoteSchema,
} from "@tiyas/shared";
import type {
  GatewayOrder,
  GatewayPayment,
  PaymentGateway,
} from "../src/integrations/payments.js";
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated migrated/seeded database",
  );
const secret = randomBytes(32).toString("hex");
const webhookSecret = randomBytes(32).toString("hex");
class FakeGateway implements PaymentGateway {
  orders = new Map<string, GatewayOrder>();
  entries = new Map<string, GatewayPayment>();
  creates = 0;
  ambiguous = false;
  async createOrder(amount: number, receipt: string) {
    this.creates++;
    const o = {
      id: `order_${randomBytes(10).toString("hex")}`,
      amount,
      currency: "INR",
      receipt,
      status: "created",
    };
    this.orders.set(o.id, o);
    if (this.ambiguous) {
      this.ambiguous = false;
      throw Error("Ambiguous test timeout");
    }
    return o;
  }
  async findOrder(receipt: string) {
    return [...this.orders.values()].find((o) => o.receipt === receipt) ?? null;
  }
  async getOrder(id: string) {
    return this.orders.get(id)!;
  }
  async getPayment(id: string) {
    return this.entries.get(id)!;
  }
  async payments(id: string) {
    return [...this.entries.values()].filter((p) => p.order_id === id);
  }
  payment(orderId: string, status = "captured", amount?: number) {
    const o = this.orders.get(orderId)!;
    const p = {
      id: `pay_${randomBytes(10).toString("hex")}`,
      order_id: orderId,
      amount: amount ?? o.amount,
      currency: "INR",
      status,
    };
    this.entries.set(p.id, p);
    return p;
  }
}
let app: FastifyInstance;
let fake: FakeGateway;
const ids: string[] = [];
const eventIds: string[] = [];
const config = parseEnv({
  DATABASE_URL: url,
  NODE_ENV: "test",
  PAYMENT_ADAPTER: "razorpay",
  RAZORPAY_KEY_ID: "rzp_test_fixture",
  RAZORPAY_KEY_SECRET: secret,
  RAZORPAY_WEBHOOK_SECRET: webhookSecret,
  COD_ENABLED: "true",
  TAX_BPS: "300",
});
beforeEach(async () => {
  fake = new FakeGateway();
  app = await buildApp(config, { logger: false, gateway: fake });
});
afterEach(async () => {
  const orders = await app.db.order.findMany({
    where: { items: { some: { productId: { in: ids } } } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  await app.db.paymentWebhook.deleteMany({
    where: { eventId: { in: eventIds } },
  });
  await app.db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await app.db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await app.db.order.deleteMany({ where: { id: { in: orderIds } } });
  await app.db.product.deleteMany({ where: { id: { in: ids } } });
  ids.length = 0;
  eventIds.length = 0;
  fake.orders.clear();
  fake.entries.clear();
  fake.creates = 0;
  fake.ambiguous = false;
  await app.close();
});
afterAll(async () => {
  await app?.close();
});
async function fixture(stock = 5, variants = false) {
  const category = await app.db.category.findUniqueOrThrow({
    where: { slug: "earrings" },
  });
  const slug = `checkout-test-${randomUUID()}`;
  const p = await app.db.product.create({
    data: {
      name: "Checkout test piece",
      slug,
      description: "Temporary isolated test fixture",
      pricePaise: 100001,
      stockQuantity: stock,
      categoryId: category.id,
      ...(variants
        ? {
            variants: {
              create: [
                {
                  name: "Small",
                  sku: randomUUID(),
                  pricePaise: 110001,
                  stockQuantity: stock,
                },
                { name: "Sold out", sku: randomUUID(), stockQuantity: 0 },
              ],
            },
          }
        : {}),
    },
    include: { variants: true },
  });
  ids.push(p.id);
  return {
    p,
    item: {
      productId: p.id,
      slug,
      variantId: variants ? p.variants[0]!.id : null,
      quantity: 1,
    },
  };
}
async function input(
  item: {
    productId: string;
    slug: string;
    variantId: string | null;
    quantity: number;
  },
  method: "ONLINE" | "COD" = "ONLINE",
) {
  const q = await app.inject({
    method: "POST",
    url: "/api/v1/checkout/quote",
    payload: { items: [item], pinCode: "400001" },
  });
  expect(q.statusCode).toBe(200);
  const quote = checkoutQuoteSchema.parse(q.json()).data;
  return checkoutRequestSchema.parse({
    items: [item],
    pinCode: "400001",
    customer: {
      fullName: "Test Guest",
      email: "checkout@example.test",
      mobile: "9876543210",
    },
    address: {
      line1: "10 Sample Road",
      city: "Mumbai",
      state: "Maharashtra",
      pinCode: "400001",
      country: "IN",
    },
    paymentMethod: method,
    expectedTotalPaise: quote.totalPaise,
    quoteFingerprint: quote.fingerprint,
    idempotencyKey: randomUUID(),
    confirmationToken: randomBytes(32).toString("hex"),
  });
}
async function place(v: Awaited<ReturnType<typeof input>>) {
  return app.inject({
    method: "POST",
    url: "/api/v1/checkout/place",
    payload: v,
  });
}
async function webhook(
  payment: GatewayPayment,
  id = `evt_${randomUUID()}`,
  event = "payment.captured",
) {
  eventIds.push(id);
  const raw = JSON.stringify({
    event,
    payload: { payment: { entity: { id: payment.id } } },
  });
  const sig = createHmac("sha256", webhookSecret).update(raw).digest("hex");
  return app.inject({
    method: "POST",
    url: "/api/v1/webhooks/razorpay",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": sig,
      "x-razorpay-event-id": id,
    },
    payload: raw,
  });
}
async function confirm(token: string) {
  const r = await app.inject({
    method: "POST",
    url: "/api/v1/orders/confirmation",
    payload: { token },
  });
  expect(r.statusCode).toBe(200);
  return orderViewSchema.parse(r.json()).data;
}
describe("Transactional guest checkout", () => {
  it("places COD, persists snapshots and accurate totals with no payment claim", async () => {
    const { p, item } = await fixture();
    const v = await input(item, "COD");
    const r = await place(v);
    expect(r.statusCode).toBe(200);
    const order = orderViewSchema.parse(r.json()).data;
    expect(order).toMatchObject({
      accepted: true,
      operationalStatus: "NEW",
      paymentStatus: "COD_PENDING",
      subtotalPaise: 100001,
      taxPaise: 2913,
      shippingPaise: 9900,
      totalPaise: 109901,
    });
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(4);
    await app.db.product.update({
      where: { id: p.id },
      data: { name: "Changed", pricePaise: 1 },
    });
    const confirmed = await confirm(v.confirmationToken);
    const [clock] = await app.db.$queryRaw<
      { timezone: string; epoch: string }[]
    >`SELECT current_setting('TimeZone') AS timezone, (EXTRACT(EPOCH FROM "createdAt") * 1000)::text AS epoch FROM "Order" WHERE "orderNumber" = ${order.orderNumber}`;
    if (!clock) throw new Error("Persisted order timestamp was not found");
    expect(clock.timezone).toBe("UTC");
    expect(Date.parse(confirmed.createdAt!)).toBe(Number(clock.epoch));
    expect(confirmed.completedAt).toBeNull();
    expect(confirmed.items[0]).toMatchObject({
      name: "Checkout test piece",
      unitPricePaise: 100001,
    });
  });
  it("rejects invalid addresses, empty cart, client prices and coupon fields", async () => {
    const { item } = await fixture();
    const v = await input(item);
    for (const payload of [
      { ...v, address: { ...v.address, pinCode: "000000" } },
      { ...v, items: [] },
      { ...v, items: [{ ...item, unitPricePaise: 1 }] },
      { ...v, coupon: "FAKE" },
    ])
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/checkout/place",
            payload,
          })
        ).statusCode,
      ).toBe(400);
  });
  it("rejects stale or forged totals without changing stock", async () => {
    const { p, item } = await fixture();
    const v = await input(item);
    expect((await place({ ...v, expectedTotalPaise: 1 })).statusCode).toBe(409);
    await app.db.product.update({
      where: { id: p.id },
      data: { pricePaise: 200001 },
    });
    expect((await place(v)).statusCode).toBe(409);
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(5);
  });
  it("returns one COD order for concurrent duplicate requests and rejects key reuse", async () => {
    const { p, item } = await fixture(1);
    const v = await input(item, "COD");
    const replies = await Promise.all([place(v), place(v)]);
    expect(replies.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(replies[0]!.json().data.orderNumber).toBe(
      replies[1]!.json().data.orderNumber,
    );
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(0);
    expect(
      (
        await place({
          ...v,
          customer: { ...v.customer, fullName: "Different" },
        })
      ).statusCode,
    ).toBe(409);
  });
  it("prevents concurrent overselling across different checkouts", async () => {
    const { p, item } = await fixture(1);
    const a = await input(item, "COD"),
      b = await input(item, "COD");
    const r = await Promise.all([place(a), place(b)]);
    expect(r.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(0);
  });
  it("reserves variant stock and blocks missing/sold-out variant selections", async () => {
    const { p, item } = await fixture(2, true);
    const r = await place(await input(item));
    expect(r.statusCode).toBe(200);
    expect(r.json().data).toMatchObject({
      accepted: false,
      operationalStatus: null,
      paymentStatus: "PENDING",
      subtotalPaise: 110001,
    });
    expect(
      (
        await app.db.productVariant.findUniqueOrThrow({
          where: { id: item.variantId! },
        })
      ).stockQuantity,
    ).toBe(1);
    for (const variantId of [null, p.variants[1]!.id])
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/checkout/quote",
            payload: { items: [{ ...item, variantId }], pinCode: "400001" },
          })
        ).statusCode,
      ).toBe(409);
  });
  it("verifies signatures and API-captured status before accepting online orders", async () => {
    const { item } = await fixture();
    const v = await input(item);
    const r = await place(v);
    expect(r.statusCode).toBe(200);
    const o = r.json().data;
    const payment = fake.payment(o.gatewayOrderId, "authorized");
    const signature = createHmac("sha256", secret)
      .update(`${o.gatewayOrderId}|${payment.id}`)
      .digest("hex");
    const payload = {
      token: v.confirmationToken,
      razorpay_order_id: o.gatewayOrderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: signature,
    };
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/checkout/verify",
          payload: { ...payload, razorpay_signature: "0".repeat(64) },
        })
      ).statusCode,
    ).toBe(400);
    const authorized = await app.inject({
      method: "POST",
      url: "/api/v1/checkout/verify",
      payload,
    });
    expect(authorized.json().data).toMatchObject({
      accepted: false,
      paymentStatus: "PENDING",
    });
    payment.status = "captured";
    const captured = await app.inject({
      method: "POST",
      url: "/api/v1/checkout/verify",
      payload,
    });
    expect(captured.json().data).toMatchObject({
      accepted: true,
      paymentStatus: "PAID",
      operationalStatus: "NEW",
    });
  });
  it("processes duplicate/concurrent signed webhooks once, ignoring late failure", async () => {
    const { p, item } = await fixture();
    const v = await input(item);
    const r = await place(v);
    const payment = fake.payment(r.json().data.gatewayOrderId);
    const id = `evt_${randomUUID()}`;
    const rs = await Promise.all([webhook(payment, id), webhook(payment, id)]);
    expect(rs.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(await app.db.paymentWebhook.count({ where: { eventId: id } })).toBe(
      1,
    );
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(4);
    payment.status = "failed";
    expect(
      (await webhook(payment, undefined, "payment.failed")).statusCode,
    ).toBe(200);
    expect((await confirm(v.confirmationToken)).paymentStatus).toBe("PAID");
  });
  it("rejects raw-body signature changes and payment amount mismatches", async () => {
    const { item } = await fixture();
    const v = await input(item);
    const r = await place(v);
    const p = fake.payment(r.json().data.gatewayOrderId, "captured", 1);
    expect((await webhook(p)).statusCode).toBe(409);
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/razorpay",
      payload: { event: "payment.captured" },
      headers: {
        "x-razorpay-signature": "0".repeat(64),
        "x-razorpay-event-id": `evt_${randomUUID()}`,
      },
    });
    expect(bad.statusCode).toBe(400);
    expect((await confirm(v.confirmationToken)).accepted).toBe(false);
  });
  it("releases failed holds exactly once and excludes them from actionable orders", async () => {
    const { p, item } = await fixture();
    const v = await input(item);
    const r = await place(v);
    const payment = fake.payment(r.json().data.gatewayOrderId, "failed");
    await webhook(payment, undefined, "payment.failed");
    await webhook(payment, undefined, "payment.failed");
    expect(await confirm(v.confirmationToken)).toMatchObject({
      paymentStatus: "FAILED",
      accepted: false,
      operationalStatus: null,
    });
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(5);
  });
  it("expires reservations and safely reacquires stock for a late verified capture", async () => {
    const { p, item } = await fixture();
    const v = await input(item);
    const r = await place(v);
    await app.db.order.update({
      where: { orderNumber: r.json().data.orderNumber },
      data: { reservationExpiresAt: new Date(Date.now() - 1000) },
    });
    await checkoutService(app.db, config, fake).expireReservations();
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(5);
    const pay = fake.payment(r.json().data.gatewayOrderId);
    await webhook(pay);
    expect(await confirm(v.confirmationToken)).toMatchObject({
      accepted: true,
      paymentStatus: "PAID",
      needsReview: false,
    });
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: p.id } }))
        .stockQuantity,
    ).toBe(4);
  });
  it("keeps a late capture out of fulfilment when stock has been sold", async () => {
    const { item } = await fixture(1);
    const v = await input(item);
    const r = await place(v);
    await app.db.order.update({
      where: { orderNumber: r.json().data.orderNumber },
      data: { reservationExpiresAt: new Date(Date.now() - 1000) },
    });
    await checkoutService(app.db, config, fake).expireReservations();
    expect((await place(await input(item, "COD"))).statusCode).toBe(200);
    await webhook(fake.payment(r.json().data.gatewayOrderId));
    expect(await confirm(v.confirmationToken)).toMatchObject({
      paymentStatus: "PAID",
      accepted: false,
      operationalStatus: null,
      needsReview: true,
    });
  });
  it("recovers an ambiguous provider create without creating another order", async () => {
    const { item } = await fixture();
    const v = await input(item);
    fake.ambiguous = true;
    expect((await place(v)).statusCode).toBe(500);
    expect((await place(v)).statusCode).toBe(200);
    expect(fake.creates).toBe(1);
  });
  it("reconciles a missed callback using the provider API", async () => {
    const { item } = await fixture();
    const v = await input(item);
    const r = await place(v);
    fake.payment(r.json().data.gatewayOrderId);
    const reconcile = await app.inject({
      method: "POST",
      url: "/api/v1/checkout/reconcile",
      payload: { token: v.confirmationToken },
    });
    expect(reconcile.json().data).toMatchObject({
      accepted: true,
      paymentStatus: "PAID",
    });
  });
  it("uses private tokens only, rejects predictable lookups and cross-origin attempts", async () => {
    const { item } = await fixture();
    const v = await input(item, "COD");
    const r = await place(v);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders/confirmation",
      payload: { token: randomBytes(32).toString("hex") },
    });
    expect(response.statusCode).toBe(404);
    expect(
      (await app.inject(`/api/v1/orders/${r.json().data.orderNumber}`))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/orders/confirmation",
          payload: { token: v.confirmationToken },
          headers: { origin: "https://untrusted.example" },
        })
      ).statusCode,
    ).toBe(403);
    const saved = await app.db.order.findUniqueOrThrow({
      where: { orderNumber: r.json().data.orderNumber },
    });
    expect(saved.tokenHash).not.toBe(v.confirmationToken);
    expect(JSON.stringify(r.json())).not.toContain("tokenHash");
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  it("honours configured PIN/COD rules and the development adapter boundary", async () => {
    const { item } = await fixture();
    const disabled = checkoutService(
      app.db,
      parseEnv({
        DATABASE_URL: url,
        NODE_ENV: "test",
        SERVICEABLE_PIN_CODES: "110001",
        COD_ENABLED: "false",
      }),
    );
    await expect(disabled.quote([item], "400001")).rejects.toThrow("Delivery");
    const cod = await input(item, "COD");
    await expect(disabled.place(cod)).rejects.toThrow("Cash on delivery");
    const dev = checkoutService(
      app.db,
      parseEnv({
        DATABASE_URL: url,
        NODE_ENV: "test",
        PAYMENT_ADAPTER: "development",
      }),
    );
    const q = await dev.quote([item], "400001");
    const v = await input(item);
    v.quoteFingerprint = q.fingerprint;
    v.expectedTotalPaise = q.totalPaise;
    const o = await dev.place(v);
    expect(o.paymentAdapter).toBe("development");
    const paid = await dev.developmentPayment(v.confirmationToken, "success");
    expect(paid).toMatchObject({ accepted: true, paymentStatus: "PAID" });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/checkout/development-payment",
          payload: { token: v.confirmationToken, outcome: "success" },
        })
      ).statusCode,
    ).toBe(404);
  });
  it("enforces acceptance, total and completion constraints in PostgreSQL", async () => {
    const { item } = await fixture();
    const v = await input(item);
    const r = await place(v);
    const where = { orderNumber: r.json().data.orderNumber as string };
    await expect(
      app.db.order.update({
        where,
        data: {
          accepted: true,
          operationalStatus: "NEW",
          reservationState: "FINALIZED",
          reservationExpiresAt: null,
        },
      }),
    ).rejects.toThrow();
    await expect(
      app.db.order.update({ where, data: { totalPaise: 1 } }),
    ).rejects.toThrow();
    await expect(
      app.db.order.update({ where, data: { completedAt: new Date() } }),
    ).rejects.toThrow();
    expect((await confirm(v.confirmationToken)).accepted).toBe(false);
  });
});
