import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
test.skip(
  process.env.EXPERIENCE_E2E !== "true",
  "Uses an explicitly isolated API, test email transport and database.",
);
const fixturePath = "output/verification/customer-experience-browser.json";
function fixtures() {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as {
    email: string;
    password: string;
    slug: string;
    productId: string;
    assetId: string;
  };
}
let savedAuth: {
  cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
  csrf: string;
} | null = null;
async function login(context: BrowserContext) {
  if (savedAuth) {
    await context.addCookies(savedAuth.cookies);
    return savedAuth.csrf;
  }
  const f = fixtures();
  if (!f.email.endsWith("@example.test"))
    throw Error("Only isolated test credentials are permitted");
  const response = await context.request.post("/api/v1/admin/login", {
    data: { email: f.email, password: f.password },
  });
  expect(response.status()).toBe(200);
  const csrf = (await response.json()).data.csrfToken as string;
  savedAuth = { cookies: await context.cookies(), csrf };
  return csrf;
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
async function capture(page: Page, name: string) {
  mkdirSync("output/playwright", { recursive: true });
  const path = `output/playwright/experience-${name}-${page.viewportSize()!.width}.png`;
  if (name === "reel-details") {
    await page.screenshot({ path });
    return;
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  const session = await page.context().newCDPSession(page);
  try {
    const result = await session.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: page.viewportSize()!.width,
        height: Math.ceil(
          await page
            .locator("body")
            .evaluate((e) => e.getBoundingClientRect().height),
        ),
        scale: 1,
      },
    });
    writeFileSync(path, Buffer.from(result.data, "base64"));
  } finally {
    await session.detach();
  }
}
test("happy customers, email-verified guest feedback and moderation privacy", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/happy-customers");
  await expect(
    page.getByRole("heading", { name: "Our Happy Customers", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".experience-review").first()).toBeVisible();
  await noOverflow(page);
  await capture(page, "happy-customers");
  const email = `qa-review-${randomUUID()}@example.test`;
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(page.getByLabel("Email verification code")).toBeFocused();
  const { code } = JSON.parse(
    readFileSync("output/verification/customer-experience-code.json", "utf8"),
  );
  await page.getByLabel("Email verification code").fill(code);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByLabel("Public display name")).toBeFocused();
  await page.getByLabel("Public display name").fill("QA New Customer");
  await page.getByRole("radio", { name: "4", exact: true }).check();
  await page
    .getByLabel("Review title (optional)")
    .fill("QA browser submission");
  await page
    .getByLabel("Your experience", { exact: true })
    .fill(
      "An isolated browser verification submission for the feedback workflow.",
    );
  await page.getByRole("checkbox", { name: /I agree to publish/ }).check();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "submitted for moderation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "QA browser submission" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("owner coupon creation and administration screens", async ({
  page,
  context,
}) => {
  await login(context);
  await page.goto("/admin/coupons");
  await expect(
    page.getByRole("heading", { name: "Coupons", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create coupon", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Create coupon", exact: true }),
  ).toBeVisible();
  const code = `QA_${randomUUID().slice(0, 8).toUpperCase()}`;
  await page.getByLabel("Coupon code", { exact: true }).fill(code);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Isolated browser test offer");
  await page.getByLabel("Discount value (₹ or %)", { exact: true }).fill("100");
  await page
    .getByLabel("Starts (IST)", { exact: true })
    .fill("2026-01-01T00:00");
  await page.getByLabel("Ends (IST)", { exact: true }).fill("2027-12-31T23:59");
  await page.getByRole("checkbox", { name: "Enabled", exact: true }).check();
  await noOverflow(page);
  await capture(page, "coupon-form");
  await page.getByRole("button", { name: "Save coupon", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: code })).toBeVisible();
  await page.goto("/admin/reviews");
  await expect(
    page.getByRole("heading", { name: "Customer Reviews", exact: true }),
  ).toBeVisible();
  await capture(page, "admin-reviews");
  await noOverflow(page);
  await page.goto("/admin/content?tab=reels");
  await expect(
    page.getByRole("heading", { name: "Shop Our Reels", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create a reel", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await capture(page, "reels-editor");
});
test("guest checkout validates core fields and applies backend coupon totals", async ({
  page,
  context,
}) => {
  const f = fixtures(),
    csrf = await login(context),
    code = `QA_${randomUUID().slice(0, 8).toUpperCase()}`;
  const created = await context.request.post("/api/v1/admin/coupons", {
    headers: { "x-csrf-token": csrf },
    data: {
      code,
      type: "FIXED",
      value: 10000,
      active: true,
      startsAt: "2026-01-01T00:00:00Z",
      endsAt: "2027-12-31T23:59:00Z",
    },
  });
  expect(created.status()).toBe(200);
  await context.clearCookies();
  await page.goto(`/products/${f.slug}`);
  await page.getByRole("link", { name: "Reviews & ratings" }).click();
  await expect(page).toHaveURL(/#customer-reviews$/);
  await expect(
    page.getByRole("heading", { name: "QA Silver Statement Set", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Customer reviews & ratings", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await capture(page, "product-reviews");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await page.goto("/checkout");
  await expect(page.getByLabel("Coupon code", { exact: true })).toBeVisible();
  await page.locator('[name="pinCode"]').fill("700001");
  await expect(
    page.getByRole("button", { name: "Continue to payment", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Continue to payment", exact: true })
    .click();
  await expect(
    page.getByText("Please check the highlighted details.", { exact: true }),
  ).toBeVisible();
  await page.locator('[name="fullName"]').fill("QA Guest");
  await page
    .locator('[name="email"]')
    .fill(`qa-checkout-${randomUUID()}@example.test`);
  await page.locator('[name="mobile"]').fill("+91 98765 43210");
  await page.locator('[name="line1"]').fill("12 Lake Road, QA fixture");
  await page.locator('[name="city"]').fill("Kolkata");
  await page.locator('[name="state"]').selectOption("West Bengal");
  await page.getByLabel("Coupon code", { exact: true }).fill("INVALID_QA_CODE");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.getByText("Coupon could not be applied", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByLabel("Coupon code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.getByText(`Applied: ${code}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Cash on delivery/i }).check();
  await expect(
    page.getByRole("button", {
      name: "Place cash on delivery order",
      exact: true,
    }),
  ).toBeEnabled();
  await noOverflow(page);
  await capture(page, "checkout-coupon");
  await page
    .getByRole("button", { name: "Place cash on delivery order", exact: true })
    .click();
  await expect(page).toHaveURL(/order-confirmation#/);
  await expect(
    page.getByRole("heading", { name: "Order Confirmed!", exact: true }),
  ).toBeVisible();
  const token = new URL(page.url()).hash.slice(1);
  const saved = await context.request.post("/api/v1/orders/confirmation", {
    data: { token },
  });
  expect(saved.status()).toBe(200);
  expect((await saved.json()).data).toMatchObject({
    accepted: true,
    paymentStatus: "COD_PENDING",
    discountPaise: 10000,
    couponCode: code,
    totalPaise: 239000,
  });
});

test("homepage shops by matching occasion, collection, and jewellery type", async ({
  page,
  request,
}) => {
  const { slug } = fixtures();
  const product = (await (await request.get(`/api/v1/products/${slug}`)).json()).data;
  await page.goto("/");
  await page.getByRole("link", { name: /Bridal Collection/ }).click();
  await expect(page).toHaveURL(/\/shop\?tag=bridal$/);
  await expect(page.locator(".results-count")).toHaveText("1 piece");
  await expect(page.locator(".product-card h3").getByRole("link", { name: product.name })).toBeVisible();

  await page.goto("/");
  await page.locator(".tj-quick-collections").getByRole("link", { name: /Premium Kundan/ }).click();
  await expect(page).toHaveURL(/\/collections\/premium-kundan\?match=catalog$/);
  await expect(page.locator(".product-card h3").getByRole("link", { name: product.name })).toBeVisible();

  await page.goto("/");
  await page.getByRole("navigation", { name: "Jewellery types" })
    .getByRole("link", { name: product.category.name, exact: true }).click();
  await expect(page).toHaveURL(`/shop/${product.category.slug}`);
  await expect(page.locator(".product-card h3").getByRole("link", { name: product.name })).toBeVisible();
  await noOverflow(page);
});

test("CMS Instagram Reel link and shoppable product tags", async ({
  page,
  context,
}) => {
  await login(context);
  const f = fixtures(),
    title = `QA styling reel ${randomUUID().slice(0, 5)}`,
    instagramUrl = "https://www.instagram.com/reel/TiyasQAFixture/";
  const instagramRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("instagram.com"))
      instagramRequests.push(request.url());
  });
  await page.goto("/admin/content?tab=reels");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page
    .getByLabel("Caption", { exact: true })
    .fill("An isolated shoppable jewellery look.");
  await page
    .getByLabel("Transcript / visual description", { exact: true })
    .fill(
      "A silent still-life shows silver-tone earrings against a warm ivory background. This is an isolated test fixture.",
    );
  await page
    .getByLabel("Portrait poster")
    .setInputFiles("apps/web/public/images/campaign/silver.webp");
  await expect(page.getByText(/^Uploaded /).first()).toBeVisible();
  await page
    .getByLabel("Instagram Reel link")
    .fill(instagramUrl + "?igsh=fixture");
  await page.getByLabel("Tagged products").selectOption(f.productId);
  await page
    .getByRole("checkbox", { name: /I have permission to feature this reel/ })
    .check();
  await page.getByRole("checkbox", { name: "Published", exact: true }).check();
  await page.getByRole("button", { name: "Save reel", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: title })).toBeVisible();
  await context.clearCookies();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Shop Our Reels", exact: true }),
  ).toBeVisible();
  const open = page
    .getByRole("button", { name: `Shop the reel: ${title}`, exact: true })
    .first();
  await open.scrollIntoViewIfNeeded();
  await noOverflow(page);
  await capture(page, "home-reels");
  await open.click();
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  await expect(
    dialog.getByRole("link", { name: /Watch on Instagram/ }),
  ).toHaveAttribute("href", instagramUrl);
  await expect(
    dialog.getByRole("link", { name: /Watch on Instagram/ }),
  ).toHaveAttribute("target", "_blank");
  await expect(dialog.locator("video, iframe")).toHaveCount(0);
  await expect(
    dialog.getByText("QA Silver Statement Set", { exact: true }).first(),
  ).toBeVisible();
  await capture(page, "reel-details");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(instagramRequests).toEqual([]);
});
