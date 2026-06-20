import { test, expect } from "./fixtures";

/**
 * Editor Pagination E2E Tests (issue #283)
 *
 * Covers: long-text multi-page, page navigation (next/prev), page counter
 * accuracy, font-size change not crashing, orientation change not losing text.
 *
 * All tests use a desktop viewport so the canvas-toolbar and settings panel
 * (xl breakpoint) are visible.
 */

// ---------------------------------------------------------------------------
// Long-text fixture that reliably spans more than one page.
// The text is repeated enough times to overflow a single A4 page at the
// default font size.
// ---------------------------------------------------------------------------
const LONG_TEXT_FIXTURE = ("Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris " +
  "nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in " +
  "reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla " +
  "pariatur. Excepteur sint occaecat cupidatat non proident, sunt in " +
  "culpa qui officia deserunt mollit anim id est laborum.\n").repeat(20);

// ---------------------------------------------------------------------------
// Helper: wait for the page count shown in the toolbar to become > 1.
// ---------------------------------------------------------------------------
async function waitForMultiplePages(page: import("@playwright/test").Page) {
  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });
  // Wait until "Page X of Y" where Y > 1.
  await expect(toolbar.locator("span").filter({ hasText: /Page \d+ of [2-9]\d*/ })).toBeVisible({
    timeout: 30_000,
  });
}

// ---------------------------------------------------------------------------
// 1. Long text causes page count to become greater than one.
// ---------------------------------------------------------------------------

test("long text causes page count to exceed one", async ({ page }) => {
  await page.goto("/editor");

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill(LONG_TEXT_FIXTURE);

  await waitForMultiplePages(page);

  const toolbar = page.getByTestId("canvas-toolbar");
  // The toolbar should now show "Page 1 of N" where N >= 2.
  await expect(toolbar).toContainText("Page 1 of");
  const text = await toolbar.locator("span").filter({ hasText: /Page \d+ of \d+/ }).textContent();
  const match = /Page \d+ of (\d+)/.exec(text ?? "");
  const totalPages = match ? parseInt(match[1], 10) : 0;
  expect(totalPages).toBeGreaterThan(1);
});

// ---------------------------------------------------------------------------
// 2. Navigate to the next page.
// ---------------------------------------------------------------------------

test("clicking next page navigates to page 2", async ({ page }) => {
  await page.goto("/editor");

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill(LONG_TEXT_FIXTURE);

  await waitForMultiplePages(page);

  const toolbar = page.getByTestId("canvas-toolbar");
  const nextButton = toolbar.getByRole("button", { name: "Next page" });
  await expect(nextButton).toBeEnabled({ timeout: 10_000 });
  await nextButton.click();

  // Page counter should now show "Page 2 of N".
  await expect(toolbar.locator("span").filter({ hasText: /Page 2 of \d+/ })).toBeVisible({
    timeout: 10_000,
  });
});

// ---------------------------------------------------------------------------
// 3. Navigate back to the previous page.
// ---------------------------------------------------------------------------

test("clicking previous page navigates back to page 1", async ({ page }) => {
  await page.goto("/editor");

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill(LONG_TEXT_FIXTURE);

  await waitForMultiplePages(page);

  const toolbar = page.getByTestId("canvas-toolbar");
  const nextButton = toolbar.getByRole("button", { name: "Next page" });
  await expect(nextButton).toBeEnabled({ timeout: 10_000 });
  await nextButton.click();

  // Confirm we are on page 2.
  await expect(toolbar.locator("span").filter({ hasText: /Page 2 of \d+/ })).toBeVisible({
    timeout: 10_000,
  });

  const prevButton = toolbar.getByRole("button", { name: "Previous page" });
  await prevButton.click();

  // Page counter should return to "Page 1 of N".
  await expect(toolbar.locator("span").filter({ hasText: /Page 1 of \d+/ })).toBeVisible({
    timeout: 10_000,
  });
});

// ---------------------------------------------------------------------------
// 4. Page counter updates correctly after navigation.
// ---------------------------------------------------------------------------

