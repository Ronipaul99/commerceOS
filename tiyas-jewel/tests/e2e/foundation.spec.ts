import { test, expect, type Page } from "@playwright/test";
const storageKey = "tiyas.shopping.v1";
async function ready(page: Page) {
  await expect(page.locator(".catalog-skeleton")).toHaveCount(0);
  await expect(page.locator(".results-count").first()).toContainText(
    /\d+ piece/,
  );
}
async function images(page: Page) {
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
    await page.evaluate(() =>
      [...document.images]
        .filter((image) => !image.naturalWidth)
        .map((image) => image.src),
    ),
  ).toEqual([]);
}
async function filters(page: Page, testInfo: { project: { name: string } }) {
  if (testInfo.project.name !== "desktop") {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    return page.getByRole("dialog", { name: "Refine your edit." });
  }
  return page.locator(".desktop-filters");
}
async function addSimple(page: Page) {
  await page.goto("/products/everyday-hoops");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Your bag." })).toBeVisible();
  await expect(page.getByRole("dialog").locator(".cart-line")).toHaveCount(1);
  await page.keyboard.press("Escape");
}

test("loads PostgreSQL products, sorts and applies URL filters with empty states", async ({
  page,
}, testInfo) => {
  await page.goto("/shop");
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(12);
  await page.getByLabel("Sort products").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await ready(page);
  await expect(page.locator(".product-card").first()).toContainText(
    "The Fine Ring",
  );
  const form = await filters(page, testInfo);
  await form
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("earrings");
  await form.locator('input[name="min"]').fill("1000");
  await form.locator('input[name="max"]').fill("2000");
  await form
    .getByRole("combobox", { name: "Availability", exact: true })
    .selectOption("in-stock");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=earrings/);
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(page.locator(".results-count")).toHaveText("2 pieces");
  await page.reload();
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.goto("/shop?minPricePaise=1&maxPricePaise=2");
  await expect(
    page.getByRole("heading", { name: "A different form, perhaps." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear the filters" }).click();
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(12);
});
test("paginates and scopes collection products with proper collection not-found", async ({
  page,
}) => {
  await page.goto("/shop");
  await ready(page);
  const first = await page.locator(".product-card h3").allTextContents();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  expect(first).not.toContain(
    await page.locator(".product-card h3").first().textContent(),
  );
  await page.goto("/collections/celebration");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Celebration Edit",
  );
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(3);
  const response = await page.goto("/collections/not-a-real-collection");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "could not be found",
  );
});
test("updates selected SKU, image, price and stock then persists the variant cart", async ({
  page,
}) => {
  await page.goto("/products/sculpted-band-ring");
  await expect(
    page.getByRole("button", { name: "Choose an option", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Size or option")
    .selectOption({ label: "Size 14 / Out of stock" });
  await expect(page.locator(".detail-price")).toContainText("3,350.00");
  await expect(page.locator(".product-information .sku")).toContainText(
    "DEV-RING-14",
  );
  await expect(
    page.getByRole("button", { name: "Out of stock", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Show product image 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Size or option").selectOption({ label: "Size 16" });
  await expect(page.locator(".detail-price")).toContainText("3,450.00");
  await page
    .getByRole("spinbutton", { name: "Quantity", exact: true })
    .fill("2");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const bag = page.getByRole("dialog", { name: "Your bag." });
  await expect(bag.locator(".cart-summary strong")).toContainText("6,900.00");
  await bag.getByRole("link", { name: "View your bag" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.locator(".bag-total dd")).toContainText("6,900.00");
  await page.reload();
  await expect(page.locator(".bag-total dd")).toContainText("6,900.00");
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    storageKey,
  );
  expect(Object.keys(stored.cart[0]).sort()).toEqual([
    "productId",
    "quantity",
    "slug",
    "variantId",
  ]);
  expect(stored.cart[0].quantity).toBe(2);
  await page
    .getByRole("button", { name: /Increase quantity for sculpted band ring/i })
    .click();
  await expect(page.locator(".bag-total dd")).toContainText("10,350.00");
  await page
    .getByRole("button", { name: "Remove Sculpted Band Ring from bag" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little room for something lovely." }),
  ).toBeVisible();
});
test("persists favourites and moves a selected product to the cart", async ({
  page,
}) => {
  await page.goto("/wishlist");
  await expect(
    page.getByRole("heading", { name: "A place for your favourites." }),
  ).toBeVisible();
  await page.goto("/products/everyday-hoops");
  await page
    .getByRole("button", { name: "Save to wishlist", exact: true })
    .click();
  await page.goto("/wishlist");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Move The Everyday Hoops to bag" })
    .click();
  await expect(page.getByRole("dialog", { name: "Your bag." })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "A place for your favourites." }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-line")).toHaveCount(1);
});
test("uses API search with suggestions, category matches, keyboard and no results", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page
    .getByRole("button", { name: "Open search" })
    .filter({ visible: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Find your form." });
  const input = dialog.getByRole("combobox");
  await input.fill("necklaces");
  await expect(
    dialog.getByRole("option", { name: /Necklaces collection/ }),
  ).toBeVisible();
  await input.fill("zzzz-not-a-piece");
  await expect(
    dialog.getByText("No pieces found.", { exact: false }),
  ).toBeVisible();
  await input.fill("pendant");
  await expect(dialog.getByRole("option").first()).toContainText("Pendant");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/products\//);
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Open search" })
    .filter({ visible: true })
    .click();
  const again = page.getByRole("dialog");
  await again.getByRole("combobox").fill("ring");
  await expect(again.getByRole("option").first()).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest("dialog")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open search" }).filter({ visible: true }),
  ).toBeFocused();
});
test("blocks sold-out products and returns real product 404s", async ({
  page,
  request,
}) => {
  await page.goto("/products/petal-drop-earrings");
  await expect(
    page.getByRole("button", { name: "Out of stock", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("button", { name: "Open bag, 0 items" })
      .filter({ visible: true }),
  ).toBeVisible();
  const response = await page.goto("/products/no-such-product");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "could not be found",
  );
  expect((await request.get("/api/v1/products/no-such-product")).status()).toBe(
    404,
  );
  expect(
    (
      await request.post("/api/v1/products", { data: { name: "No mutation" } })
    ).status(),
  ).toBe(404);
});
test("supports image navigation, mobile swipe and accessible zoom", async ({
  page,
}, testInfo) => {
  await page.goto("/products/sculpted-band-ring");
  await images(page);
  await page
    .getByRole("button", { name: "Next product image", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show product image 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Zoom current product image" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "A closer look." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Zoom current product image" }),
  ).toBeFocused();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Previous product image" }).click();
    await expect(
      page.getByRole("button", { name: "Show product image 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    const track = page.locator(".product-image-track");
    await track.scrollIntoViewIfNeeded();
    const box = (await track.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width - 30, y: box.y + box.height / 2 }],
    });
    for (let i = 1; i <= 6; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: box.x + box.width - 30 - ((box.width - 60) * i) / 6,
            y: box.y + box.height / 2,
          },
        ],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(
      page.getByRole("button", { name: "Show product image 2" }),
    ).toHaveAttribute("aria-pressed", "true");
    await session.detach();
  }
});
test("ignores forged local prices and preserves selections when the API is unavailable", async ({
  page,
}) => {
  await addSimple(page);
  await page.goto("/cart");
  await expect(page.locator(".bag-total dd")).toContainText("1,290.00");
  await page.evaluate((key) => {
    const value = JSON.parse(localStorage.getItem(key)!);
    value.cart[0].pricePaise = 1;
    value.cart[0].quantity = 2;
    localStorage.setItem(key, JSON.stringify(value));
  }, storageKey);
  await page.reload();
  await expect(page.locator(".bag-total dd")).toContainText("2,580.00");
  await page.route("**/api/v1/cart/resolve", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "UNAVAILABLE",
          message: "Unavailable",
          requestId: "test",
        },
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByText("We could not verify your bag.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).cart.length,
      storageKey,
    ),
  ).toBe(1);
  await page.unroute("**/api/v1/cart/resolve");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".bag-total dd")).toContainText("2,580.00");
});
test("handles removed and unavailable saved cart selections without totals from storage", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/v1/products/petal-drop-earrings");
  const { data } = await response.json();
  await page.goto("/");
  await page.evaluate(
    ({ key, product }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          cart: [
            {
              productId: product.id,
              slug: product.slug,
              variantId: null,
              quantity: 3,
            },
            {
              productId: "deleted-id",
              slug: "deleted-piece",
              variantId: null,
              quantity: 1,
            },
          ],
          wishlist: [],
        }),
      ),
    { key: storageKey, product: data },
  );
  await page.goto("/cart");
  await expect(page.locator(".cart-line")).toHaveCount(2);
  await expect(
    page
      .getByRole("complementary", { name: "Bag order summary" })
      .locator(".bag-total dd"),
  ).toContainText("0.00");
  await expect(page.getByText("This piece is no longer listed")).toBeVisible();
  await expect(
    page
      .locator(".cart-lines")
      .getByText("This selection is currently unavailable", { exact: false })
      .first(),
  ).toBeVisible();
});
test("renders the newly approved homepage and validates newsletter without a subscription", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Tyohar\s*Collection/,
  );
  for (const id of [
    "quick-collections",
    "tiyas-collections",
    "new-arrivals",
    "brace-kundan",
    "shop-by-occasion",
    "collection-showcases",
    "our-story",
    "newsletter",
  ])
    await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator("#new-arrivals .product-card")).toHaveCount(6);
  await images(page);
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 650) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(700); // Complete the intentionally short reveal transitions for visual capture.
  await page.screenshot({
    path: `output/playwright/homepage-approved-${testInfo.project.name}.png`,
    fullPage: true,
    scale: "css",
  });
  const email = page.getByRole("textbox", { name: "Your email address" });
  await email.fill("invalid");
  await page.getByRole("button", { name: "Preview newsletter signup" }).click();
  await expect(
    page.locator(".newsletter-form").getByRole("alert"),
  ).toBeVisible();
  await email.fill("jewel@example.com");
  await page.getByRole("button", { name: "Preview newsletter signup" }).click();
  await expect(
    page.getByText("your email has not been sent or saved", { exact: false }),
  ).toBeVisible();
});
test("captures shopping, product, wishlist and cart screens without overflow or broken images", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await addSimple(page);
  await page.goto("/products/everyday-hoops");
  await page
    .getByRole("button", { name: "Save to wishlist", exact: true })
    .click();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [name, path] of [
    ["shop", "/shop"],
    ["product", "/products/sculpted-band-ring"],
    ["wishlist", "/wishlist"],
    ["cart", "/cart"],
  ]) {
    await page.goto(path!);
    if (name === "shop") await ready(page);
    if (name === "wishlist")
      await expect(page.locator(".product-card")).toHaveCount(1);
    if (name === "cart")
      await expect(page.locator(".cart-line")).toHaveCount(1);
    await images(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(testInfo.project.use.viewport!.width);
    await page.screenshot({
      path: `output/playwright/stage03-${name}-${testInfo.project.name}.png`,
      fullPage: true,
      scale: "css",
    });
  }
  expect(errors).toEqual([]);
});
test("checks all seven responsive widths and reduced motion", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 600, 834, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/shop");
    await ready(page);
    await images(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `Overflow at ${width}`,
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `output/playwright/stage03-shop-width-${width}.png`,
      fullPage: true,
      scale: "css",
    });
  }
});
test("shows a recoverable catalogue error without inventing purchasable products", async ({
  page,
}) => {
  await page.route("**/api/v1/products?*", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "UNAVAILABLE",
          message: "Unavailable",
          requestId: "test",
        },
      },
    }),
  );
  await page.goto("/shop");
  await expect(
    page.getByRole("heading", { name: "A moment, please." }),
  ).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
  await page.unroute("**/api/v1/products?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await ready(page);
  await expect(page.locator(".product-card")).toHaveCount(12);
});
