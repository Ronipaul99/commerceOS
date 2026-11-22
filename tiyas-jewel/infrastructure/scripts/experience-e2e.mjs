// Reproducible test-only mail/media environment. Never imports store configuration.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import pg from "pg";

const source = process.env.E2E_DATABASE_URL;
if (!source)
  throw Error(
    "Set E2E_DATABASE_URL to an explicitly dedicated local test database.",
  );
const target = new URL(source);
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
  !/^\/tiyas_customer_experience_[a-z0-9_]+$/.test(target.pathname)
)
  throw Error(
    "Customer-experience browser tests require a local tiyas_customer_experience_* database. Store targets are forbidden.",
  );
const directory = "output/verification";
const fixtureFile = `${directory}/customer-experience-browser.json`;
const mailFile = `${directory}/customer-experience-emails.json`;
const codeFile = `${directory}/customer-experience-code.json`;
mkdirSync(directory, { recursive: true });
function save(file, data) {
  writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
}

async function cleanup() {
  if (!existsSync(fixtureFile)) return;
  const f = JSON.parse(readFileSync(fixtureFile, "utf8"));
  if (!/^cx-browser-.*@example\.test$/.test(f.email))
    throw Error("Unrecognized test fixture identity.");
  const db = new pg.Client({ connectionString: source });
  await db.connect();
  try {
    const owner = await db.query(
      'SELECT id FROM "AdminUser" WHERE id=$1 AND email=$2',
      [f.ownerId, f.email],
    );
    if (!owner.rowCount) return;
    const emails = existsSync(mailFile)
      ? JSON.parse(readFileSync(mailFile, "utf8"))
      : [];
    if (!emails.every((e) => /^qa-review-.*@example\.test$/.test(e)))
      throw Error("Unexpected test-mail identity.");
    await db.query("BEGIN");
    const orders = (
      await db.query(
        'SELECT DISTINCT "orderId" AS id FROM "OrderItem" WHERE "productId"=$1',
        [f.productId],
      )
    ).rows.map((r) => r.id);
    await db.query('DELETE FROM "CustomerStory" WHERE "updatedBy"=$1', [
      f.ownerId,
    ]);
    await db.query(
      'DELETE FROM "CustomerReview" WHERE "productId"=$1 OR id=ANY($2::text[]) OR email=ANY($3::text[])',
      [f.productId, f.reviewIds, emails],
    );
    await db.query(
      'DELETE FROM "ReviewChallenge" WHERE email=ANY($1::text[])',
      [emails],
    );
    for (const table of ["CouponRedemption", "Payment", "OrderItem"])
      await db.query(`DELETE FROM "${table}" WHERE "orderId"=ANY($1::text[])`, [
        orders,
      ]);
    await db.query('DELETE FROM "Order" WHERE id=ANY($1::text[])', [orders]);
    await db.query('DELETE FROM "Coupon" WHERE "updatedBy"=$1', [f.ownerId]);
    await db.query('DELETE FROM "Reel" WHERE "updatedBy"=$1', [f.ownerId]);
    await db.query('DELETE FROM "Product" WHERE id=$1 AND slug=$2', [
      f.productId,
      f.slug,
    ]);
    await db.query('DELETE FROM "ImageAsset" WHERE "uploaderId"=$1', [
      f.ownerId,
    ]);
    await db.query('DELETE FROM "AdminUser" WHERE id=$1', [f.ownerId]);
    await db.query("COMMIT");
    for (const file of [fixtureFile, mailFile, codeFile])
      if (existsSync(file)) unlinkSync(file);
    console.log("Removed only this run's isolated browser fixtures.");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}

async function serve() {
  const { buildApp } = await import("../../apps/api/dist/app.js");
  const { parseEnv } = await import("../../apps/api/dist/config/env.js");
  const { hashPassword } =
    await import("../../apps/api/dist/modules/admin/auth.js");
  const { adminCatalog } =
    await import("../../apps/api/dist/modules/admin/catalog.js");
  const { imageStorage } =
    await import("../../apps/api/dist/integrations/image-storage.js");
  const config = parseEnv({
    DATABASE_URL: source,
    NODE_ENV: "test",
    API_HOST: "127.0.0.1",
    API_PORT: "4310",
    CORS_ORIGINS: "http://127.0.0.1:3310",
    PAYMENT_ADAPTER: "development",
    COD_ENABLED: "true",
    REVIEWS_ENABLED: "true",
    HOMEPAGE_REVIEWS_ENABLED: "true",
    COUPONS_ENABLED: "true",
    REELS_ENABLED: "true",
    REVIEW_OTP_SECRET: randomBytes(32).toString("hex"),
    STORAGE_ADAPTER: "local",
    STORAGE_LOCAL_DIR: `${directory}/customer-experience-uploads`,
    LOG_LEVEL: "warn",
  });
  const sent = [];
  save(mailFile, sent);
  const app = await buildApp(config, {
    background: false,
    reviewEmail: {
      async sendCode(email, code) {
        if (!/^qa-review-.*@example\.test$/.test(email))
          throw Error("Real mail is forbidden in this test transport.");
        sent.push(email);
        save(mailFile, sent);
        save(codeFile, { code });
      },
    },
  });
  const suffix = randomUUID(),
    password = randomBytes(24).toString("hex"),
    email = `cx-browser-${suffix}@example.test`;
  const category = await app.db.category.findFirst({ where: { active: true } });
  if (!category)
    throw Error(
      "Migrate and seed this dedicated test database first. This runner never resets or seeds it.",
    );
  const owner = await app.db.adminUser.create({
    data: {
      name: "QA Owner",
      email,
      passwordHash: await hashPassword(password),
      role: "OWNER",
    },
  });
  // Save identity immediately so an interrupted setup remains safely cleanable.
  const f = {
    email,
    password,
    ownerId: owner.id,
    productId: "",
    slug: "",
    assetId: "",
    reviewIds: [],
  };
  save(fixtureFile, f);
  const uploaded = await adminCatalog(app.db, imageStorage(config)).upload(
    readFileSync("apps/web/public/images/campaign/silver.webp"),
    owner.id,
  );
  const product = await app.db.product.create({
    data: {
      name: "QA Silver Statement Set",
      slug: `cx-browser-${suffix}`,
      description: "Isolated browser fixture, never a live catalog record.",
      pricePaise: 249000,
      stockQuantity: 20,
      categoryId: category.id,
      images: {
        create: {
          url: uploaded.data.url,
          assetId: uploaded.data.id,
          alt: "Isolated jewellery still-life fixture",
          position: 0,
          concept: true,
        },
      },
      details: { material: "QA fixture metal", size: "QA adjustable fit" },
    },
  });
  Object.assign(f, {
    productId: product.id,
    slug: product.slug,
    assetId: uploaded.data.id,
  });
  save(fixtureFile, f);
  for (let n = 0; n < 3; n++) {
    const review = await app.db.customerReview.create({
      data: {
        kind: "STORE",
        subjectKey: "STORE",
        emailKey: randomBytes(32).toString("hex"),
        email: `qa-${n}-${suffix}@example.test`,
        displayName: `QA Customer ${n + 1}`,
        title: "Isolated review fixture",
        text: "A layout and interaction test fixture for the Tiyas customer experience. This is not a real customer testimonial.",
        rating: n === 1 ? 4 : 5,
        status: "PUBLISHED",
        consentAt: new Date(),
        consentVersion: "QA fixture only",
        publishedAt: new Date(),
      },
    });
    f.reviewIds.push(review.id);
    save(fixtureFile, f);
  }
  await app.db.customerStory.create({
    data: {
      title: "A personal expression — QA fixture",
      caption:
        "Isolated layout fixture using jewellery imagery, not a customer portrait.",
      displayName: "QA Customer",
      reviewId: f.reviewIds[0],
      imageAssetId: uploaded.data.id,
      alt: "Isolated jewellery still-life",
      consentEvidence: "Synthetic test fixture, not a customer record.",
      consentAt: new Date(),
      published: true,
      updatedBy: owner.id,
    },
  });
  await app.listen({ host: "127.0.0.1", port: 4310 });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => void app.close().then(() => process.exit(0)));
}

