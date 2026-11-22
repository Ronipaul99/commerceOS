import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "vitest";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { hashPassword } from "../src/modules/admin/auth.js";
import { checkoutService } from "../src/modules/checkout/service.js";
import { adminCatalog } from "../src/modules/admin/catalog.js";
import { couponAdmin } from "../src/modules/coupons/service.js";
import { checkoutRequestSchema, couponInputSchema } from "@tiyas/shared";
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).hostname !== "127.0.0.1" ||
  new URL(url).port !== "5433" ||
  !/^\/tiyas_(?:customer_experience_|stage0[3-5])/.test(new URL(url).pathname)
)
  throw Error("Use an explicitly isolated local test database");
const config = parseEnv({
  DATABASE_URL: url,
  NODE_ENV: "test",
  COD_ENABLED: "true",
  PAYMENT_ADAPTER: "development",
  COUPONS_ENABLED: "true",
  REVIEWS_ENABLED: "true",
  HOMEPAGE_REVIEWS_ENABLED: "true",
  REELS_ENABLED: "true",
  REVIEW_OTP_SECRET: randomBytes(32).toString("hex"),
});
let app: FastifyInstance,
  adminId: string,
  cookie: string,
  csrf: string,
  code: string;
let product: { id: string; slug: string }, customerEmail: string;
let reviewRequestIp = 2;
const objects = new Map<string, Buffer>(),
  couponIds: string[] = [],
  orders: string[] = [],
  reviews: string[] = [];
