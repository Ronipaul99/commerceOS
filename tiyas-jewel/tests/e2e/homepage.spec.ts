import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const collections = [
  "Premium Kundan",
  "American Diamond",
  "CZ",
  "1 Gram Gold",
  "Temple Jewellery",
  "Brace Kundan",
  "Silver Replica",
  "Pearl Jewellery",
];
test("campaign controls, eight collection links and accessible mobile navigation work", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Tyohar\s*Collection/,
  );
  await page
    .getByRole("button", { name: "Next campaign", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /A little\s*brilliance/,
  );
  await page
    .getByRole("button", { name: "Next campaign", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Rooted in\s*tradition/,
  );
  await page
    .getByRole("button", { name: "Show The festive edit", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Tyohar/);
  const navigation = page.locator("#quick-collections");
  for (const name of collections)
    await expect(
      navigation.getByRole("link", { name: new RegExp(name) }),
    ).toHaveCount(1);
  await navigation.getByRole("link", { name: /Premium Kundan/ }).click();
  await expect(page).toHaveURL(/collections\/premium-kundan$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Premium Kundan",
  );
  await expect(page.locator(".tj-preview-note")).toContainText(
    "More from Tiyas",
  );
  await expect(page.locator(".product-card")).toHaveCount(12);
  if (info.project.name !== "desktop") {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Explore Tiyas" });
    for (const name of collections)
      await expect(
        dialog.getByRole("link", { name: new RegExp(`^${name}`) }),
      ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open menu", exact: true }),
    ).toBeFocused();
  }
  if (info.project.name === "desktop") {
    await page
      .getByRole("searchbox", { name: "Search jewellery", exact: true })
      .fill("hoops");
    await page
      .getByRole("searchbox", { name: "Search jewellery", exact: true })
      .press("Enter");
  } else
    await page
      .getByRole("button", { name: "Open search", exact: true })
      .click();
  await expect(
    page.getByRole("dialog", { name: "Find your form." }),
  ).toBeVisible();
  if (info.project.name === "desktop")
    await expect(
      page
        .getByRole("dialog", { name: "Find your form." })
        .getByRole("combobox"),
    ).toHaveValue("hoops");
  await page.keyboard.press("Escape");
});
test("requested logo, occasion composition and Silver Replica promotion render", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator(".tj-announcement")).toHaveCount(0);
  const headerLogo = page.locator("header .tj-brand-logo:visible");
  await expect(headerLogo).toHaveAttribute(
    "src",
    /tiyas-jewels-logo-web-optimized/,
  );
  await expect(page.locator("footer .tj-brand-logo")).toHaveAttribute(
    "alt",
    /Tiyas Jewels/,
  );
  await expect(page.locator(".tj-collection-nav")).toHaveCount(0);
  await expect(
    page.locator(
      '#quick-collections a[href="/collections/pearl-jewellery"] img',
    ),
  ).toHaveAttribute("src", /campaign%2Fpearl|campaign\/pearl/);
  const occasions = page.locator("#shop-by-occasion");
  await expect(occasions.locator(".tj-occasion-card")).toHaveCount(8);
  await occasions.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mkdir("output/playwright", { recursive: true });
  await occasions.screenshot({
    path: `output/playwright/homepage-occasions-${info.project.name}.png`,
  });
  const promotion = page.locator("#collection-promotion");
  await promotion.scrollIntoViewIfNeeded();
  await expect(promotion.getByRole("heading")).toHaveText(
    /Silver Replica\s*Collection/,
  );
  await expect(promotion.getByRole("link")).toHaveAttribute(
    "href",
    "/collections/silver-replica",
  );
  await expect(promotion).not.toContainText("1,990");
  await expect(promotion.locator("img")).toHaveAttribute(
    "src",
    /silver-promotion/,
  );
  await promotion.screenshot({
    path: `output/playwright/homepage-promotion-${info.project.name}.png`,
  });
  await promotion.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Silver Replica",
  );
});
test("server-rendered New Arrivals use backend products and retain bag/wishlist persistence", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/v1/products?sort=newest&limit=6");
  expect(response.ok()).toBe(true);
  const { data } = await response.json();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const arrivals = page.locator("#new-arrivals");
  await expect(arrivals.locator(".product-card")).toHaveCount(6);
  for (const product of data)
    await expect(
      arrivals.getByRole("heading", { name: product.name, exact: true }),
    ).toBeVisible();
  const html = await (await request.get("/")).text();
  expect(html).toContain(data[0].name);
  const product = data.find(
    (p: { available: boolean; variants: unknown[] }) =>
      p.available && !p.variants.length,
  );
  expect(product).toBeDefined();
  const card = arrivals.locator(".product-card").filter({
    has: page.getByRole("heading", { name: product.name, exact: true }),
  });
  await card
    .getByRole("button", {
      name: `Save ${product.name} to wishlist`,
      exact: true,
    })
    .click();
  await expect(
    card.getByRole("button", {
      name: `Remove ${product.name} from wishlist`,
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await card
    .getByRole("button", { name: `Add ${product.name} to bag`, exact: true })
    .click();
  const bag = page.getByRole("dialog", { name: "Your bag." });
  await expect(bag).toContainText(product.name);
  await expect(
    bag.getByRole("link", { name: "Proceed to checkout" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open bag, 1 items" }),
  ).toBeVisible();
  await page.goto("/wishlist");
  await expect(
    page.getByRole("heading", { name: product.name, exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("shows honest fallback groups, omits unapproved claims and swipes products", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator(".tj-showcase")).toHaveCount(4);
  await expect(page.locator(".tj-showcase .product-card")).toHaveCount(12);
  await expect(page.locator(".tj-showcase-products > h3").first()).toHaveText(
    "More from Tiyas",
  );
  await expect(page.locator(".tj-reviews,.tj-offers")).toHaveCount(0);
  await expect(
    page.getByText("Certified Quality", { exact: true }),
  ).toHaveCount(0);
  if (info.project.name === "mobile") {
    const track = page.locator("#new-arrivals .tj-product-rail");
    await track.scrollIntoViewIfNeeded();
    const box = await track.boundingBox();
    expect(box).not.toBeNull();
    const session = await page.context().newCDPSession(page);
    const x = box!.x + box!.width * 0.85,
      y = box!.y + 50;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 8; step++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - step * 24, y }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => track.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(30);
    await session.detach();
  }
});
test("validates all eight approved widths without overflow or broken images", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(120000);
  await mkdir("output/playwright", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator(".tj-showcase")).toHaveCount(4);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((image) => {
          image.loading = "eager";
          return image.decode().catch(() => undefined);
        }),
      );
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `Overflow at ${width}`,
    ).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() =>
        [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
      ),
      `Broken image at ${width}`,
    ).toEqual([]);
    const occasionGeometry = await page
      .locator(".tj-occasion-card")
      .evaluateAll((cards) =>
        cards.map((card) => {
          const box = card.getBoundingClientRect();
          const image = card
            .querySelector(".tj-occasion-image")!
            .getBoundingClientRect();
          const label = card.querySelector("h3")!.getBoundingClientRect();
          return {
            landscape: box.width > box.height,
            sideBySide: label.x >= image.right - 2,
          };
        }),
      );
    expect(
      occasionGeometry.every((card) => card.landscape && card.sideBySide),
      `Occasion composition at ${width}`,
    ).toBe(true);
    await expect(page.locator(".tj-hero-copy h1")).toBeVisible();
    await page.screenshot({
      path: `output/playwright/homepage-width-${width}.png`,
      fullPage: true,
      scale: "css",
    });
  }
});

test("homepage navigation destinations respond successfully and metadata is retained", async ({
  page,
  request,
}, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(120000);
  await page.goto("/");
  await expect(page).toHaveTitle(/TIYAS JEWEL/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /jewellery/i,
  );
  const links = await page
    .locator("a[href]")
    .evaluateAll((elements) =>
      [...new Set(elements.map((el) => el.getAttribute("href")!))].filter(
        (href) => href.startsWith("/") && href !== "/" && !href.includes("#"),
      ),
    );
  for (const href of links) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});