if (process.argv[2] === "--serve") await serve();
else if (process.argv[2] === "--cleanup") await cleanup();
else {
  if (!process.env.npm_execpath)
    throw Error("Run npm run test:e2e:experience.");
  const env = {
    ...process.env,
    DATABASE_URL: source,
    DIRECT_DATABASE_URL: source,
    API_INTERNAL_URL: "http://127.0.0.1:4310",
    UI_REVIEW_BUILD: "true",
    EXPERIENCE_E2E: "true",
  };
  function run(args) {
    const r = spawnSync(process.execPath, args, {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    if (r.error) throw r.error;
    if (r.status) throw Error(`Isolated test command failed (${r.status}).`);
  }
  const servers = [];
  async function assertAvailable(port) {
    const probe = createServer();
    await new Promise((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(port, "127.0.0.1", () => probe.close(resolve));
    });
  }
  async function start(args, cwd, readyUrl) {
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    const stopped = new Promise((resolve) => {
      child.once("exit", resolve);
      child.once("error", resolve);
    });
    servers.push({ child, stopped });
    for (let attempt = 0; attempt < 120; attempt++) {
      if (!child.pid || child.exitCode !== null) break;
      const response = await fetch(readyUrl, {
        signal: AbortSignal.timeout(1000),
      }).catch(() => null);
      if (response?.ok) {
        await response.body?.cancel();
        return;
      }
      await response?.body?.cancel();
      await delay(500);
    }
    throw Error(`Review server did not become ready at ${readyUrl}.`);
  }
  await Promise.all([assertAvailable(4310), assertAvailable(3310)]);
  await cleanup();
  try {
    run([process.env.npm_execpath, "run", "build:api"]);
    run([process.env.npm_execpath, "run", "build:web"]);
    await start(
      [path.resolve("infrastructure/scripts/experience-e2e.mjs"), "--serve"],
      process.cwd(),
      "http://127.0.0.1:4310/api/health",
    );
    await start(
      [
        path.resolve("node_modules/next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3310",
      ],
      path.resolve("apps/web"),
      "http://127.0.0.1:3310",
    );
    run([
      path.resolve("node_modules/playwright/cli.js"),
      "test",
      "--config",
      "playwright.experience.config.ts",
      ...process.argv.slice(2),
    ]);
  } finally {
    for (const { child } of servers.reverse()) child.kill();
    await Promise.all(servers.map(({ stopped }) => stopped));
    await cleanup();
  }
}
