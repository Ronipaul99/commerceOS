import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("shared cards support image controls, quick view, size availability and verified cart selection", async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith("admin"));
  await page.goto("/shop?category=rings");
  const card = page.locator(".tj-product-card").filter({
    has: page.getByRole("heading", {
      name: "Sculpted Band Ring",
      exact: true,
    }),
  });
  await expect(card).toBeVisible();
  const dimensions = await card.boundingBox();
  expect(Math.round(dimensions!.height)).toBe(400);
  expect(Math.round(dimensions!.width)).toBe(
    info.project.name === "mobile" ? 165 : 260,
  );
  await expect(card.locator(".tj-pc-attributes")).toHaveCount(0);
  await expect(card).not.toContainText("Not specified");
  const actions = card.locator(".tj-pc-actions");
  expect(
    await actions.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
    ),
  ).toBe(2);
  expect(
    await card
      .locator(".tj-pc-collection")
      .evaluate((element) => getComputedStyle(element).textAlign),
  ).toBe("center");
  await expect(card.getByRole("button", { name: /Size 14/ })).toBeDisabled();
  await card
    .getByRole("button", {
      name: "Show image 2 of Sculpted Band Ring",
      exact: true,
    })
    .click();
  await expect(
    card.getByRole("button", {
      name: "Show image 2 of Sculpted Band Ring",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  const trigger = card.getByRole("button", {
    name: "Quick View Sculpted Band Ring",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Quick view: Sculpted Band Ring",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Choose options for Sculpted Band Ring",
      exact: true,
    }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Size or option")
    .selectOption({ label: "Size 14 / Out of stock" });
  await expect(dialog.locator(".tj-pc-price")).toContainText("3,350.00");
  await expect(dialog.locator(".tj-pc-sku")).toContainText("DEV-RING-14");
  await expect(
    dialog.getByRole("button", {
      name: "Add Sculpted Band Ring to bag",
      exact: true,
    }),
  ).toBeDisabled();
  await dialog.getByLabel("Size or option").selectOption({ label: "Size 16" });
  await expect(dialog.locator(".tj-pc-price")).toContainText("3,450.00");
  await expect(dialog.locator(".tj-pc-sku")).toContainText("DEV-RING-16");
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await mkdir("output/playwright/product-cards", { recursive: true });
  await page.screenshot({
    path: `output/playwright/product-cards/quick-view-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await card
    .getByRole("button", { name: "Add Sculpted Band Ring to bag", exact: true })
    .click();
  const bag = page.getByRole("dialog", { name: "Your bag.", exact: true });
  await expect(bag).toContainText("Size 16");
  await expect(bag.locator(".cart-summary strong")).toContainText("3,450.00");
  await page.keyboard.press("Escape");
  await card
    .getByRole("button", {
      name: "Save Sculpted Band Ring to wishlist",
      exact: true,
    })
    .click();
  await page.goto("/wishlist");
  await expect(page.locator(".tj-product-card")).toHaveCount(1);
  const savedDimensions = await page.locator(".tj-product-card").boundingBox();
  expect(savedDimensions!.width).toBeCloseTo(dimensions!.width, 0);
  expect(savedDimensions!.height).toBeCloseTo(dimensions!.height, 0);
  await expect(
    page.getByRole("button", {
      name: "Quick View Sculpted Band Ring",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `output/playwright/product-cards/wishlist-${info.project.name}.png`,
    fullPage: true,
  });
});