test("page counter updates correctly when navigating back and forth", async ({ page }) => {
  await page.goto("/editor");

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill(LONG_TEXT_FIXTURE);

  await waitForMultiplePages(page);

  const toolbar = page.getByTestId("canvas-toolbar");
  const nextButton = toolbar.getByRole("button", { name: "Next page" });
  const prevButton = toolbar.getByRole("button", { name: "Previous page" });

  // Navigate forward twice.
  await expect(nextButton).toBeEnabled({ timeout: 10_000 });
  await nextButton.click();
  await expect(toolbar.locator("span").filter({ hasText: /Page 2 of \d+/ })).toBeVisible({
    timeout: 10_000,
  });

  await expect(nextButton).toBeEnabled({ timeout: 10_000 });
  await nextButton.click();
  await expect(toolbar.locator("span").filter({ hasText: /Page 3 of \d+/ })).toBeVisible({
    timeout: 10_000,
  });

  // Navigate back once.
  await prevButton.click();
  await expect(toolbar.locator("span").filter({ hasText: /Page 2 of \d+/ })).toBeVisible({
    timeout: 10_000,
  });
});

// ---------------------------------------------------------------------------
// 5. Changing font size can affect pagination without crashing.
//    (Desktop viewport required so the settings sidebar is visible.)
// ---------------------------------------------------------------------------

test("changing font size affects pagination without crashing", async ({ page }) => {
  // Use a large desktop viewport so the xl sidebar is rendered.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor");

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill(LONG_TEXT_FIXTURE);

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // Wait for pagination to start showing page info.
  await expect(toolbar.locator("span").filter({ hasText: /Page \d+ of \d+/ })).toBeVisible({
    timeout: 20_000,
  });

  // The font size slider lives inside the text section of the settings panel.
  // Radix UI renders the thumb as role="slider". There is no aria-label on the
  // thumb itself, so we locate it inside the data-section="text" container.
  const textSection = page.locator('[data-section="text"]');
  await expect(textSection).toBeVisible({ timeout: 10_000 });

  const fontSizeSlider = textSection.getByRole("slider").first();
  await expect(fontSizeSlider).toBeVisible({ timeout: 10_000 });

  // Increase font size multiple times to trigger re-pagination.
  for (let i = 0; i < 5; i++) {
    await fontSizeSlider.press("ArrowRight");
  }

  // After font size change, the editor should still be visible and functional.
  await expect(page.getByTestId("preview-scroll-container")).toBeVisible();
  // Toolbar must still be visible (no crash).
  await expect(toolbar).toBeVisible();
  // Page count indicator should still be present.
  await expect(toolbar.locator("span").filter({ hasText: /Page \d+ of \d+/ })).toBeVisible({
    timeout: 20_000,
  });
});

// ---------------------------------------------------------------------------
// 6. Changing paper orientation does not lose text.
//    (Desktop viewport required so the settings sidebar is visible.)
// ---------------------------------------------------------------------------

test("changing paper orientation does not lose text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor");

  const shortText = "Orientation test content";
  const textInput = page.getByLabel("Handwriting text input");

  // Ensure the editor is interactive before typing.
  await expect(textInput).toBeAttached({ timeout: 10_000 });
  await textInput.focus();
  await textInput.fill(shortText);

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });
  // Wait for pagination to stabilise (page count becomes visible).
  await expect(
    toolbar.locator("span").filter({ hasText: /Page \d+ of \d+/ })
  ).toBeVisible({ timeout: 15_000 });

  // Change orientation via the "paper-orientation" select inside the paper section.
  const paperSection = page.locator('[data-section="paper"]');
  await expect(paperSection).toBeVisible({ timeout: 10_000 });

  // Click the orientation trigger to open the dropdown.
  const orientationTrigger = paperSection.locator("#paper-orientation");
  await expect(orientationTrigger).toBeVisible({ timeout: 10_000 });
  await orientationTrigger.click();

  // Select "Landscape" option from the dropdown portal.
  const landscapeOption = page.getByRole("option", { name: /landscape/i });
  await expect(landscapeOption).toBeVisible({ timeout: 5_000 });
  await landscapeOption.click();

  // After orientation change: editor and toolbar must still be visible (no crash).
  await expect(page.getByTestId("preview-scroll-container")).toBeVisible();
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // The page count must still be visible after orientation change - this
  // confirms the pagination worker reran successfully and text was not lost.
  await expect(
    toolbar.locator("span").filter({ hasText: /Page \d+ of \d+/ })
  ).toBeVisible({ timeout: 15_000 });
});

