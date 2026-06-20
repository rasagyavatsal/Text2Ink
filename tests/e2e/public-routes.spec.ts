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
  // The h1 includes the phrase "realistic handwriting"
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("realistic handwriting");
  // The hero paragraph mentions handwritten pages
  const heroParagraph = page.getByText(
    /create realistic handwritten pages from typed text/i
  );
  await expect(heroParagraph).toBeVisible();
});

// ---------------------------------------------------------------------------
// Home page – preview images
// ---------------------------------------------------------------------------

test("home page displays preview images", async ({ page }) => {
  await page.goto("/");
  const preview1 = page.getByAltText("Handwriting preview 1");
  const preview2 = page.getByAltText("Handwriting preview 2");
  await expect(preview1).toBeVisible();
  await expect(preview2).toBeVisible();
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

const publicPages = ["/", "/contact", "/privacy-policy", "/terms-of-service"];

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
