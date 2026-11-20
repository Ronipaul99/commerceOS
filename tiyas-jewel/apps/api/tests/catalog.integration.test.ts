import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import {
  productsResponseSchema,
  productResponseSchema,
  categoriesResponseSchema,
  collectionsResponseSchema,
} from "@tiyas/shared";

// Explicit test URL only; never fall back to an application's DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "TEST_DATABASE_URL must point to a dedicated migrated and seeded development database",
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
describe("migrated PostgreSQL catalog", () => {
  it("serves the seeded catalog using shared contracts and stable pagination", async () => {
    const response = await app.inject("/api/v1/products?limit=2");
    expect(response.statusCode).toBe(200);
    const body = productsResponseSchema.parse(response.json());
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBeGreaterThanOrEqual(3);
    const next = productsResponseSchema.parse(
      (await app.inject("/api/v1/products?page=2&limit=2")).json(),
    );
    expect(
      next.data.some((p) => body.data.some((first) => first.id === p.id)),
    ).toBe(false);
  });
  it("returns details, image and variant contracts without admin or stock internals", async () => {
    const response = await app.inject("/api/v1/products/sculpted-band-ring");
    expect(response.statusCode).toBe(200);
    const { data } = productResponseSchema.parse(response.json());
    expect(data.pricePaise).toBe(325000);
    expect(data.variants).toHaveLength(3);
    expect(data.available).toBe(true);
    expect(
      data.variants.find((variant) => variant.sku === "DEV-RING-14")?.available,
    ).toBe(false);
    expect(response.body).not.toContain("stockQuantity");
    expect(response.body).not.toContain("passwordHash");
  });
  it("hides archived products and returns active taxonomies", async () => {
    expect(
      (await app.inject("/api/v1/products/archived-sample")).statusCode,
    ).toBe(404);
    expect(
      categoriesResponseSchema.parse(
        (await app.inject("/api/v1/categories")).json(),
      ).data.length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      collectionsResponseSchema
        .parse((await app.inject("/api/v1/collections")).json())
        .data.some((c) => c.slug === "everyday-edit"),
    ).toBe(true);
  });
  it("enforces monetary and stock constraints in PostgreSQL", async () => {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      for (const assignment of ['"pricePaise" = -1', '"stockQuantity" = -1']) {
        await client.query("BEGIN");
        try {
          await expect(
            client.query(
              `UPDATE "Product" SET ${assignment} WHERE slug = 'petal-stud-earrings'`,
            ),
          ).rejects.toMatchObject({ code: "23514" });
        } finally {
          await client.query("ROLLBACK");
        }
      }
      const admins = await client.query(
        'SELECT count(*)::int AS count FROM "AdminUser"',
      );
      expect(admins.rows[0].count).toBe(0);
    } finally {
      await client.end();
    }
  });
  it("probes the actual database", async () => {
    const response = await app.inject("/api/health");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", database: "up" });
  });
  it("hides inactive memberships and variants, orders images, and respects category visibility", async () => {
    const slug = `integration-${randomUUID()}`;
    const category = await app.db.category.create({
      data: { name: "Temporary test category", slug },
    });
    const collection = await app.db.collection.create({
      data: { name: "Temporary hidden collection", slug, active: false },
    });
    try {
      await app.db.product.create({
        data: {
          name: "Temporary product",
          slug,
          description: "Integration fixture",
          categoryId: category.id,
          pricePaise: 100,
          stockQuantity: 99,
          images: {
            create: [
              { url: "/images/second.svg", alt: "Second", position: 1 },
              { url: "/images/first.svg", alt: "First", position: 0 },
            ],
          },
          variants: {
            create: [
              {
                name: "Hidden",
                sku: `${slug}-hidden`,
                active: false,
                stockQuantity: 99,
              },
              { name: "Visible", sku: `${slug}-visible`, stockQuantity: 0 },
            ],
          },
          collections: { create: { collectionId: collection.id } },
        },
      });
      const { data } = productResponseSchema.parse(
        (await app.inject(`/api/v1/products/${slug}`)).json(),
      );
      expect(data.available).toBe(false);
      expect(data.variants).toHaveLength(1);
      expect(data.variants[0]?.name).toBe("Visible");
      expect(data.images.map((image) => image.position)).toEqual([0, 1]);
      expect(data.collections).toEqual([]);
      await app.db.category.update({
        where: { id: category.id },
        data: { active: false },
      });
      expect((await app.inject(`/api/v1/products/${slug}`)).statusCode).toBe(
        404,
      );
      const list = productsResponseSchema.parse(
        (await app.inject("/api/v1/products?limit=50")).json(),
      );
      expect(list.data.some((product) => product.slug === slug)).toBe(false);
      const categories = categoriesResponseSchema.parse(
        (await app.inject("/api/v1/categories")).json(),
      );
      expect(categories.data.some((item) => item.slug === slug)).toBe(false);
      const collections = collectionsResponseSchema.parse(
        (await app.inject("/api/v1/collections")).json(),
      );
      expect(collections.data.some((item) => item.slug === slug)).toBe(false);
    } finally {
      await app.db.product.deleteMany({ where: { slug } });
      await app.db.category.delete({ where: { id: category.id } });
      await app.db.collection.delete({ where: { id: collection.id } });
    }
  });
});
