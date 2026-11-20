import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { hashPassword } from "../../apps/api/src/modules/admin/auth.js";
type Fixture = { id: string; email: string; password: string; slug: string };
const fixtures = new WeakMap<Page, Fixture>();
test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_DATABASE_URL)
    throw Error(
      "E2E_DATABASE_URL must point to an isolated migrated/seeded database",
    );
  const f = {
    id: randomUUID(),
    email: `admin-e2e-${randomUUID()}@example.test`,
    password: randomBytes(24).toString("hex"),
    slug: `admin-e2e-${randomUUID()}`,
  };
  fixtures.set(page, f);
  const db = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
  await db.connect();
  try {
    await db.query(
      'INSERT INTO "AdminUser" (id,email,"passwordHash","updatedAt") VALUES ($1,$2,$3,NOW())',
      [f.id, f.email, await hashPassword(f.password)],
    );
  } finally {
    await db.end();
  }
});
test.afterEach(async ({ page }) => {
  const f = fixtures.get(page);
  if (!f || !process.env.E2E_DATABASE_URL) return;
  const db = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      'DELETE FROM "Payment" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "customerEmail"=$1)',
      [f.email],
    );
    await db.query(
      'DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "customerEmail"=$1)',
      [f.email],
    );
    await db.query('DELETE FROM "Order" WHERE "customerEmail"=$1', [f.email]);
    await db.query(
      'UPDATE "ProductVariant" SET "imageId"=NULL WHERE "productId" IN (SELECT id FROM "Product" WHERE slug LIKE $1)',
      [f.slug + "%"],
    );
    await db.query('DELETE FROM "Product" WHERE slug LIKE $1', [f.slug + "%"]);
    const assets = await db.query<{ id: string }>(
      'DELETE FROM "ImageAsset" WHERE "uploaderId"=$1 RETURNING id',
      [f.id],
    );
    await db.query('DELETE FROM "AdminUser" WHERE id=$1', [f.id]);
    await db.query("COMMIT");
    for (const asset of assets.rows) {
      if (!/^[a-f0-9-]{36}$/.test(asset.id))
        throw Error("Unsafe fixture asset");
      await unlink(
        path.resolve(
          "output/verification/e2e-uploads/products",
          `${asset.id}.webp`,
        ),
      ).catch(() => undefined);
    }
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    await db.end();
  }
});
async function capture(page: Page, name: string) {
  await mkdir("output/playwright", { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((i) => {
        i.loading = "eager";
        return i.decode().catch(() => undefined);
      }),
    );
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(
    await page.evaluate(() =>
      [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: `output/playwright/${name}.png`,
    fullPage: true,
    scale: "css",
  });
}
test("owner securely manages products, photos and accepted orders", async ({
  page,
  request,
}, info) => {
  test.setTimeout(150000);
  page.setDefaultTimeout(15000);
  const f = fixtures.get(page)!;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect((await request.get("/api/v1/admin/dashboard")).status()).toBe(401);
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page
    .getByRole("link", { name: "Skip to content", exact: true })
    .focus();
  await expect(
    page.getByRole("link", { name: "Skip to content", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await capture(page, `${info.project.name}-login`);
  await page.getByLabel("Email address", { exact: true }).fill(f.email);
  await page.getByLabel("Password", { exact: true }).fill(f.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Store overview", exact: true }),
  ).toBeVisible();
  await capture(page, `${info.project.name}-dashboard`);
  await page.getByRole("link", { name: "Add product", exact: true }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Owner test jewellery");
  await page.getByLabel("Product slug", { exact: true }).fill(f.slug);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Temporary isolated product created through the owner interface.");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption({ label: "Earrings" });
  await page.getByLabel("SKU", { exact: true }).fill(f.slug);
  await page.getByLabel("Price (INR)", { exact: true }).fill("1490.00");
  await page
    .getByLabel("Compare-at price (INR)", { exact: true })
    .fill("1990.00");
  await page.getByLabel("Available stock", { exact: false }).fill("5");
  await page
    .getByLabel("Upload product images", { exact: true })
    .setInputFiles([
      "apps/web/public/images/campaign/pearl.webp",
      "apps/web/public/images/campaign/silver.webp",
    ]);
  await expect(page.locator(".admin-image-item")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Create product", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Move image 2 earlier", exact: true })
    .click();
  await page
    .getByLabel("Image description", { exact: true })
    .first()
    .fill("First product detail");
  await page
    .getByLabel("Replace image 2", { exact: true })
    .setInputFiles("apps/web/public/images/campaign/brace.webp");
  await expect(
    page.getByRole("button", { name: "Create product", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Add variant", exact: true }).click();
  await page.getByLabel("Variant name", { exact: true }).fill("Gold finish");
  await page.getByLabel("Variant SKU", { exact: true }).fill(`${f.slug}-gold`);
  await page.getByLabel("Variant price (INR)", { exact: true }).fill("1590.00");
  await page.getByLabel("Variant stock", { exact: true }).fill("3");
  await page
    .getByRole("combobox", { name: "Variant image", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Create product", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/products\/[^/]+\/edit\?saved=1$/);
  await expect(page.getByRole("status")).toHaveText("Product saved.");
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Owner edited jewellery");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByLabel("Product name", { exact: true })).toHaveValue(
    "Owner edited jewellery",
  );
  // Wait for the persisted name, not the optimistic form value.
  await expect(page.locator(".admin-page-heading")).toContainText(
    "Owner edited jewellery",
  );
  await expect
    .poll(async () => {
      const r = await request.get(`/api/v1/products/${f.slug}`);
      return r.ok() ? (await r.json()).data.name : "";
    })
    .toBe("Owner edited jewellery");
  await capture(page, `${info.project.name}-product-edit`);
  if (info.project.name === "admin-mobile") {
    await page.setViewportSize({ width: 320, height: 844 });
    await capture(page, "admin-mobile-product-edit-320");
    await page.setViewportSize({ width: 390, height: 844 });
  }
  const publicProduct = (
    await (await request.get(`/api/v1/products/${f.slug}`)).json()
  ).data;
  expect(publicProduct.images).toHaveLength(2);
  expect(publicProduct.variants[0].imageId).toBe(publicProduct.images[0].id);
  const session = await (
    await page.request.get("/api/v1/admin/session")
  ).json();
  const headers = { "X-CSRF-Token": session.data.csrfToken };
  const refs = [
    {
      productId: publicProduct.id,
      slug: f.slug,
      variantId: publicProduct.variants[0].id,
      quantity: 1,
    },
  ];
  const quote = await (
    await request.post("/api/v1/checkout/quote", {
      data: { items: refs, pinCode: "400001" },
    })
  ).json();
  const placed = await request.post("/api/v1/checkout/place", {
    data: {
      items: refs,
      pinCode: "400001",
      customer: {
        fullName: "Owner Test Customer",
        email: f.email,
        mobile: "9876543210",
      },
      address: {
        line1: "12 Sample Garden Road",
        line2: "Second floor",
        landmark: "Near sample park",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400001",
        country: "IN",
      },
      paymentMethod: "COD",
      expectedTotalPaise: quote.data.totalPaise,
      quoteFingerprint: quote.data.fingerprint,
      idempotencyKey: randomUUID(),
      confirmationToken: randomBytes(32).toString("hex"),
    },
  });
  expect(placed.ok(), await placed.text()).toBe(true);
  const orderNumber = (await placed.json()).data.orderNumber;
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  await page.getByRole("link", { name: orderNumber, exact: true }).click();
  await expect(
    page.getByRole("link", { name: "+91 9876543210", exact: true }),
  ).toBeVisible();
  await expect(page.locator("address")).toContainText("12 Sample Garden Road");
  await capture(page, `${info.project.name}-order`);
  if (info.project.name === "admin-mobile") {
    await page.setViewportSize({ width: 320, height: 844 });
    await capture(page, "admin-mobile-order-320");
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page
    .getByRole("button", { name: "Mark as Completed", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Mark this order completed?",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark as Completed", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Mark as Completed", exact: true })
    .click();
  await expect(page.locator(".admin-order-top .admin-status")).toHaveText(
    "Completed",
  );
  const orderId = page.url().split("/").at(-1)!;
  const detail = await (
    await page.request.get(`/api/v1/admin/orders/${orderId}`)
  ).json();
  const duplicate = await page.request.post(
    `/api/v1/admin/orders/${orderId}/complete`,
    { headers, data: {} },
  );
  expect(duplicate.ok()).toBe(true);
  expect((await duplicate.json()).data.completedAt).toBe(
    detail.data.completedAt,
  );
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page
      .locator(".admin-metrics article")
      .filter({ hasText: "Completed Orders" })
      .locator("strong"),
  ).not.toHaveText("0");
  await page.goto(`/admin/products?q=${f.slug}`);
  await capture(page, `${info.project.name}-products`);
  await page
    .getByRole("button", { name: "Delete Owner edited jewellery", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete product", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "referenced by an order",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Archive Owner edited jewellery",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive product", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Product archived.");
  expect((await request.get(`/api/v1/products/${f.slug}`)).status()).toBe(404);
  // Exercise safe deletion of an unused product through the same owner interface.
  const unused = await page.request.post("/api/v1/admin/products", {
    headers,
    data: {
      name: "Unused owner test",
      slug: f.slug + "-unused",
      description: "Unused isolated fixture",
      categoryId: publicProduct.category.id,
      collectionIds: [],
      pricePaise: 100000,
      compareAtPaise: null,
      sku: f.slug + "-unused",
      stockQuantity: 1,
      active: false,
      featured: false,
      images: [],
      variants: [],
    },
  });
  expect(unused.status()).toBe(201);
  await page.goto(`/admin/products?q=${f.slug}-unused`);
  await page
    .getByRole("button", { name: "Delete Unused owner test", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete product", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Product deleted.");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await page.request.get("/api/v1/admin/orders")).status()).toBe(401);
  expect(errors).toEqual([]);
});
