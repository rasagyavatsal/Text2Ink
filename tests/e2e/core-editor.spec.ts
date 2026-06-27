import { gotoHydratedEditor, test, expect } from "./fixtures";

/**
 * Core Editor Writing And Canvas E2E Tests (issue #282)
 *
 * Covers: /editor initial load, page preview visibility, typing into the
 * hidden "Handwriting text input", text retention, canvas visibility after
 * typing, pagination page count update, zoom controls, and
 * pagination controls disabled state for single-page content.
 */

test.skip(
  ({ isMobile }) => isMobile,
  "Desktop editor coverage runs on desktop projects; mobile editor behavior is covered in mobile-editor.spec.ts."
);

// ---------------------------------------------------------------------------
// /editor – initial load: page preview is visible
// ---------------------------------------------------------------------------

test("/editor page preview is visible on initial load", async ({ page }) => {
  await gotoHydratedEditor(page);
  // The preview scroll container wraps the HandwritingEditor canvas.
  const previewContainer = page.getByTestId("preview-scroll-container");
  await expect(previewContainer).toBeVisible();
});

// ---------------------------------------------------------------------------
// /editor – type into the hidden "Handwriting text input"
// ---------------------------------------------------------------------------

test("typed text is retained in the Handwriting text input", async ({
  page,
}) => {
  await gotoHydratedEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Hello world");

  // The textarea value should equal what was typed.
  await expect(textInput).toHaveValue("Hello world");
});

// ---------------------------------------------------------------------------
// /editor – canvas/page preview remains visible after typing
// ---------------------------------------------------------------------------

test("canvas preview remains visible after typing", async ({ page }) => {
  await gotoHydratedEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Canvas stays visible");

  const previewContainer = page.getByTestId("preview-scroll-container");
  await expect(previewContainer).toBeVisible();
});

test("typing in the focused handwriting input does not jump desktop preview scroll", async ({
  page,
}) => {
  await gotoHydratedEditor(page);

  const previewContainer = page.getByTestId("preview-scroll-container");
  await expect(previewContainer).toBeVisible();

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });
  const zoomInButton = toolbar.getByRole("button", { name: "Zoom in" });

  for (let i = 0; i < 6; i += 1) {
    await zoomInButton.click();
    const canScroll = await previewContainer.evaluate(
      (element) => element.scrollHeight > element.clientHeight + 300
    );
    if (canScroll) break;
  }

  await expect
    .poll(() =>
      previewContainer.evaluate((element) => element.scrollHeight > element.clientHeight)
    )
    .toBe(true);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.focus();
  await previewContainer.evaluate((element) => {
    element.scrollTop = Math.min(320, element.scrollHeight - element.clientHeight);
  });
  const beforeScrollTop = await previewContainer.evaluate((element) => element.scrollTop);

  await page.keyboard.type("Scroll stays stable while typing");
  await expect(textInput).toHaveValue("Scroll stays stable while typing");

  const afterScrollTop = await previewContainer.evaluate((element) => element.scrollTop);
  expect(afterScrollTop).toBeGreaterThanOrEqual(beforeScrollTop - 2);
  expect(afterScrollTop).toBeLessThanOrEqual(beforeScrollTop + 2);
});

// ---------------------------------------------------------------------------
// /editor - pagination completion updates page count for short text
// ---------------------------------------------------------------------------

test("pagination updates page count to 1 for short text", async ({
  page,
}) => {
  await gotoHydratedEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Short text");

  // The canvas toolbar shows "Page X of Y". For a short single-line text the
  // Pagination should report 1 page. Wait for the toolbar to appear
  // and assert the count.
  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // "Page 1 of 1" indicates pagination completed for short content.
  await expect(toolbar).toContainText("Page 1 of 1", { timeout: 15_000 });
});

// ---------------------------------------------------------------------------
// /editor – zoom in and zoom out controls update the displayed zoom value
// ---------------------------------------------------------------------------

test("zoom in control increases the displayed zoom percentage", async ({
  page,
}) => {
  await gotoHydratedEditor(page);

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // Read the initial zoom text (e.g. "100%")
  const zoomInButton = toolbar.getByRole("button", { name: "Zoom in" });
  await zoomInButton.click();

  // After clicking zoom in the percentage should be greater than the initial
  // value. We assert a specific value: 110% (initial 100% + one 0.1 step).
  await expect(toolbar.locator("span").filter({ hasText: /\d+%/ })).toContainText(
    "110%"
  );
});

test("zoom out control decreases the displayed zoom percentage", async ({
  page,
}) => {
  await gotoHydratedEditor(page);

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  const zoomOutButton = toolbar.getByRole("button", { name: "Zoom out" });
  await zoomOutButton.click();

  // After clicking zoom out the percentage should be less than 100%.
  // The step is 0.1, so we expect 90%.
  await expect(toolbar.locator("span").filter({ hasText: /\d+%/ })).toContainText(
    "90%"
  );
});

// ---------------------------------------------------------------------------
// /editor – previous page and next page disabled state for single-page content
// ---------------------------------------------------------------------------

test("previous page button is disabled for single-page content", async ({
  page,
}) => {
  await gotoHydratedEditor(page);

  // Fill with short text so pagination completes as 1 page.
  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("One page only");

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // Wait for pagination to settle on page 1 of 1.
  await expect(toolbar).toContainText("Page 1 of 1", { timeout: 15_000 });

  const prevButton = toolbar.getByRole("button", { name: "Previous page" });
  await expect(prevButton).toBeDisabled();
});

test("next page button is disabled for single-page content", async ({
  page,
}) => {
  await gotoHydratedEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("One page only");

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // Wait for pagination to settle on page 1 of 1.
  await expect(toolbar).toContainText("Page 1 of 1", { timeout: 15_000 });

  const nextButton = toolbar.getByRole("button", { name: "Next page" });
  await expect(nextButton).toBeDisabled();
});
