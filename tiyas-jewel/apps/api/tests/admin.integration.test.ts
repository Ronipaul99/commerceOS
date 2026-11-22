import { beforeAll, beforeEach, afterEach, describe, it, expect } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import type { FastifyInstance } from "fastify";
import type { HTTPMethods } from "fastify";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { hashPassword } from "../src/modules/admin/auth.js";
import { checkoutService } from "../src/modules/checkout/service.js";
import {
  adminProductInputSchema,
  adminProductResponseSchema,
  adminProductsResponseSchema,
  adminOrderResponseSchema,
  adminDashboardSchema,
  checkoutRequestSchema,
  type AdminProduct,
} from "@tiyas/shared";
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw Error("Set TEST_DATABASE_URL to a dedicated migrated/seeded database");
const config = parseEnv({
  DATABASE_URL: url,
  NODE_ENV: "test",
  COD_ENABLED: "true",
  PAYMENT_ADAPTER: "development",
});
const password = randomBytes(24).toString("hex");
let passwordHash: string;
let app: FastifyInstance,
  adminId: string,
  email: string,
  cookie: string,
  csrf: string;
const ids: string[] = [];
let objects: Map<string, Buffer>;
beforeAll(async () => {
  passwordHash = await hashPassword(password);
});
beforeEach(async () => {
  objects = new Map();
  app = await buildApp(config, {
    logger: false,
    storage: {
      async put(k, b) {
        objects.set(k, b);
      },
      async get(k) {
        const b = objects.get(k);
        if (!b) throw Error("Missing");
        return b;
      },
      async remove(k) {
        objects.delete(k);
      },
    },
  });
  email = `admin-test-${randomUUID()}@example.test`;
  adminId = (await app.db.adminUser.create({ data: { email, passwordHash } }))
    .id;
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/login",
    payload: { email, password },
  });
  expect(response.statusCode).toBe(200);
  cookie = response.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  csrf = response.json().data.csrfToken;
});
afterEach(async () => {
  if (!app) return;
  const orders = await app.db.order.findMany({
      where: { customerEmail: email },
      select: { id: true },
    }),
    orderIds = orders.map((o) => o.id);
  await app.db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await app.db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await app.db.order.deleteMany({ where: { id: { in: orderIds } } });
  await app.db.productVariant.updateMany({
    where: { productId: { in: ids } },
    data: { imageId: null },
  });
  await app.db.product.deleteMany({ where: { id: { in: ids } } });
  ids.length = 0;
  await app.db.imageAsset.deleteMany({ where: { uploaderId: adminId } });
  await app.db.adminUser.deleteMany({ where: { id: adminId } });
  await app.close();
});
const request = (
  method: HTTPMethods,
  path: string,
  payload?: unknown,
  headers: Record<string, string> = {},
) =>
  app.inject({
    method,
    url: `/api/v1/admin${path}`,
    headers: { cookie, "x-csrf-token": csrf, ...headers },
    ...(payload !== undefined ? { payload: payload as object } : {}),
  });
