import { test, expect, type Page } from "@playwright/test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
const fixtureEmails = new WeakMap<Page, string>();
test.beforeEach(async ({ page }) => {
  fixtureEmails.set(page, `checkout-e2e-${randomUUID()}@example.test`);
});
test.afterEach(async ({ page }) => {
  const email = fixtureEmails.get(page);
  if (!email || !process.env.E2E_DATABASE_URL) return;
  const db = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN");
    const orders = await db.query<{ id: string; reservationState: string }>(
      'SELECT id, "reservationState" FROM "Order" WHERE "customerEmail" = $1 FOR UPDATE',
      [email],
    );
    for (const order of orders.rows) {
      if (order.reservationState !== "RELEASED") {
        const lines = await db.query<{
          productId: string;
          variantId: string | null;
          quantity: number;
        }>(
          'SELECT "productId", "variantId", quantity FROM "OrderItem" WHERE "orderId" = $1',
          [order.id],
        );
        for (const line of lines.rows) {
          if (line.variantId)
            await db.query(
              'UPDATE "ProductVariant" SET "stockQuantity" = "stockQuantity" + $1 WHERE id = $2',
              [line.quantity, line.variantId],
            );
          else
            await db.query(
              'UPDATE "Product" SET "stockQuantity" = "stockQuantity" + $1 WHERE id = $2',
              [line.quantity, line.productId],
            );
        }
      }
      await db.query('DELETE FROM "Payment" WHERE "orderId" = $1', [order.id]);
      await db.query('DELETE FROM "OrderItem" WHERE "orderId" = $1', [
        order.id,
      ]);
      await db.query('DELETE FROM "Order" WHERE id = $1', [order.id]);
    }
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    await db.end();
  }
});
async function bag(page: Page) {
  await page.goto("/products/everyday-hoops");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Your bag." });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
}
async function details(page: Page) {
  await page.getByLabel("Full name", { exact: true }).fill("Aarohi Sample");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(fixtureEmails.get(page)!);
  await page.getByLabel("Indian mobile number").fill("9876543210");
  await page
    .getByLabel("Address line 1", { exact: true })
    .fill("12 Sample Garden Road");
  await page.getByLabel("City", { exact: true }).fill("Mumbai");
  await page.getByLabel("State or union territory").selectOption("Maharashtra");
  await page.getByLabel("PIN code", { exact: true }).fill("400001");
  await expect(
    page.getByRole("complementary", { name: "Order summary" }),
  ).toContainText("1,389.00");
}
async function capture(page: Page, path: string) {
  await mkdir("output/playwright", { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((i) => {
        i.loading = "eager";
        return i.decode().catch(() => undefined);
      }),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      [...document.images].every((i) => i.naturalWidth > 0),
    ),
  ).toBe(true);
  const dismiss = page.getByRole("button", { name: "Dismiss message" });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({ path, fullPage: true, scale: "css" });
}
test("guest checkout validates details, simulates verified development payment and keeps private confirmation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await bag(page);
  await page.getByLabel("PIN code", { exact: true }).fill("400001");
  await expect(
    page.getByRole("button", { name: "Continue to payment", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Continue to payment", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "highlighted",
  );
  await details(page);
  await expect(
    page.getByText("Development checkout preview.", { exact: false }),
  ).toBeVisible();
  await capture(
    page,
    `output/playwright/stage04-checkout-${info.project.name}.png`,
  );
  await page
    .getByRole("button", { name: "Continue to payment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order-confirmation#[a-f0-9]{64}$/);
  await expect(
    page.getByRole("heading", { name: "Your selection is reserved." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A lovely choice." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PAID", exact: true }),
  ).toBeVisible();
  await capture(
    page,
    `output/playwright/stage04-confirmation-${info.project.name}.png`,
  );
  const privateUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A lovely choice." }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(
    page.getByText("Your bag is waiting for a piece that feels like you."),
  ).toBeVisible();
  await page.goto(privateUrl);
  await expect(
    page.getByRole("heading", { name: "A lovely choice." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("places COD with a persisted address and accurate backend totals", async ({
  page,
}) => {
  await bag(page);
  await details(page);
  await page.getByRole("radio", { name: "Cash on delivery" }).check();
  await page
    .getByRole("button", { name: "Place cash on delivery order" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A lovely choice." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "COD PENDING" }),
  ).toBeVisible();
  await expect(page.locator(".confirmation-address")).toContainText(
    "12 Sample Garden Road",
  );
  await expect(
    page.getByRole("complementary", { name: "Order summary" }),
  ).toContainText("1,389.00");
  await page.reload();
  await expect(page.locator(".confirmation-address")).toContainText(
    "Aarohi Sample",
  );
});
test("handles a failed development payment and rejects invalid private links", async ({
  page,
}) => {
  await bag(page);
  await details(page);
  await page
    .getByRole("button", { name: "Continue to payment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Simulate failed payment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Simulate failed payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Payment was not completed." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start a new checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.goto("/order-confirmation#invalid");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "missing or invalid",
  );
});
