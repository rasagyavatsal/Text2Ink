import { test, expect } from "./fixtures";

/**
 * Mobile Editor E2E Tests (issue #288)
 *
 * Covers: mobile bottom sheet visibility, sheet handle press (peek → default),
 * mobile sheet tab navigation (Text, Paper, Align, More), typing into the
 * editor at mobile viewport, mobile page preview visibility, mobile zoom in
 * and zoom out controls, mobile page navigation with multi-page text, and
 * ensuring top controls + bottom sheet do not coherently occlude the page.
 *
 * All tests use a mobile viewport (390×844, matching Pixel 5 / iPhone 12).
 * The mobile editor layout is triggered at max-width: 1279px, so this
 * viewport activates the MobileEditorBottomSheet component.
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const LONG_TEXT_FIXTURE =
  ("Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris " +
    "nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in " +
    "reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla " +
    "pariatur. Excepteur sint occaecat cupidatat non proident, sunt in " +
    "culpa qui officia deserunt mollit anim id est laborum.\n").repeat(20);

// ---------------------------------------------------------------------------
// Helper: open /editor at mobile viewport, wait for preview to be visible.
// ---------------------------------------------------------------------------
async function openMobileEditor(page: import("@playwright/test").Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/editor");
  // Preview scroll container is always rendered in mobile layout.
  const previewContainer = page.getByTestId("preview-scroll-container");
  await expect(previewContainer).toBeVisible({ timeout: 15_000 });
  return previewContainer;
}

// ---------------------------------------------------------------------------
// Helper: open the sheet by clicking the handle.
// ---------------------------------------------------------------------------
async function openSheet(page: import("@playwright/test").Page) {
  const openHandle = page.getByRole("button", { name: "Open editor controls" });
  await expect(openHandle).toBeVisible({ timeout: 10_000 });
  await openHandle.click();
  // Wait for the sheet to expand (label changes once anchor transitions).
  await expect(
    page.getByRole("button", { name: "Expand editor controls" })
  ).toBeVisible({ timeout: 5_000 });
}

// ---------------------------------------------------------------------------
// Helper: wait for multiple pages in mobile footer controls.
// ---------------------------------------------------------------------------
async function waitForMobileMultiplePages(page: import("@playwright/test").Page) {
  // In mobile layout the page counter is inside the sheet footer via
  // PageZoomControls which renders "Page X of Y".
  const pageCounter = page.locator("span").filter({ hasText: /Page \d+ of [2-9]\d*/ });
  await expect(pageCounter).toBeVisible({ timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// 1. Mobile bottom sheet is visible on load.
// ---------------------------------------------------------------------------

test("mobile bottom sheet is visible at mobile viewport", async ({ page }) => {
  await openMobileEditor(page);

  // The sheet handle button is the most reliable accessible element to assert.
  const sheetHandle = page.getByRole("button", { name: "Open editor controls" });
  await expect(sheetHandle).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// 2. Mobile page preview is visible at mobile viewport.
// ---------------------------------------------------------------------------

test("page preview is visible at mobile viewport", async ({ page }) => {
  const previewContainer = await openMobileEditor(page);
  await expect(previewContainer).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. Type into the editor at mobile viewport – text is retained.
// ---------------------------------------------------------------------------

test("typed text is retained in the editor at mobile viewport", async ({ page }) => {
  await openMobileEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Mobile typing test");
  await expect(textInput).toHaveValue("Mobile typing test");
});

// ---------------------------------------------------------------------------
// 4. Press the sheet handle to move from peek to default state.
// ---------------------------------------------------------------------------

test("pressing the sheet handle moves from peek to default state", async ({ page }) => {
  await openMobileEditor(page);

  // Initially the sheet is in 'peek' state → handle says "Open editor controls".
  const openHandle = page.getByRole("button", { name: "Open editor controls" });
  await expect(openHandle).toBeVisible({ timeout: 10_000 });
  await openHandle.click();

  // After one press the anchor moves to 'default' → label changes to
  // "Expand editor controls" (next press will expand to 'expanded').
  const expandHandle = page.getByRole("button", { name: "Expand editor controls" });
  await expect(expandHandle).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 5. Use mobile sheet tabs: Text, Paper, Align, More – each tab button is
//    visible and clickable in the sheet's sticky tab row.
//
//    The tab buttons are rendered inside the MobileEditorBottomSheet → Sheet
//    → Sheet.Content → SettingsPanel (isMobileLayout=true). They are plain
//    <button> elements with the label text as their only content.
//    We target them with getByRole("button", { name: ..., exact: true }).
// ---------------------------------------------------------------------------

test("mobile sheet Text tab button is visible and clickable", async ({ page }) => {
  await openMobileEditor(page);
  await openSheet(page);

  // Exact match avoids colliding with "Add Text Box" button.
  const textTab = page.getByRole("button", { name: "Text", exact: true }).first();
  await expect(textTab).toBeVisible({ timeout: 5_000 });
  // Clicking should not throw.
  await textTab.click();
  // The text section must be in the DOM.
  const textSection = page.locator('[data-section="text"]').first();
  await expect(textSection).toBeAttached({ timeout: 5_000 });
});

test("mobile sheet Paper tab button is visible and clickable", async ({ page }) => {
  await openMobileEditor(page);
  await openSheet(page);

  // Scope to the sticky tab bar to avoid colliding with paper-style cards.
  const tabBar = page.locator(
    "div.sticky.top-0.-mt-6"
  );
  await expect(tabBar).toBeVisible({ timeout: 5_000 });

  const paperTab = tabBar.getByRole("button", { name: "Paper", exact: true });
  await expect(paperTab).toBeVisible({ timeout: 5_000 });
  await paperTab.click();

  const paperSection = page.locator('[data-section="paper"]').first();
  await expect(paperSection).toBeAttached({ timeout: 5_000 });
});

test("mobile sheet Align tab button is visible and clickable", async ({ page }) => {
  await openMobileEditor(page);
  await openSheet(page);

  const tabBar = page.locator("div.sticky.top-0.-mt-6");
  await expect(tabBar).toBeVisible({ timeout: 5_000 });

  const alignTab = tabBar.getByRole("button", { name: "Align", exact: true });
  await expect(alignTab).toBeVisible({ timeout: 5_000 });
  await alignTab.click();

  const alignSection = page.locator('[data-section="align"]').first();
  await expect(alignSection).toBeAttached({ timeout: 5_000 });
});

test("mobile sheet More tab button is visible and clickable", async ({ page }) => {
  await openMobileEditor(page);
  await openSheet(page);

  const tabBar = page.locator("div.sticky.top-0.-mt-6");
  await expect(tabBar).toBeVisible({ timeout: 5_000 });

  const moreTab = tabBar.getByRole("button", { name: "More", exact: true });
  await expect(moreTab).toBeVisible({ timeout: 5_000 });
  await moreTab.click();

  const moreSection = page.locator('[data-section="more"]').first();
  await expect(moreSection).toBeAttached({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 6. Mobile zoom in control increases the zoom percentage.
//
//    On a 390×844 mobile viewport the initial preview scale is clamped to
//    the computed fit scale (~58%). The zoom in button increases the stored
//    scale, but the effective scale is clamped by computeMobilePreviewScale.
//    To observe an increase we first zoom out below the minimum observable
//    level, then zoom back in.
// ---------------------------------------------------------------------------

test("mobile zoom in increases the displayed zoom percentage", async ({ page }) => {
  await openMobileEditor(page);

  const zoomOutButton = page.getByRole("button", { name: "Zoom out" });
  const zoomInButton = page.getByRole("button", { name: "Zoom in" });
  await expect(zoomOutButton).toBeVisible({ timeout: 10_000 });
  await expect(zoomInButton).toBeVisible({ timeout: 10_000 });

  // Zoom out several times to make room for zoom in to have observable effect.
  for (let i = 0; i < 5; i++) {
    await zoomOutButton.click();
  }

  // Read the zoom after zooming out.
  const zoomDisplay = page.locator("span").filter({ hasText: /\d+%/ }).first();
  const afterZoomOutText = await zoomDisplay.textContent();
  const afterZoomOutPct = parseInt(afterZoomOutText?.replace("%", "") ?? "0", 10);

  // Now zoom in once – it should increase the percentage.
  await zoomInButton.click();

  const afterZoomInText = await zoomDisplay.textContent();
  const afterZoomInPct = parseInt(afterZoomInText?.replace("%", "") ?? "0", 10);

  expect(afterZoomInPct).toBeGreaterThan(afterZoomOutPct);
});

// ---------------------------------------------------------------------------
// 7. Mobile zoom out control decreases the zoom percentage.
// ---------------------------------------------------------------------------

test("mobile zoom out decreases the displayed zoom percentage", async ({ page }) => {
  await openMobileEditor(page);

  const zoomOutButton = page.getByRole("button", { name: "Zoom out" });
  await expect(zoomOutButton).toBeVisible({ timeout: 10_000 });

  const zoomDisplay = page.locator("span").filter({ hasText: /\d+%/ }).first();
  const initialText = await zoomDisplay.textContent();
  const initialPct = parseInt(initialText?.replace("%", "") ?? "100", 10);

  await zoomOutButton.click();

  const afterText = await zoomDisplay.textContent();
  const afterPct = parseInt(afterText?.replace("%", "") ?? "100", 10);
  expect(afterPct).toBeLessThan(initialPct);
});

// ---------------------------------------------------------------------------
// 8. Mobile page navigation with multi-page text.
//    These tests are wrapped in test.describe.serial because they use a Web
//    Worker for pagination that needs dedicated CPU time. Running them in
//    parallel with other tests can cause timeouts on lower-powered machines.
// ---------------------------------------------------------------------------

test.describe.serial("mobile page navigation with multi-page text", () => {
  test("next page button navigates to page 2", async ({ page }) => {
    test.setTimeout(60_000);
    await openMobileEditor(page);

    const textInput = page.getByLabel("Handwriting text input");
    await expect(textInput).toBeAttached({ timeout: 10_000 });
    await textInput.focus();
    await textInput.fill(LONG_TEXT_FIXTURE);

    await waitForMobileMultiplePages(page);

    const nextButton = page.getByRole("button", { name: "Next page" });
    await expect(nextButton).toBeEnabled({ timeout: 10_000 });
    await nextButton.click();

    // The page counter span should now read "Page 2 of N".
    const pageCounter = page.locator("span").filter({ hasText: /Page 2 of \d+/ });
    await expect(pageCounter).toBeVisible({ timeout: 10_000 });
  });

  test("previous page button navigates back to page 1", async ({ page }) => {
    test.setTimeout(60_000);
    await openMobileEditor(page);

    const textInput = page.getByLabel("Handwriting text input");
    await expect(textInput).toBeAttached({ timeout: 10_000 });
    await textInput.focus();
    await textInput.fill(LONG_TEXT_FIXTURE);

    await waitForMobileMultiplePages(page);

    const nextButton = page.getByRole("button", { name: "Next page" });
    await expect(nextButton).toBeEnabled({ timeout: 10_000 });
    await nextButton.click();

    const page2Counter = page.locator("span").filter({ hasText: /Page 2 of \d+/ });
    await expect(page2Counter).toBeVisible({ timeout: 10_000 });

    const prevButton = page.getByRole("button", { name: "Previous page" });
    await prevButton.click();

    const page1Counter = page.locator("span").filter({ hasText: /Page 1 of \d+/ });
    await expect(page1Counter).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 9. Top controls and bottom sheet do not coherently occlude the active page
//    preview: the preview-scroll-container must remain visible with non-zero
//    bounding rect even when both top controls and the bottom sheet are present.
// ---------------------------------------------------------------------------

test("top controls and bottom sheet do not cover the page preview incoherently", async ({
  page,
}) => {
  await openMobileEditor(page);

  // Verify the preview container has a visible, non-zero height bounding box.
  const previewContainer = page.getByTestId("preview-scroll-container");
  await expect(previewContainer).toBeVisible({ timeout: 10_000 });

  const box = await previewContainer.boundingBox();
  expect(box).not.toBeNull();
  // The preview area must have meaningful height (at least 100px) even with
  // the top controls bar and bottom sheet both rendered.
  expect(box!.height).toBeGreaterThan(100);
  expect(box!.width).toBeGreaterThan(100);
});