async function create(variants = false) {
  const category = await app.db.category.findFirstOrThrow();
  const input = adminProductInputSchema.parse({
    name: "Admin integration piece",
    slug: `admin-test-${randomUUID()}`,
    description: "Temporary isolated admin test product",
    details: {
      subtitle: "Complete test jewellery",
      material: "Brass with Kundan",
      weightGrams: 78,
      size: "Adjustable (14-16 in)",
      colors: [{ name: "Green", hex: "#00582d" }],
    },
    categoryId: category.id,
    collectionIds: [],
    pricePaise: 149000,
    compareAtPaise: 199000,
    sku: randomUUID(),
    stockQuantity: 5,
    active: true,
    featured: true,
    images: [],
    variants: variants
      ? [
          {
            name: "Small",
            sku: randomUUID(),
            pricePaise: 159000,
            stockQuantity: 3,
            active: true,
            imageRef: null,
          },
        ]
      : [],
  });
  const response = await request("POST", "/products", input);
  expect(response.statusCode, response.body).toBe(201);
  const p = adminProductResponseSchema.parse(response.json()).data;
  expect(p.details).toMatchObject({
    material: "Brass with Kundan",
    weightGrams: 78,
  });
  ids.push(p.id);
  return p;
}
function input(p: AdminProduct) {
  return adminProductInputSchema.parse({
    version: p.version,
    name: p.name,
    slug: p.slug,
    description: p.description,
    details: p.details,
    categoryId: p.categoryId,
    collectionIds: p.collectionIds,
    pricePaise: p.pricePaise,
    compareAtPaise: p.compareAtPaise,
    sku: p.sku,
    stockQuantity: p.stockQuantity,
    active: p.active,
    featured: p.featured,
    images: p.images.map((i) => ({ id: i.id, alt: i.alt })),
    variants: p.variants,
  });
}
async function upload(
  buffer: Buffer,
  name = "../../unsafe.jpg",
  mime = "image/jpeg",
) {
  const boundary = `image-${randomUUID()}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${name}"\r\nContent-Type: ${mime}\r\n\r\n`,
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return app.inject({
    method: "POST",
    url: "/api/v1/admin/images",
    headers: {
      cookie,
      "x-csrf-token": csrf,
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });
}
async function place(p: AdminProduct, method: "COD" | "ONLINE" = "COD") {
  const service = checkoutService(app.db, config),
    token = randomBytes(32).toString("hex");
  const refs = [
    {
      productId: p.id,
      slug: p.slug,
      variantId: p.variants[0]?.id ?? null,
      quantity: 1,
    },
  ];
  const quote = await service.quote(refs, "400001");
  await service.place(
    checkoutRequestSchema.parse({
      items: refs,
      pinCode: "400001",
      customer: { fullName: "Admin Customer", email, mobile: "9876543210" },
      address: {
        line1: "12 Sample Garden Road",
        line2: "Second floor",
        landmark: "Near sample park",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400001",
        country: "IN",
      },
      paymentMethod: method,
      expectedTotalPaise: quote.totalPaise,
      quoteFingerprint: quote.fingerprint,
      idempotencyKey: randomUUID(),
      confirmationToken: token,
    }),
  );
  const order = await app.db.order.findUniqueOrThrow({
    where: {
      tokenHash: (await import("../src/modules/admin/auth.js")).digest(token),
    },
  });
  return { order, token, service };
}
describe("Stage 05 admin authorization and sessions", () => {
  it("rejects unauthenticated access to every admin API before reading bodies", async () => {
    for (const [method, path] of [
      ["GET", "/session"],
      ["GET", "/dashboard"],
      ["GET", "/options"],
      ["GET", "/products"],
      ["POST", "/products"],
      ["GET", "/products/missing"],
      ["PUT", "/products/missing"],
      ["POST", "/products/missing/archive"],
      ["DELETE", "/products/missing"],
      ["POST", "/images"],
      ["DELETE", `/images/${randomUUID()}`],
      ["GET", "/orders"],
      ["GET", "/orders/missing"],
      ["POST", "/orders/missing/complete"],
      ["POST", "/logout"],
    ] as const) {
      const r = await app.inject({ method, url: `/api/v1/admin${path}` });
      expect(r.statusCode, `${method} ${path}`).toBe(401);
      expect(r.body).not.toContain(email);
    }
  });
  it("uses generic login errors, CSRF/origin checks and revokes logout", async () => {
    for (const address of [email, `unknown-${email}`]) {
      const r = await app.inject({
        method: "POST",
        url: "/api/v1/admin/login",
        payload: { email: address, password: randomUUID() },
      });
      expect(r.statusCode).toBe(401);
      expect(r.json().error.message).toBe("Email or password is incorrect.");
    }
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/admin/logout",
          headers: { cookie },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await request(
          "POST",
          "/logout",
          {},
          { origin: "https://foreign.example" },
        )
      ).statusCode,
    ).toBe(403);
    expect((await request("POST", "/logout", {})).statusCode).toBe(200);
    expect((await request("GET", "/session")).statusCode).toBe(401);
  });
  it("rotates sessions, enforces expiry and active admin status", async () => {
    const old = cookie;
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/admin/login",
      payload: { email, password },
    });
    cookie = r.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    expect(
      (await request("GET", "/session", undefined, { cookie: old })).statusCode,
    ).toBe(401);
    await app.db.adminUser.update({
      where: { id: adminId },
      data: { active: false },
    });
    expect((await request("GET", "/session")).statusCode).toBe(401);
    await app.db.adminUser.update({
      where: { id: adminId },
      data: { active: true },
    });
    await app.db.adminSession.updateMany({
      where: { adminId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await request("GET", "/session")).statusCode).toBe(401);
  });
  it("sets secure host-only production cookies and stores only token hashes", async () => {
    const production = await buildApp(
      parseEnv({ DATABASE_URL: url, NODE_ENV: "production" }),
      { db: app.db, logger: false },
    );
    try {
      const r = await production.inject({
        method: "POST",
        url: "/api/v1/admin/login",
        payload: { email, password },
      });
      expect(r.statusCode).toBe(200);
      const header = r.headers["set-cookie"] as string;
      expect(header).toContain("__Host-tiyas_admin=");
      expect(header).toContain("HttpOnly");
      expect(header).toContain("Secure");
      expect(header).toContain("SameSite=Strict");
      expect(header).not.toContain("Domain=");
      const token = r.cookies[0]!.value;
      const row = await app.db.adminSession.findFirstOrThrow({
        where: { adminId },
      });
      expect(row.tokenHash).not.toBe(token);
      expect(row.tokenHash).toHaveLength(64);
    } finally {
      await production.close();
    }
  });
  it("rate limits repeated login attempts", async () => {
    for (let i = 0; i < 4; i++)
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/admin/login",
            payload: { email, password: "incorrect-password" },
          })
        ).statusCode,
      ).toBe(401);
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/admin/login",
      payload: { email, password },
    });
    expect(r.statusCode).toBe(429);
  });
});
describe("Stage 05 product and image management", () => {
  it("creates, filters, edits and exposes actual catalog data", async () => {
    const p = await create();
    const rows = adminProductsResponseSchema.parse(
      (
        await request("GET", `/products?q=${p.slug}&categoryId=${p.categoryId}`)
      ).json(),
    );
    expect(rows.data.map((i) => i.id)).toEqual([p.id]);
    const body = input(p);
    body.name = "Edited admin piece";
    body.pricePaise = 179000;
    body.compareAtPaise = 219000;
    const updated = await request("PUT", `/products/${p.id}`, body);
    expect(updated.statusCode, updated.body).toBe(200);
    const publicProduct = await app.inject(`/api/v1/products/${p.slug}`);
    expect(publicProduct.json().data.name).toBe(body.name);
    expect(publicProduct.json().data.pricePaise).toBe(179000);
    expect(publicProduct.json().data.details).toMatchObject({
      material: "Brass with Kundan",
      size: "Adjustable (14-16 in)",
    });
    expect((await request("PUT", `/products/${p.id}`, body)).statusCode).toBe(
      409,
    );
  });
  it("rejects duplicate identifiers and invalid product data without changing records", async () => {
    const p = await create();
    const body = input(p);
    body.compareAtPaise = body.pricePaise;
    expect((await request("PUT", `/products/${p.id}`, body)).statusCode).toBe(
      400,
    );
    const clone = { ...input(p), version: undefined, sku: randomUUID() };
    expect((await request("POST", "/products", clone)).statusCode).toBe(409);
    expect((await request("GET", `/products/${p.id}`)).json().data.name).toBe(
      p.name,
    );
  });
  it("validates image bytes, dimensions and size instead of trusting extensions", async () => {
    expect(
      (await upload(Buffer.from("<svg><script>alert(1)</script></svg>")))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await upload(
          await sharp({
            create: { width: 32, height: 32, channels: 3, background: "red" },
          })
            .png()
            .toBuffer(),
        )
      ).statusCode,
    ).toBe(400);
    expect((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).statusCode).toBe(
      413,
    );
    const r = await upload(
      await sharp({
        create: { width: 400, height: 500, channels: 3, background: "#eac9a8" },
      })
        .png()
        .toBuffer(),
      "../../unsafe.html",
      "text/plain",
    );
    expect(r.statusCode, r.body).toBe(201);
    expect(r.json().data.url).toMatch(
      /^\/images\/uploads\/[a-f0-9-]{36}\.webp$/,
    );
    expect([...objects.keys()][0]).toMatch(/^products\/[a-f0-9-]{36}\.webp$/);
    expect((await app.inject(r.json().data.url)).statusCode).toBe(404);
    expect(
      (await app.inject({ url: r.json().data.url, headers: { cookie } }))
        .headers["content-type"],
    ).toContain("image/webp");
  });
  it("reorders/replaces image associations, uses variant imagery and removes unattached objects", async () => {
    const p = await create(true);
    const assets: { id: string; url: string }[] = [];
    for (const color of ["red", "blue", "green"]) {
      const r = await upload(
        await sharp({
          create: { width: 300, height: 400, channels: 3, background: color },
        })
          .png()
          .toBuffer(),
      );
      expect(r.statusCode).toBe(201);
      assets.push(r.json().data);
    }
    const body = input(p);
    body.images = assets
      .slice(0, 2)
      .map((a) => ({ assetId: a.id, alt: "Actual fixture image" }));
    body.variants[0]!.imageRef = assets[1]!.id;
    let r = await request("PUT", `/products/${p.id}`, body);
    expect(r.statusCode, r.body).toBe(200);
    let saved = adminProductResponseSchema.parse(r.json()).data;
    expect(saved.variants[0]!.imageRef).toBe(saved.images[1]!.id);
    expect((await app.inject(assets[0]!.url)).statusCode).toBe(200);
    expect(
      (await request("DELETE", `/images/${assets[0]!.id}`)).statusCode,
    ).toBe(409);
    const edit = input(saved);
    edit.images = [
      { id: saved.images[1]!.id, alt: "Second first" },
      { assetId: assets[2]!.id, alt: "Replacement" },
    ];
    r = await request("PUT", `/products/${p.id}`, edit);
    expect(r.statusCode, r.body).toBe(200);
    saved = adminProductResponseSchema.parse(r.json()).data;
    expect(saved.images.map((i) => i.alt)).toEqual([
      "Second first",
      "Replacement",
    ]);
    expect(
      (await request("DELETE", `/images/${assets[0]!.id}`)).statusCode,
    ).toBe(200);
    expect(
      [...objects.keys()].filter((k) =>
        /^products\/[a-f0-9-]{36}\.webp$/.test(k),
      ),
    ).toHaveLength(2);
    expect(
      [...objects.keys()].some((k) =>
        k.startsWith(`products/${assets[0]!.id}/`),
      ),
    ).toBe(false);
  });
  it("rejects stale variant stock edits and archives/deletes only unused products", async () => {
    const p = await create(true),
      body = input(p);
    await app.db.productVariant.update({
      where: { id: p.variants[0]!.id },
      data: { stockQuantity: { decrement: 1 } },
    });
    expect((await request("PUT", `/products/${p.id}`, body)).statusCode).toBe(
      409,
    );
    const fresh = adminProductResponseSchema.parse(
      (await request("GET", `/products/${p.id}`)).json(),
    ).data;
    expect(
      (
        await request("POST", `/products/${p.id}/archive`, {
          version: fresh.version,
        })
      ).statusCode,
    ).toBe(200);
    expect((await app.inject(`/api/v1/products/${p.slug}`)).statusCode).toBe(
      404,
    );
    const archived = adminProductResponseSchema.parse(
      (await request("GET", `/products/${p.id}`)).json(),
    ).data;
    expect(
      (
        await request("DELETE", `/products/${p.id}`, {
          version: archived.version,
        })
      ).statusCode,
    ).toBe(200);
  });
  it("preserves products and variants referenced by historical orders", async () => {
    const p = await create(true);
    await place(p);
    const current = adminProductResponseSchema.parse(
      (await request("GET", `/products/${p.id}`)).json(),
    ).data;
    expect(
      (
        await request("DELETE", `/products/${p.id}`, {
          version: current.version,
        })
      ).statusCode,
    ).toBe(409);
    const body = input(current);
    body.variants = [];
    expect((await request("PUT", `/products/${p.id}`, body)).statusCode).toBe(
      409,
    );
    await expect(
      app.db.product.delete({ where: { id: p.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
    const inactive = input(current);
    inactive.variants = inactive.variants.map((v) => ({ ...v, active: false }));
    expect(
      (await request("PUT", `/products/${p.id}`, inactive)).statusCode,
    ).toBe(200);
    expect(
      (await app.inject(`/api/v1/products/${p.slug}`)).json().data.available,
    ).toBe(false);
  });
  it("retains detached image objects referenced by order snapshots", async () => {
    const p = await create();
    const uploaded = await upload(
      await sharp({
        create: { width: 300, height: 400, channels: 3, background: "gold" },
      })
        .png()
        .toBuffer(),
    );
    expect(uploaded.statusCode).toBe(201);
    const asset = uploaded.json().data;
    const edit = input(p);
    edit.images = [{ assetId: asset.id, alt: "Order snapshot image" }];
    expect((await request("PUT", `/products/${p.id}`, edit)).statusCode).toBe(
      200,
    );
    await place(p);
    const fresh = adminProductResponseSchema.parse(
      (await request("GET", `/products/${p.id}`)).json(),
    ).data;
    const detach = input(fresh);
    detach.images = [];
    expect((await request("PUT", `/products/${p.id}`, detach)).statusCode).toBe(
      200,
    );
    expect((await request("DELETE", `/images/${asset.id}`)).statusCode).toBe(
      409,
    );
    expect((await app.inject(asset.url)).statusCode).toBe(200);
    expect(
      [...objects.keys()].filter((k) =>
        /^products\/[a-f0-9-]{36}\.webp$/.test(k),
      ),
    ).toHaveLength(1);
    expect(objects.has(`products/${asset.id}.webp`)).toBe(true);
  });
});
describe("Stage 05 accepted order views and completion", () => {
  it("excludes pending/failed payments, protects details and counts completion exactly once", async () => {
    const p = await create(),
      before = adminDashboardSchema.parse(
        (await request("GET", "/dashboard")).json(),
      ).data;
    const accepted = await place(p),
      pending = await place(p, "ONLINE");
    expect(
      (await request("GET", `/orders/${pending.order.id}`)).statusCode,
    ).toBe(404);
    expect(
      (await request("POST", `/orders/${pending.order.id}/complete`, {}))
        .statusCode,
    ).toBe(404);
    await pending.service.developmentPayment(pending.token, "failure");
    const dashboard = adminDashboardSchema.parse(
      (await request("GET", "/dashboard")).json(),
    ).data;
    expect(dashboard.newOrders).toBe(before.newOrders + 1);
    const detail = adminOrderResponseSchema.parse(
      (await request("GET", `/orders/${accepted.order.id}`)).json(),
    ).data;
    expect(detail.address.landmark).toBe("Near sample park");
    expect(detail.customerMobile).toBe("9876543210");
    expect(JSON.stringify(detail)).not.toContain("tokenHash");
    const results = await Promise.all([
      request("POST", `/orders/${accepted.order.id}/complete`, {}),
      request("POST", `/orders/${accepted.order.id}/complete`, {}),
    ]);
    expect(results.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(results[0]!.json().data.completedAt).toBe(
      results[1]!.json().data.completedAt,
    );
    const after = adminDashboardSchema.parse(
      (await request("GET", "/dashboard")).json(),
    ).data;
    expect(after.newOrders).toBe(before.newOrders);
    expect(after.completedOrders).toBe(before.completedOrders + 1);
    expect(
      (await request("GET", "/orders?status=COMPLETED"))
        .json()
        .data.some((o: { id: string }) => o.id === accepted.order.id),
    ).toBe(true);
    const another = await place(p);
    const all = (await request("GET", "/orders?status=ALL"))
      .json()
      .data.filter((o: { id: string }) =>
        [accepted.order.id, another.order.id].includes(o.id),
      );
    expect(all.map((o: { id: string }) => o.id)).toEqual([
      another.order.id,
      accepted.order.id,
    ]);
    expect(
      (await request("GET", "/orders"))
        .json()
        .data.some((o: { id: string }) => o.id === accepted.order.id),
    ).toBe(false);
  });
});
