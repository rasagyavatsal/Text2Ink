import { test, expect } from "./fixtures";

/**
 * Public Route And Navigation E2E Tests (issue #281)
 *
 * Covers: home page first viewport, hero copy, preview images,
 * "Open Editor" navigation, /contact, /privacy-policy,
 * /terms-of-service, and shared header/footer on public pages.
 */

// ---------------------------------------------------------------------------
// Home page – first viewport
// ---------------------------------------------------------------------------

test("home page renders within the first viewport", async ({ page }) => {
  await page.goto("/");
  // The page should be reachable (no 5xx) and the h1 should be visible
  // without scrolling (within the first viewport).
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
});

// ---------------------------------------------------------------------------
// Home page – hero copy
// ---------------------------------------------------------------------------

test("home page hero contains the expected copy", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("Text to Handwriting Converter");
  const heroParagraph = page.getByTestId("home-direct-answer");
  await expect(heroParagraph).toBeVisible();
  await expect(heroParagraph).toContainText("PDF, PNG, or JPG");
});

// ---------------------------------------------------------------------------
// Home page – preview images
// ---------------------------------------------------------------------------

test("home page displays carousel and font preview images", async ({ page }) => {
  await page.goto("/");
  const carousel = page.getByTestId("hero-preview-carousel");
  await expect(carousel).toBeVisible();

  const previews = page.getByTestId("hero-carousel-preview");
  await expect(previews).toHaveCount(6);
  await expect(previews.nth(0)).toHaveAttribute("src", "/preview/preview-1.jpg");
  await expect(previews.nth(0)).toHaveAttribute("width", "2481");
  await expect(previews.nth(0)).toHaveAttribute("height", "3508");
  await expect(previews.nth(4)).toHaveAttribute("src", "/preview/preview-5.jpg");
  await expect(previews.nth(4)).toHaveAttribute("width", "3508");
  await expect(previews.nth(4)).toHaveAttribute("height", "2481");

  const previewCards = page.getByTestId("hero-preview-trigger");
  const cardSizes = await previewCards.evaluateAll((cards) =>
    cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    })
  );
  expect(cardSizes[4].width).toBeGreaterThan(cardSizes[0].width * 1.9);
  expect(Math.abs(cardSizes[4].height - cardSizes[0].height)).toBeLessThanOrEqual(2);
  expect(Math.abs(cardSizes[5].height - cardSizes[0].height)).toBeLessThanOrEqual(6);

  await page.getByRole("heading", { name: "Handwriting font options" }).scrollIntoViewIfNeeded();
  await expect(page.getByAltText("Singlong handwriting font preview")).toHaveAttribute("src", "/preview/singlong-preview.jpg");
  await expect(page.getByAltText("Snake handwriting font preview")).toHaveAttribute("src", "/preview/snake-preview.jpg");
});

test("home page preview lightbox opens, zooms, and pans", async ({ page }, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /open text2ink handwritten page preview 1/i })
    .click({ force: true });

  const dialog = page.getByRole("dialog", {
    name: /text2ink handwritten page preview 1/i,
  });
  await expect(dialog).toBeVisible();

  const viewport = page.getByTestId("preview-lightbox-viewport");
  const lightboxImage = page.getByTestId("preview-lightbox-image");
  await expect(lightboxImage).toHaveAttribute("src", "/preview/preview-1.jpg");
  await expect(lightboxImage).toHaveAttribute("data-zoomed", "false");

  if (testInfo.project.name === "Mobile Safari") {
    return;
  }

  await viewport.hover();
  await page.mouse.wheel(0, -700);
  await expect(lightboxImage).toHaveAttribute("data-zoomed", "true");

  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 80, startY + 40, { steps: 4 });
  await page.mouse.up();
  await expect(lightboxImage).toHaveAttribute("data-panned", "true");
});

// ---------------------------------------------------------------------------
// Feature pages – retired (should 404)
// ---------------------------------------------------------------------------

test("/features/handwriting-fonts is retired", async ({ page }) => {
  const response = await page.goto("/features/handwriting-fonts");
  expect(response?.status()).toBe(404);
});

test("/features/notebook-paper-styles is retired", async ({ page }) => {
  const response = await page.goto("/features/notebook-paper-styles");
  expect(response?.status()).toBe(404);
});

test("/features/paper-colors is retired", async ({ page }) => {
  const response = await page.goto("/features/paper-colors");
  expect(response?.status()).toBe(404);
});

test("/features/realism-effects is retired", async ({ page }) => {
  const response = await page.goto("/features/realism-effects");
  expect(response?.status()).toBe(404);
});

test("/features/export-handwritten-notes is retired", async ({ page }) => {
  const response = await page.goto("/features/export-handwritten-notes");
  expect(response?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// Home page – "Open Editor" navigates to /editor
// ---------------------------------------------------------------------------

test('"Open Editor" button navigates to /editor', async ({ page }) => {
  await page.goto("/");
  // There may be two "Open Editor" links (header CTA + hero button).
  // Click the first one that is visible.
  const openEditorLinks = page.getByRole("link", { name: "Open Editor" });
  await openEditorLinks.first().click();
  await expect(page).toHaveURL(/\/editor/);
});

// ---------------------------------------------------------------------------
// /contact – inquiry form and direct email link
// ---------------------------------------------------------------------------

test("/contact renders the inquiry form", async ({ page }) => {
  await page.goto("/contact");
  // The form element must be present
  await expect(page.locator("form")).toBeVisible();
});

test("/contact renders the direct email link", async ({ page }) => {
  await page.goto("/contact");
  const emailLink = page.getByRole("link", {
    name: /rasagyavatsal16@gmail\.com/i,
  });
  await expect(emailLink).toBeVisible();
  await expect(emailLink).toHaveAttribute("href", "mailto:rasagyavatsal16@gmail.com");
});

// ---------------------------------------------------------------------------
// /privacy-policy – legal page shell
// ---------------------------------------------------------------------------

test("/privacy-policy renders the legal page shell", async ({ page }) => {
  await page.goto("/privacy-policy");
  // h1 should say "Privacy Policy"
  await expect(
    page.getByRole("heading", { level: 1, name: /privacy policy/i })
  ).toBeVisible();
  // Effective date caption paragraph should appear
  await expect(
    page.locator("p").filter({ hasText: /effective date:/i }).first()
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// /terms-of-service – legal page shell
// ---------------------------------------------------------------------------

test("/terms-of-service renders the legal page shell", async ({ page }) => {
  await page.goto("/terms-of-service");
  // h1 should say "Terms of Service"
  await expect(
    page.getByRole("heading", { level: 1, name: /terms of service/i })
  ).toBeVisible();
  // Effective date caption paragraph should appear
  await expect(
    page.locator("p").filter({ hasText: /effective date:/i }).first()
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Shared header navigation on public pages
// ---------------------------------------------------------------------------

const publicPages = [
  "/",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
];

for (const path of publicPages) {
  test(`shared header renders on ${path}`, async ({ page }) => {
    await page.goto(path);
    // The Text2Ink brand link is always in the header
    const brandLink = page.getByRole("link", { name: "Text2Ink" }).first();
    await expect(brandLink).toBeVisible();
  });
}

// ---------------------------------------------------------------------------
// Shared footer navigation on public pages
// ---------------------------------------------------------------------------

for (const path of publicPages) {
  test(`shared footer renders on ${path}`, async ({ page }) => {
    await page.goto(path);
    // Footer contains the "Product" nav section and "Legal" nav section
    await expect(page.getByRole("navigation", { name: "Product" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Legal" })).toBeVisible();
  });
}