beforeAll(async () => {
  app = await buildApp(config, {
    logger: false,
    background: false,
    reviewEmail: {
      async sendCode(_email, value) {
        code = value;
      },
    },
    storage: {
      async put(k, b) {
        objects.set(k, b);
      },
      async get(k) {
        const v = objects.get(k);
        if (!v) throw Error("Missing");
        return v;
      },
      async remove(k) {
        objects.delete(k);
      },
    },
  });
  const password = randomBytes(24).toString("hex"),
    email = `cx-admin-${randomUUID()}@example.test`;
  const admin = await app.db.adminUser.create({
    data: { email, passwordHash: await hashPassword(password) },
  });
  adminId = admin.id;
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/admin/login",
    payload: { email, password },
  });
  expect(login.statusCode).toBe(200);
  cookie = login.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  csrf = login.json().data.csrfToken;
});
beforeEach(async () => {
  customerEmail = `cx-${randomUUID()}@example.test`;
  const category = await app.db.category.findFirstOrThrow({
    where: { active: true },
  });
  product = await app.db.product.create({
    data: {
      name: "Experience integration piece",
      slug: `cx-${randomUUID()}`,
      description: "Isolated fixture",
      pricePaise: 100001,
      stockQuantity: 20,
      categoryId: category.id,
    },
  });
});
afterEach(async () => {
  const related = await app.db.order.findMany({
    where: { items: { some: { productId: product.id } } },
    select: { id: true },
  });
  orders.push(...related.map((o) => o.id));
  await app.db.customerStory.deleteMany({
    where: {
      OR: [
        { review: { productId: product.id } },
        { reviewId: { in: reviews } },
      ],
    },
  });
  await app.db.customerReview.deleteMany({
    where: { OR: [{ productId: product.id }, { id: { in: reviews } }] },
  });
  reviews.length = 0;
  await app.db.reviewChallenge.deleteMany({
    where: {
      OR: [{ subjectKey: `PRODUCT:${product.id}` }, { email: customerEmail }],
    },
  });
  await app.db.couponRedemption.deleteMany({
    where: { orderId: { in: orders } },
  });
  await app.db.payment.deleteMany({ where: { orderId: { in: orders } } });
  await app.db.orderItem.deleteMany({ where: { orderId: { in: orders } } });
  await app.db.order.deleteMany({ where: { id: { in: orders } } });
  orders.length = 0;
  await app.db.coupon.deleteMany({ where: { id: { in: couponIds } } });
  couponIds.length = 0;
  await app.db.product.delete({ where: { id: product.id } });
});
afterAll(async () => {
  await app.db.imageAsset.deleteMany({ where: { uploaderId: adminId } });
  await app.db.adminSession.deleteMany({ where: { adminId } });
  await app.db.adminUser.delete({ where: { id: adminId } });
  await app.close();
});
const headers = () => ({ cookie, "x-csrf-token": csrf });
async function coupon(extra: Record<string, unknown> = {}) {
  const input = couponInputSchema.parse({
    code: `CX_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    type: "FIXED",
    value: 10000,
    startsAt: new Date(Date.now() - 60000).toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    ...extra,
  });
  const c = await couponAdmin(app.db).save(input, adminId);
  couponIds.push(c.data.id);
  return c.data;
}
async function place(
  couponCode?: string,
  method: "ONLINE" | "COD" = "COD",
  email = customerEmail,
) {
  const service = checkoutService(app.db, config),
    items = [
      {
        productId: product.id,
        slug: product.slug,
        variantId: null,
        quantity: 1,
      },
    ],
    q = await service.quote(items, "700001", {
      couponCode,
      email,
      paymentMethod: method,
    });
  const token = randomBytes(32).toString("hex");
  const input = checkoutRequestSchema.parse({
    items,
    pinCode: "700001",
    ...(couponCode ? { couponCode } : {}),
    customer: { fullName: "Asha R", email, mobile: "9876543210" },
    address: {
      line1: "12 Lake Road",
      city: "Kolkata",
      state: "West Bengal",
      pinCode: "700001",
    },
    paymentMethod: method,
    expectedTotalPaise: q.totalPaise,
    quoteFingerprint: q.fingerprint,
    idempotencyKey: randomUUID(),
    confirmationToken: token,
  });
  return { service, input, token, order: await service.place(input), q };
}
async function feedback(kind: "PRODUCT" | "STORE" = "PRODUCT") {
  const requested = await app.inject({
    method: "POST",
    url: "/api/v1/reviews/challenges",
    remoteAddress: `127.0.0.${++reviewRequestIp}`,
    payload: {
      kind,
      email: customerEmail,
      ...(kind === "PRODUCT" ? { productId: product.id } : {}),
    },
  });
  expect(requested.statusCode).toBe(200);
  const verified = await app.inject({
    method: "POST",
    url: "/api/v1/reviews/challenges/verify",
    payload: { challengeId: requested.json().data.challengeId, code },
  });
  expect(verified.statusCode).toBe(200);
  const payload = {
    grant: verified.json().data.grant,
    displayName: "Asha",
    title: "Thoughtful design",
    text: "A lovely piece with carefully finished details.",
    rating: 4,
    consent: true,
  };
  const response = await app.inject({
    method: "POST",
    url:
      kind === "PRODUCT"
        ? `/api/v1/products/${product.slug}/reviews`
        : "/api/v1/store-reviews",
    payload,
  });
  expect(response.statusCode).toBe(200);
  reviews.push(response.json().data.id);
  return { id: response.json().data.id as string, payload };
}
describe("customer experience and commerce guarantees", () => {
  it("deduplicates bytes within an uploader without sharing permissions or deleting another upload", async () => {
    const buffer = await sharp({
      create: { width: 800, height: 900, channels: 3, background: "#a67c4f" },
    })
      .png()
      .toBuffer();
    const catalog = adminCatalog(app.db, {
      async put(k, b) {
        objects.set(k, b);
      },
      async get(k) {
        return objects.get(k)!;
      },
      async remove(k) {
        objects.delete(k);
      },
    });
    const before = objects.size,
      a = await catalog.upload(buffer, adminId),
      after = objects.size,
      b = await catalog.upload(buffer, adminId);
    expect(a.data.id).not.toBe(b.data.id);
    expect(objects.size).toBe(after);
    expect((await app.inject(b.data.url)).statusCode).toBe(404);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/admin/images/${a.data.id}`,
          headers: headers(),
        })
      ).statusCode,
    ).toBe(200);
    expect(objects.size).toBe(after);
    expect(
      (await app.inject({ url: b.data.url, headers: { cookie } })).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/admin/images/${b.data.id}`,
          headers: headers(),
        })
      ).statusCode,
    ).toBe(200);
    expect(objects.size).toBe(before);
  });
  it("keeps late paid attempts out of fulfillment after coupon capacity was released", async () => {
    const c = await coupon({ usageLimit: 1 }),
      old = await place(c.code, "ONLINE");
    await old.service.developmentPayment(old.token, "failure");
    await place(c.code);
    const stock = (
      await app.db.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stockQuantity;
    const late = await old.service.developmentPayment(old.token, "success");
    expect(late).toMatchObject({
      paymentStatus: "PAID",
      accepted: false,
      needsReview: true,
      operationalStatus: null,
    });
    expect(
      (await app.db.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stockQuantity,
    ).toBe(stock);
    expect(
      await app.db.couponRedemption.count({
        where: { couponId: c.id, state: "REDEEMED" },
      }),
    ).toBe(1);
  });
  it("expires pending coupon reservations with the stock maintenance flow", async () => {
    const c = await coupon({ usageLimit: 1 }),
      p = await place(c.code, "ONLINE");
    await app.db.order.updateMany({
      where: { orderNumber: p.order.orderNumber },
      data: { reservationExpiresAt: new Date(Date.now() - 1000) },
    });
    await p.service.expireReservations();
    expect(
      await app.db.couponRedemption.count({
        where: { couponId: c.id, state: "RELEASED" },
      }),
    ).toBe(1);
    await place(c.code);
  });
  it("requires fulfilled COD before a verified-purchase badge", async () => {
    const p = await place();
    await app.db.order.updateMany({
      where: { orderNumber: p.order.orderNumber },
      data: { operationalStatus: "COMPLETED", completedAt: new Date() },
    });
    const f = await feedback();
    expect(
      (await app.db.customerReview.findUniqueOrThrow({ where: { id: f.id } }))
        .verifiedPurchase,
    ).toBe(true);
  });
  it("hides customer stories when their review is unpublished and keeps consent evidence private", async () => {
    const f = await feedback("STORE");
    await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/reviews/${f.id}`,
      headers: headers(),
      payload: { status: "PUBLISHED" },
    });
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/admin/customer-stories",
      headers: headers(),
      payload: {
        title: "QA customer story",
        caption: "A consented isolated customer story fixture.",
        displayName: "QA Customer",
        reviewId: f.id,
        consentEvidence: "Private consent evidence for isolated test only.",
        consentAt: new Date().toISOString(),
        published: true,
      },
    });
    expect(created.statusCode).toBe(200);
    let response = await app.inject({ url: "/api/v1/customer-stories" });
    expect(
      response
        .json()
        .data.some((s: { review: { id: string } }) => s.review?.id === f.id),
    ).toBe(true);
    expect(response.body).not.toContain("Private consent evidence");
    await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/reviews/${f.id}`,
      headers: headers(),
      payload: { status: "PENDING" },
    });
    response = await app.inject({ url: "/api/v1/customer-stories" });
    expect(
      response
        .json()
        .data.some((s: { review: { id: string } }) => s.review?.id === f.id),
    ).toBe(false);
  });
  it("enforces content-manager boundaries independently on new admin endpoints", async () => {
    await app.db.adminUser.update({
      where: { id: adminId },
      data: { role: "CONTENT_MANAGER" },
    });
    try {
      expect(
        (
          await app.inject({
            url: "/api/v1/admin/coupons",
            headers: { cookie },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            url: "/api/v1/admin/reviews",
            headers: { cookie },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            url: "/api/v1/admin/content/reels",
            headers: { cookie },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await app.inject({
            url: "/api/v1/admin/content/reels/options",
            headers: { cookie },
          })
        ).statusCode,
      ).toBe(200);
    } finally {
      await app.db.adminUser.update({
        where: { id: adminId },
        data: { role: "OWNER" },
      });
    }
  });
  it("publishes canonical Instagram links only with an authorized poster", async () => {
    const other = await app.db.adminUser.create({
      data: {
        email: `cx-reel-poster-${randomUUID()}@example.test`,
        passwordHash: "disabled-fixture",
        active: false,
      },
    });
    const catalog = adminCatalog(app.db, {
      async put(key, bytes) {
        objects.set(key, bytes);
      },
      async get(key) {
        return objects.get(key)!;
      },
      async remove(key) {
        objects.delete(key);
      },
    });
    let reelId: string | undefined;
    try {
      const picture = await sharp({
        create: { width: 250, height: 320, channels: 3, background: "#b69a82" },
      })
        .png()
        .toBuffer();
      const foreign = await catalog.upload(picture, other.id);
      const owned = await catalog.upload(picture, adminId);
      const path = "/api/v1/admin/content/reels";
      const reel = {
        title: "Isolated Instagram look",
        instagramUrl: "https://instagram.com/reel/Fixture123/?igsh=example",
        transcript: "An ivory saree styled with silver earrings.",
        productIds: [product.id],
        rightsConfirmed: true,
        published: false,
      };
      const save = (posterId: string) =>
        app.inject({
          method: "POST",
          url: path,
          headers: headers(),
          payload: { ...reel, posterId },
        });
      expect((await save(foreign.data.id)).statusCode).toBe(400);
      const draft = await save(owned.data.id);
      expect(draft.statusCode, draft.body).toBe(200);
      reelId = draft.json().data.id;
      const listing = () =>
        app.inject("/api/v1/reels").then((r) => r.json().data);
      expect(await listing()).not.toContainEqual(
        expect.objectContaining({ id: reelId }),
      );
      const published = await app.inject({
        method: "PATCH",
        url: `${path}/${reelId}`,
        headers: headers(),
        payload: {
          ...reel,
          posterId: owned.data.id,
          published: true,
          version: 1,
        },
      });
      expect(published.statusCode, published.body).toBe(200);
      expect(await listing()).toContainEqual(
        expect.objectContaining({
          id: reelId,
          instagramUrl: "https://www.instagram.com/reel/Fixture123/",
          productSlugs: [product.slug],
        }),
      );
    } finally {
      if (reelId) await app.db.reel.delete({ where: { id: reelId } });
      await app.db.imageAsset.deleteMany({ where: { uploaderId: other.id } });
      await app.db.adminUser.delete({ where: { id: other.id } });
    }
  });
  it("saves authoritative coupon totals, snapshots and exactly one COD redemption", async () => {
    const c = await coupon();
    const { service, input, order, q } = await place(c.code);
    expect(order.discountPaise).toBe(10000);
    expect(order.totalPaise).toBe(q.subtotalPaise + q.shippingPaise - 10000);
    expect(order.couponCode).toBe(c.code);
    await service.place(input);
    expect(
      await app.db.couponRedemption.count({
        where: { couponId: c.id, state: "REDEEMED" },
      }),
    ).toBe(1);
    const snapshot = await app.db.order.findFirstOrThrow({
      where: { orderNumber: order.orderNumber },
    });
    expect(snapshot.couponSnapshot).toMatchObject({
      code: c.code,
      discountPaise: 10000,
    });
  });
  it("prevents concurrent final-use oversubscription", async () => {
    const c = await coupon({ usageLimit: 1 });
    const results = await Promise.allSettled([place(c.code), place(c.code)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await app.db.couponRedemption.count({
        where: { couponId: c.id, state: "REDEEMED" },
      }),
    ).toBe(1);
  });
  it("reserves and releases coupon usage after failed online payment", async () => {
    const c = await coupon({ usageLimit: 1 }),
      p = await place(c.code, "ONLINE");
    expect(
      await app.db.couponRedemption.count({
        where: { couponId: c.id, state: "RESERVED" },
      }),
    ).toBe(1);
    await p.service.developmentPayment(p.token, "failure");
    expect(
      await app.db.couponRedemption.count({
        where: { couponId: c.id, state: "RELEASED" },
      }),
    ).toBe(1);
    await place(c.code);
  });
  it("deduplicates successful payment notifications and finalizes usage", async () => {
    const c = await coupon(),
      p = await place(c.code, "ONLINE");
    await p.service.developmentPayment(p.token, "success");
    await p.service.developmentPayment(p.token, "success");
    expect(
      await app.db.couponRedemption.count({
        where: { couponId: c.id, state: "REDEEMED" },
      }),
    ).toBe(1);
  });
  it("enforces per-email limits and preserves accepted historical terms", async () => {
    const c = await coupon({ perCustomerLimit: 1 });
    await place(c.code);
    await expect(place(c.code)).rejects.toMatchObject({
      code: "COUPON_INVALID",
    });
    await expect(
      couponAdmin(app.db).save(
        couponInputSchema.parse({
          code: c.code,
          type: c.type,
          value: 5000,
          perCustomerLimit: c.perCustomerLimit,
          active: c.active,
          version: c.version,
          startsAt: c.startsAt.toISOString(),
          endsAt: c.endsAt.toISOString(),
        }),
        adminId,
        c.id,
      ),
    ).rejects.toBeDefined();
  });
  it("rejects expired, ineligible and zero-payable coupons", async () => {
    const expired = await coupon({
      startsAt: new Date(Date.now() - 120000).toISOString(),
      endsAt: new Date(Date.now() - 60000).toISOString(),
    });
    await expect(place(expired.code)).rejects.toMatchObject({
      code: "COUPON_INVALID",
    });
    const scoped = await coupon({ categoryIds: ["missing-category"] }).catch(
      () => null,
    );
    expect(scoped).toBeNull();
    const c = await coupon({ type: "PERCENT", value: 10000 });
    const service = checkoutService(app.db, {
      ...config,
      SHIPPING_FEE_PAISE: 0,
    });
    await expect(
      service.quote(
        [
          {
            productId: product.id,
            slug: product.slug,
            variantId: null,
            quantity: 1,
          },
        ],
        "700001",
        { couponCode: c.code, paymentMethod: "ONLINE" },
      ),
    ).rejects.toMatchObject({ code: "COUPON_TOTAL" });
  });
  it("requires valid customer details even for direct checkout API calls", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/checkout/place",
      payload: {
        customer: { fullName: " ", mobile: "123", email: customerEmail },
        address: {
          line1: "",
          city: "",
          state: "West Bengal",
          pinCode: "000000",
        },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(await app.db.order.count({ where: { customerEmail } })).toBe(0);
  });
  it("publishes only moderated reviews and never exposes customer email/grant", async () => {
    const f = await feedback();
    let list = await app.inject({
      url: `/api/v1/products/${product.slug}/reviews`,
    });
    expect(list.json().data.total).toBe(0);
    const unauthorized = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/reviews/${f.id}`,
      payload: { status: "PUBLISHED" },
    });
    expect(unauthorized.statusCode).toBe(401);
    const published = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/reviews/${f.id}`,
      headers: headers(),
      payload: { status: "PUBLISHED" },
    });
    expect(published.statusCode).toBe(200);
    list = await app.inject({
      url: `/api/v1/products/${product.slug}/reviews`,
    });
    expect(list.json().data.summary).toMatchObject({
      average: 4,
      count: 1,
      distribution: [0, 0, 0, 1, 0],
    });
    expect(list.body).not.toContain(customerEmail);
    expect(list.body).not.toContain(f.payload.grant);
    expect(list.json().data.items[0].verifiedPurchase).toBe(false);
  });
  it("makes repeated review submission idempotent and rejects altered replay", async () => {
    const f = await feedback();
    const again = await app.inject({
      method: "POST",
      url: `/api/v1/products/${product.slug}/reviews`,
      payload: f.payload,
    });
    expect(again.statusCode).toBe(200);
    expect(again.json().data.id).toBe(f.id);
    const changed = await app.inject({
      method: "POST",
      url: `/api/v1/products/${product.slug}/reviews`,
      payload: { ...f.payload, rating: 5 },
    });
    expect(changed.statusCode).toBe(422);
  });
  it("keeps store ratings separate and unpublishes immediately", async () => {
    const f = await feedback("STORE");
    await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/reviews/${f.id}`,
      headers: headers(),
      payload: { status: "PUBLISHED" },
    });
    const store = await app.inject({ url: "/api/v1/store-reviews" });
    expect(
      store.json().data.items.some((r: { id: string }) => r.id === f.id),
    ).toBe(true);
    const productList = await app.inject({
      url: `/api/v1/products/${product.slug}/reviews`,
    });
    expect(productList.json().data.summary.count).toBe(0);
    await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/reviews/${f.id}`,
      headers: headers(),
      payload: { status: "PENDING" },
    });
    const hidden = await app.inject({ url: "/api/v1/store-reviews" });
    expect(
      hidden.json().data.items.some((r: { id: string }) => r.id === f.id),
    ).toBe(false);
  });
  it("limits code attempts and denies expired verification", async () => {
    const requested = await app.inject({
      method: "POST",
      url: "/api/v1/reviews/challenges",
      remoteAddress: `127.0.0.${++reviewRequestIp}`,
      payload: { kind: "PRODUCT", productId: product.id, email: customerEmail },
    });
    const challengeId = requested.json().data.challengeId;
    for (let n = 0; n < 5; n++) {
      const r = await app.inject({
        method: "POST",
        url: "/api/v1/reviews/challenges/verify",
        payload: { challengeId, code: "000000" },
      });
      expect(r.statusCode).toBe(422);
    }
    const correct = await app.inject({
      method: "POST",
      url: "/api/v1/reviews/challenges/verify",
      payload: { challengeId, code },
    });
    expect(correct.statusCode).toBe(422);
  });
  it("generates smaller WebP sources while preserving private access", async () => {
    const bytes = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#650f2a" },
    })
      .png()
      .toBuffer();
    const boundary = `cx${randomUUID()}`,
      body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="fixture.png"\r\nContent-Type: image/png\r\n\r\n`,
        ),
        bytes,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
    const uploaded = await app.inject({
      method: "POST",
      url: "/api/v1/admin/images",
      headers: {
        ...headers(),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    expect(uploaded.statusCode).toBe(201);
    const asset = uploaded.json().data;
    try {
      expect(
        await app.db.imageRendition.count({ where: { assetId: asset.id } }),
      ).toBeGreaterThan(0);
      const denied = await app.inject({ url: `${asset.url}?width=320` });
      expect(denied.statusCode).toBe(404);
      const small = await app.inject({
        url: `${asset.url}?width=320`,
        headers: { cookie },
      });
      expect(small.statusCode).toBe(200);
      expect((await sharp(small.rawPayload).metadata()).width).toBe(320);
      expect(small.headers["cache-control"]).toContain("no-store");
      await app.db.productImage.create({
        data: {
          productId: product.id,
          assetId: asset.id,
          url: asset.url,
          alt: "Published isolated image",
          position: 0,
        },
      });
      const published = await app.inject({ url: `${asset.url}?width=320` });
      expect(published.statusCode).toBe(200);
      expect(published.headers["cache-control"]).toBe("private, no-store");
    } finally {
      await app.db.productImage.deleteMany({ where: { assetId: asset.id } });
      await app.db.imageAsset.delete({ where: { id: asset.id } });
    }
  });
});
