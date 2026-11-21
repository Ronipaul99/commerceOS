import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const pages = [
  ["all", "/collections", "Tiyas Collections"],
  ["premium-kundan", "/collections/premium-kundan", "Premium Kundan"],
  ["american-diamond", "/collections/american-diamond", "American Diamond"],
  ["cz", "/collections/cz", "CZ"],
  ["1-gram-gold", "/collections/1-gram-gold", "1 Gram Gold"],
  ["temple-jewellery", "/collections/temple-jewellery", "Temple Jewellery"],
  ["brace-kundan", "/collections/brace-kundan", "Brace Kundan"],
  ["silver-replica", "/collections/silver-replica", "Silver Replica"],
  ["pearl-jewellery", "/collections/pearl-jewellery", "Pearl Jewellery"],
] as const;
async function ready(page: Page) {
  await expect(page.locator(".catalog-skeleton")).toHaveCount(0);
  await expect(page.locator(".results-count")).toContainText(/\d+ pieces?/);
}
async function capture(page: Page, name: string) {
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
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(
    await page.evaluate(() =>
      [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
    ),
  ).toEqual([]);
  await mkdir("output/playwright/collections", { recursive: true });
  await page.screenshot({
    path: `output/playwright/collections/${name}.png`,
    fullPage: true,
    scale: "css",
  });
}
test("all nine approved collection designs use their own art and real catalog cards", async ({
  page,
  request,
}, info) => {
  test.skip(info.project.name.startsWith("admin"));
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [slug, url, title] of pages) {
    await page.goto(url);
    await ready(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".cl-hero img")).toHaveAttribute(
      "src",
      new RegExp(`${slug}-hero`),
    );
    await expect(
      page.locator(".tj-collection-nav,.tj-announcement"),
    ).toHaveCount(0);
    await expect(page.locator(".product-card-listing")).toHaveCount(12);
    await expect(
      page.getByText(/Certified Quality|100% Secure|Reviews\)/),
    ).toHaveCount(0);
    if (slug !== "all")
      await expect(page.locator(".tj-preview-note")).toContainText(
        "More from Tiyas",
      );
    else
      await expect(
        page
          .getByRole("navigation", { name: "Explore collections" })
          .getByRole("link"),
      ).toHaveCount(8);
    const catalog = await (
      await request.get("/api/v1/products?limit=12")
    ).json();
    for (const p of catalog.data)
      await expect(
        page
          .locator(".product-card h3")
          .getByRole("link", { name: p.name, exact: true }),
      ).toHaveCount(1);
    await capture(page, `${slug}-${info.project.name}`);
  }
  expect(errors).toEqual([]);
});
test("collection filters, view switcher, favourites and bag retain shopping behavior", async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith("admin"));
  await page.goto("/collections/american-diamond");
  await ready(page);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".cl-product-grid")).toHaveClass(/cl-list-view/);
  await expect(
    page.getByRole("button", { name: "List view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Grid view", exact: true }).click();
  await expect(page.locator(".cl-product-grid")).not.toHaveClass(
    /cl-list-view/,
  );
  const mobile = info.project.name !== "desktop";
  if (mobile)
    await page.getByRole("button", { name: "Filter", exact: true }).click();
  const form = mobile
    ? page.getByRole("dialog", { name: "Refine your edit." })
    : page.locator(".desktop-filters");
  await form
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("earrings");
  await form.locator('input[name="min"]').fill("1000");
  await form.locator('input[name="max"]').fill("2000");
  await form
    .getByRole("combobox", { name: "Availability", exact: true })
    .selectOption("in-stock");
  await form
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/category=earrings/);
  await ready(page);
  await expect(page.locator(".results-count")).toHaveText("2 pieces");
  await page
    .getByRole("button", { name: "Remove Earrings filter", exact: true })
    .click();
  await expect(page).not.toHaveURL(/category=/);
  await ready(page);
  await page.goto(
    "/shop?category=earrings&minPricePaise=100000&maxPricePaise=200000&availability=in-stock",
  );
  await ready(page);
  const card = page
    .locator(".product-card")
    .filter({
      has: page.getByRole("heading", { name: "Everyday Hoops", exact: false }),
    })
    .first();
  await card.getByRole("button", { name: /Save .* to wishlist/ }).click();
  await expect(
    card.getByRole("button", { name: /Remove .* from wishlist/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: /Add .* to bag/ }).click();
  await expect(page.getByRole("dialog", { name: "Your bag." })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open bag, 1 items" }),
  ).toBeVisible();
});
test("collection layout adapts from 320px to wide desktop without image or control overflow", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 600, 834, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/collections/pearl-jewellery");
    await ready(page);
    await capture(page, `pearl-width-${width}`);
    const cols = await page
      .locator(".cl-product-grid")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      );
    const gridWidth = await page
      .locator(".cl-product-grid")
      .evaluate((el) => el.clientWidth);
    expect(cols).toBe(
      width < 768 ? 2 : Math.max(1, Math.floor((gridWidth + 12) / 272)),
    );
  }
});
