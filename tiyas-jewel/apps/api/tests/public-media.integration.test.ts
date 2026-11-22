import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import { beforeAll, afterAll, expect, it } from "vitest";
import {
  contentValueSchema,
  productResponseSchema,
  publicContentResponseSchema,
} from "@tiyas/shared";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { adminCatalog } from "../src/modules/admin/catalog.js";
import { adminContent } from "../src/modules/admin/content.js";
import {
  drainMediaPurge,
  PurgeFailure,
} from "../src/modules/media/cdn-purge.js";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw Error("Use a dedicated database for public media integration tests");
const config = parseEnv({
  DATABASE_URL: url,
  NODE_ENV: "test",
  PUBLIC_MEDIA_CACHE_ENABLED: "true",
  CDN_PROVIDER: "cloudflare",
  CDN_PUBLIC_HOSTS: "tiyas.example,www.tiyas.example",
  CDN_ZONE_ID: "1".repeat(32),
  CDN_PURGE_API_TOKEN: "fixture-token-not-a-secret",
});
const bytes = new Map<string, Buffer>();
const storage = {
  async put(key: string, value: Buffer) {
    bytes.set(key, value);
  },
  async get(key: string) {
    const value = bytes.get(key);
    if (!value) throw Error("Missing fixture");
    return value;
  },
  async remove(key: string) {
    bytes.delete(key);
  },
};
let app: FastifyInstance;
let adminId: string;
let product: { id: string; slug: string };
let asset: { id: string; url: string };
let publicPath: string;
const cmsKey = `page-cdn-${randomUUID()}`;

beforeAll(async () => {
  app = await buildApp(config, { logger: false, background: false, storage });
  adminId = (
    await app.db.adminUser.create({
      data: {
        email: `cdn-${randomUUID()}@example.test`,
        passwordHash: "disabled-fixture",
        active: false,
      },
    })
  ).id;
  const category = await app.db.category.findFirstOrThrow({
    where: { active: true },
  });
  product = await app.db.product.create({
    data: {
      slug: `cdn-${randomUUID()}`,
      name: "CDN test product",
      description: "Local test data",
      pricePaise: 10000,
      stockQuantity: 1,
      categoryId: category.id,
    },
  });
  const image = await sharp({
    create: { width: 600, height: 900, channels: 3, background: "#bf9b7e" },
  })
    .png()
    .toBuffer();
  asset = (await adminCatalog(app.db, storage).upload(image, adminId)).data;
  const derivative = await app.db.imageRendition.findFirstOrThrow({
    where: { assetId: asset.id, width: 320 },
  });
  publicPath = `/media/public/${asset.id}/${derivative.contentHash}/320.webp`;
});

afterAll(async () => {
  if (!app) return;
  if (asset) {
    await app.db.contentDocument.deleteMany({ where: { key: cmsKey } });
    await app.db.customerStory.deleteMany({
      where: { imageAssetId: asset.id },
    });
  }
  if (product) await app.db.product.deleteMany({ where: { id: product.id } });
  if (asset) {
    await app.db.imageAsset.deleteMany({ where: { id: asset.id } });
    await app.db.$executeRaw`DELETE FROM "MediaPurgeEvent" WHERE EXISTS (
      SELECT 1 FROM unnest("paths") AS path WHERE path LIKE ${`/media/public/${asset.id}/%`}
    )`;
  }
  if (adminId) await app.db.adminUser.deleteMany({ where: { id: adminId } });
  await app.close();
});

