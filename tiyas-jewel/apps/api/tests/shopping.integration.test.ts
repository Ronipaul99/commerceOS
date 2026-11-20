import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import {
  productsResponseSchema,
  productResponseSchema,
  cartResponseSchema,
  searchResponseSchema,
} from "@tiyas/shared";
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated migrated and seeded database",
  );
let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp(parseEnv({ DATABASE_URL: url, NODE_ENV: "test" }), {
    logger: false,
  });
});
afterAll(async () => {
  await app?.close();
});
async function list(query: string) {
  const response = await app.inject(`/api/v1/products?${query}`);
  expect(response.statusCode).toBe(200);
  return productsResponseSchema.parse(response.json());
}
async function product(slug: string) {
  return productResponseSchema.parse(
    (await app.inject(`/api/v1/products/${slug}`)).json(),
  ).data;
}
async function quote(items: unknown[]) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/cart/resolve",
    payload: { items },
  });
  expect(response.statusCode).toBe(200);
  return cartResponseSchema.parse(response.json()).data;
}
describe("PostgreSQL shopping API", () => {
  it("filters categories, base prices, availability and featured records", async () => {
    const bracelets = await list("category=bracelets&limit=50");
    expect(bracelets.data.length).toBeGreaterThan(0);
    expect(
      bracelets.data.every((item) => item.category.slug === "bracelets"),
    ).toBe(true);
    const range = await list("minPricePaise=99000&maxPricePaise=139000");
    expect(range.data.length).toBeGreaterThan(0);
    expect(
      range.data.every(
        (item) => item.pricePaise >= 99000 && item.pricePaise <= 139000,
      ),
    ).toBe(true);
    const available = await list("availability=in-stock&limit=50");
    expect(available.data.every((item) => item.available)).toBe(true);
    expect(
      available.data.some((item) => item.slug === "sculpted-band-ring"),
    ).toBe(true);
    const unavailable = await list("availability=out-of-stock&limit=50");
    expect(unavailable.data.length).toBeGreaterThan(0);
    expect(unavailable.data.every((item) => !item.available)).toBe(true);
    const featured = await list("featured=true");
    expect(featured.data).toHaveLength(4);
    expect(featured.data.every((item) => item.featured)).toBe(true);
  });
  it("sorts deterministically and paginates without overlapping products", async () => {
    const asc = await list("sort=price-asc&limit=50");
    expect(asc.data.map((item) => item.pricePaise)).toEqual(
      asc.data.map((item) => item.pricePaise).sort((a, b) => a - b),
    );
    const desc = await list("sort=price-desc&limit=50");
    expect(desc.data.map((item) => item.pricePaise)).toEqual(
      desc.data.map((item) => item.pricePaise).sort((a, b) => b - a),
    );
    const first = await list("page=1&limit=3");
    const second = await list("page=2&limit=3");
    expect(first.pagination.total).toBeGreaterThanOrEqual(13);
    expect(
      first.data.some((item) =>
        second.data.some((next) => next.id === item.id),
      ),
    ).toBe(false);
    expect((await list("page=9999&limit=3")).data).toEqual([]);
  });
  it("returns collection metadata, scoped products and API search/category matches", async () => {
    expect(
      (await app.inject("/api/v1/collections/everyday-edit")).statusCode,
    ).toBe(200);
    expect((await app.inject("/api/v1/collections/not-real")).statusCode).toBe(
      404,
    );
    expect(
      (await list("collection=everyday-edit&limit=50")).data.every((item) =>
        item.collections.some(
          (collection) => collection.slug === "everyday-edit",
        ),
      ),
    ).toBe(true);
    const search = searchResponseSchema.parse(
      (await app.inject("/api/v1/search?q=necklaces")).json(),
    );
    expect(search.data.products.length).toBeGreaterThan(0);
    expect(
      search.data.categories.some((item) => item.slug === "necklaces"),
    ).toBe(true);
    expect(
      searchResponseSchema.parse(
        (await app.inject("/api/v1/search?q=zzzz-no-such-piece")).json(),
      ).data.products,
    ).toEqual([]);
  });
  it("uses current variant prices and stock without reserving inventory", async () => {
    const ring = await product("sculpted-band-ring");
    const available = ring.variants.find((item) => item.sku === "DEV-RING-16")!;
    const sold = ring.variants.find((item) => item.sku === "DEV-RING-14")!;
    const ref = {
      productId: ring.id,
      slug: ring.slug,
      variantId: available.id,
      quantity: 2,
    };
    const current = await quote([ref]);
    expect(current.items[0]?.unitPricePaise).toBe(345000);
    expect(current.subtotalPaise).toBe(690000);
    expect(
      (await quote([{ ...ref, variantId: sold.id }])).items[0]?.status,
    ).toBe("unavailable");
    expect((await quote([{ ...ref, variantId: null }])).items[0]?.status).toBe(
      "variant_required",
    );
    expect((await quote([{ ...ref, quantity: 99 }])).items[0]).toMatchObject({
      quantity: 5,
      status: "adjusted",
    });
    expect(
      (await product(ring.slug)).variants.find(
        (item) => item.id === available.id,
      )?.maxQuantity,
    ).toBe(5);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/cart/resolve",
          payload: { items: [{ ...ref, pricePaise: 1 }] },
        })
      ).statusCode,
    ).toBe(400);
  });
  it("revalidates price/stock changes, and hides archived products on restore", async () => {
    const category = await app.db.category.findFirstOrThrow({
      where: { slug: "rings" },
    });
    const slug = `test-${randomUUID()}`;
    const item = await app.db.product.create({
      data: {
        slug,
        name: "Temporary price test",
        description: "Test",
        pricePaise: 100000,
        stockQuantity: 2,
        categoryId: category.id,
      },
    });
    const ref = { productId: item.id, slug, variantId: null, quantity: 2 };
    try {
      expect((await quote([ref])).subtotalPaise).toBe(200000);
      await app.db.product.update({
        where: { id: item.id },
        data: { pricePaise: 175000, stockQuantity: 1 },
      });
      expect((await quote([ref])).items[0]).toMatchObject({
        unitPricePaise: 175000,
        quantity: 1,
        status: "adjusted",
        lineTotalPaise: 175000,
      });
      await app.db.product.update({
        where: { id: item.id },
        data: { stockQuantity: 0 },
      });
      expect((await quote([ref])).subtotalPaise).toBe(0);
      await app.db.product.update({
        where: { id: item.id },
        data: { active: false },
      });
      expect((await quote([ref])).items[0]?.status).toBe("missing");
    } finally {
      await app.db.product.delete({ where: { id: item.id } });
    }
  });
  it("enforces image ownership for variants and handles missing/invalid input", async () => {
    const ring = await product("sculpted-band-ring");
    const other = await product("fine-chain-necklace");
    await expect(
      app.db.productVariant.create({
        data: {
          productId: ring.id,
          sku: `TEST-${randomUUID()}`,
          name: "Invalid image",
          imageId: other.images[0]!.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
    expect(
      (await app.inject("/api/v1/products?minPricePaise=200&maxPricePaise=100"))
        .statusCode,
    ).toBe(400);
    expect((await app.inject("/api/v1/search?limit=999")).statusCode).toBe(400);
    expect(
      (await app.inject("/api/v1/products/no-such-product")).statusCode,
    ).toBe(404);
  });
});