it("keeps drafts private and publishes only byte-verified responsive URLs", async () => {
  const draft = await app.inject({
    url: publicPath,
    headers: { cookie: "probe=1" },
  });
  expect([draft.statusCode, draft.headers["cache-control"]]).toEqual([
    404,
    "private, no-store",
  ]);
  await app.db.productImage.create({
    data: {
      productId: product.id,
      assetId: asset.id,
      url: asset.url,
      alt: "Isolated WebP",
      position: 0,
    },
  });

  const response = await app.inject(publicPath);
  expect(
    response.statusCode,
    response.body.length < 200 ? response.body : "WebP payload",
  ).toBe(200);
  expect(response.headers["cache-control"]).toBe(
    "public, max-age=60, s-maxage=300, must-revalidate",
  );
  expect(response.headers["set-cookie"]).toBeUndefined();
  expect(response.headers["content-type"]).toContain("image/webp");
  expect((await sharp(response.rawPayload).metadata()).width).toBe(320);
  expect(
    (
      await app.inject({
        url: publicPath,
        headers: { "if-none-match": `W/${response.headers.etag}` },
      })
    ).statusCode,
  ).toBe(304);
  const head = await app.inject({ method: "HEAD", url: publicPath });
  expect(head.headers["content-length"]).toBe(
    response.headers["content-length"],
  );
  expect(head.headers["cache-control"]).toBe("private, no-store");
  expect(head.rawPayload.length).toBe(0);
  for (const headers of [
    { cookie: "probe=1" },
    { authorization: "Bearer synthetic" },
    { range: "bytes=0-10" },
  ]) {
    expect(
      (await app.inject({ url: publicPath, headers })).headers["cache-control"],
    ).toBe("private, no-store");
  }
  for (const path of [
    `${publicPath}?width=320`,
    publicPath.replace("320.webp", "321.webp"),
    publicPath.replace(/\/[a-f0-9]{64}\//, `/${"a".repeat(64)}/`),
  ]) {
    const result = await app.inject(path);
    expect([result.statusCode, result.headers["cache-control"]]).toEqual([
      404,
      "private, no-store",
    ]);
  }
  const catalog = productResponseSchema.parse(
    (await app.inject(`/api/v1/products/${product.slug}`)).json(),
  );
  expect(catalog.data.images[0]).toMatchObject({
    url: asset.url,
    publicMedia: expect.arrayContaining([
      expect.objectContaining({ src: publicPath }),
    ]),
  });
  expect(
    (await app.inject(`${asset.url}?width=320`)).headers["cache-control"],
  ).toBe("private, no-store");

  const r = await app.db.imageRendition.findFirstOrThrow({
    where: { assetId: asset.id, width: 320 },
  });
  const original = bytes.get(r.objectKey)!;
  bytes.set(r.objectKey, Buffer.alloc(original.length));
  try {
    const corrupt = await app.inject(publicPath);
    expect([corrupt.statusCode, corrupt.headers["cache-control"]]).toEqual([
      503,
      "private, no-store",
    ]);
  } finally {
    bytes.set(r.objectKey, original);
  }
});

it("retains another live use, then revokes origin access and retries exact purges durably", async () => {
  const value = {
    type: "page",
    content: {
      title: "Staging photo",
      description: "Test",
      body: "Public fixture",
      image: asset.url,
      alt: "Fixture",
    },
  };
  await app.db.contentDocument.create({
    data: {
      key: cmsKey,
      draft: value,
      published: value,
      assets: { create: { assetId: asset.id, published: true } },
    },
  });
  await app.db.product.update({
    where: { id: product.id },
    data: { active: false },
  });
  expect((await app.inject(publicPath)).statusCode).toBe(200);
  const cms = publicContentResponseSchema.parse(
    (await app.inject(`/api/v1/content/${cmsKey}`)).json(),
  );
  expect(cms.media?.[asset.url]).toEqual(
    expect.arrayContaining([expect.objectContaining({ src: publicPath })]),
  );
  const event = await app.db.mediaPurgeEvent.findFirstOrThrow({
    where: { paths: { has: publicPath } },
  });
  const candidates = event.paths;
  await adminContent(app.db).save(
    cmsKey,
    1,
    contentValueSchema.parse(value),
    false,
  );
  expect(
    (
      await app.inject({
        url: publicPath,
        headers: { cookie: "probe=1", "if-none-match": "*" },
      })
    ).statusCode,
  ).toBe(404);
  // Restrict the worker integration check to our fixture's due rows. Other legacy
  // tests may leave unrelated durable events in the intentionally reused database.
  const clock = new Date("2000-01-01T00:00:00Z");
  const fixture = { paths: { has: publicPath } };
  const exclude = { NOT: fixture, nextAttemptAt: { lte: clock } };
  expect(await app.db.mediaPurgeEvent.count({ where: exclude })).toBe(0);
  await app.db.mediaPurgeEvent.updateMany({
    where: fixture,
    data: { nextAttemptAt: clock },
  });
  const calls: string[][] = [];
  const attempted = await drainMediaPurge(
    app.db,
    async (paths) => {
      calls.push(paths);
      throw new PurgeFailure("rate_limit", 90000);
    },
    clock,
  );
  expect(attempted.failures).toBeGreaterThan(0);
  expect(calls[0]).toEqual(expect.arrayContaining(candidates));
  expect(new Set(calls[0]).size).toBe(calls[0]!.length);
  const retry = await app.db.mediaPurgeEvent.findFirstOrThrow({
    where: fixture,
  });
  expect(retry.attempts).toBe(1);
  expect(retry.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(
    clock.getTime() + 90000,
  );
  expect(
    (
      await drainMediaPurge(
        app.db,
        async () => {
          throw Error("Too early");
        },
        clock,
      )
    ).processed,
  ).toBe(0);
  await drainMediaPurge(
    app.db,
    async (paths) => {
      expect(paths).toContain(publicPath);
    },
    retry.nextAttemptAt,
  );
  expect(await app.db.mediaPurgeEvent.count({ where: fixture })).toBe(0);
});

it("records revocation atomically and excludes customer portraits even with a live product reference", async () => {
  await app.db.product.update({
    where: { id: product.id },
    data: { active: true },
  });
  expect((await app.inject(publicPath)).statusCode).toBe(200);
  const events = { paths: { has: publicPath } };
  const change = {
    imageAssetId: asset.id,
    title: "Consented local portrait",
    caption: "Isolated fixture",
    displayName: "Test",
    alt: "Fixture",
    consentEvidence: "Isolated fixture with no real customer data",
    consentAt: new Date(),
    updatedBy: adminId,
  };
  await expect(
    app.db.$transaction(async (tx) => {
      await tx.customerStory.create({ data: change });
      expect(await tx.mediaPurgeEvent.count({ where: events })).toBeGreaterThan(
        0,
      );
      throw Error("Roll back the fixture");
    }),
  ).rejects.toThrow("Roll back the fixture");
  expect(await app.db.mediaPurgeEvent.count({ where: events })).toBe(0);
  expect((await app.inject(publicPath)).statusCode).toBe(200);

  await app.db.customerStory.create({ data: change });
  expect(await app.db.mediaPurgeEvent.count({ where: events })).toBeGreaterThan(
    0,
  );
  const denied = await app.inject(publicPath);
  expect([denied.statusCode, denied.headers["cache-control"]]).toEqual([
    404,
    "private, no-store",
  ]);
  const productAfter = (
    await app.inject(`/api/v1/products/${product.slug}`)
  ).json();
  expect(productAfter.data.images[0].publicMedia).toBeUndefined();
});
