import path from "path";
import { openDesktopEditor, test, expect } from "./fixtures";

/**
 * Editor Settings Panel E2E Tests (issue #284)
 *
 * Covers: font selection, paper styles (grid, dot-grid, ruled, cornell),
 * paper size, paper orientation, ink color, paper color swatches,
 * randomness toggle, font size slider, text position slider, line tilt slider.
 *
 * Tests target the desktop settings sidebar identified by
 * data-testid="desktop-settings-panel".
 */

test.skip(
  ({ isMobile }) => isMobile,
  "Desktop editor coverage runs on desktop projects; mobile editor behavior is covered in mobile-editor.spec.ts."
);

// ---------------------------------------------------------------------------
// Helper: open /, wait for the desktop settings panel to be present
// ---------------------------------------------------------------------------
async function openEditor(page: Parameters<typeof test>[1]["page"]) {
  return openDesktopEditor(page);
}

const BG_FIXTURE = path.join(__dirname, "fixtures", "test-background.png");

// ---------------------------------------------------------------------------
// Font selection – select at least one built-in handwriting font
// ---------------------------------------------------------------------------

test("can select a built-in handwriting font (Caveat)", async ({ page }) => {
  const panel = await openEditor(page);

  // FontCard renders a <button> whose accessible name includes the font name
  const caveatButton = panel.getByRole("button", { name: "Caveat" });
  await caveatButton.scrollIntoViewIfNeeded();
  await caveatButton.click();

  await expect(panel).toBeAttached();
});

test("can select the Dancing Script built-in font", async ({ page }) => {
  const panel = await openEditor(page);

  const dancingScriptButton = panel.getByRole("button", {
    name: "Dancing Script",
  });
  await dancingScriptButton.scrollIntoViewIfNeeded();
  await dancingScriptButton.click();

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Paper styles – grid
// ---------------------------------------------------------------------------

test("can select the grid paper style", async ({ page }) => {
  const panel = await openEditor(page);

  const gridCard = panel.getByTestId("paper-style-card-grid");
  await gridCard.scrollIntoViewIfNeeded();
  await gridCard.click();

  // Card should now be aria-pressed=true (selected)
  await expect(gridCard).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Paper styles – dot-grid
// ---------------------------------------------------------------------------

test("can select the dot-grid paper style", async ({ page }) => {
  const panel = await openEditor(page);

  const dotGridCard = panel.getByTestId("paper-style-card-dot-grid");
  await dotGridCard.scrollIntoViewIfNeeded();
  await dotGridCard.click();

  await expect(dotGridCard).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Paper styles – ruled
// ---------------------------------------------------------------------------

test("can select the ruled paper style", async ({ page }) => {
  const panel = await openEditor(page);

  const ruledCard = panel.getByTestId("paper-style-card-ruled");
  await ruledCard.scrollIntoViewIfNeeded();
  await ruledCard.click();

  await expect(ruledCard).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Paper styles – cornell
// ---------------------------------------------------------------------------

test("can select the cornell paper style", async ({ page }) => {
  const panel = await openEditor(page);

  const cornellCard = panel.getByTestId("paper-style-card-cornell");
  await cornellCard.scrollIntoViewIfNeeded();
  await cornellCard.click();

  await expect(cornellCard).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Paper size – change via paper-format select
// ---------------------------------------------------------------------------

test("can change paper size to A4 via paper-format select", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const formatTrigger = panel.getByRole("combobox", { name: "Size" });
  await formatTrigger.scrollIntoViewIfNeeded();
  await formatTrigger.click();

  // The dropdown list opens in a Radix portal at page level
  const a4Option = page.getByRole("option", { name: "A4" });
  await a4Option.click();

  await expect(panel).toBeAttached();
});

test("can change paper size to A3 via paper-format select", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const formatTrigger = panel.getByRole("combobox", { name: "Size" });
  await formatTrigger.scrollIntoViewIfNeeded();
  await formatTrigger.click();

  const a3Option = page.getByRole("option", { name: "A3" });
  await a3Option.click();

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Paper orientation – change via paper-orientation select
// ---------------------------------------------------------------------------

test("can change orientation to Landscape via paper-orientation select", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const orientationTrigger = panel.getByLabel("Orientation");
  await orientationTrigger.scrollIntoViewIfNeeded();
  await orientationTrigger.click();

  const landscapeOption = page.getByRole("option", { name: "Landscape" });
  await landscapeOption.click();

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Ink color – change through the color input
// ---------------------------------------------------------------------------

test("can change ink color through the color input", async ({ page }) => {
  const panel = await openEditor(page);

  // The ink color native <input type="color"> is the first color input in the panel
  const colorInput = panel.locator('input[type="color"]').first();
  await colorInput.evaluate((el) => el.scrollIntoView());

  await colorInput.fill("#ff0000");

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Paper color – change through the swatches
// ---------------------------------------------------------------------------

test("can change paper color through the White swatch", async ({ page }) => {
  const panel = await openEditor(page);

  const whiteSwatchButton = panel.getByTitle("White");
  await whiteSwatchButton.scrollIntoViewIfNeeded();
  await whiteSwatchButton.click();

  await expect(panel).toBeAttached();
});

test("can select the Light Blue paper color swatch", async ({ page }) => {
  const panel = await openEditor(page);

  const lightBlueButton = panel.getByTitle("Light Blue");
  await lightBlueButton.scrollIntoViewIfNeeded();
  await lightBlueButton.click();

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Randomness toggle – toggle off and on
// ---------------------------------------------------------------------------

test("can toggle randomness off via randomness-toggle switch", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const toggle = panel.locator("#randomness-toggle");
  await toggle.scrollIntoViewIfNeeded();

  // Default is enabled – toggle it off
  await toggle.click();

  await expect(panel).toBeAttached();
  await expect(toggle).toBeVisible();
});

test("can toggle randomness back on via randomness-toggle switch", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const toggle = panel.locator("#randomness-toggle");
  await toggle.scrollIntoViewIfNeeded();

  // Toggle off then on
  await toggle.click();
  await toggle.click();

  await expect(panel).toBeAttached();
  await expect(toggle).toBeVisible();
});

// ---------------------------------------------------------------------------
// Font size slider – adjust font size
// ---------------------------------------------------------------------------

test("can adjust the font size slider in the settings panel", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const fontSizeSlider = panel.getByRole("slider").first();
  await fontSizeSlider.scrollIntoViewIfNeeded();
  await fontSizeSlider.focus();

  // Increase font size by pressing ArrowRight
  await fontSizeSlider.press("ArrowRight");

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Text position slider – adjust built-in paper horizontal text offset
// ---------------------------------------------------------------------------

test("can adjust the text position slider in the settings panel", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const textPositionSlider = panel.getByRole("slider", { name: "Text Position" });
  await textPositionSlider.scrollIntoViewIfNeeded();
  await textPositionSlider.focus();

  await textPositionSlider.press("ArrowRight");

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Line tilt slider – adjust line tilt for upload-backed paper
// ---------------------------------------------------------------------------

test("can adjust the line tilt slider in the settings panel", async ({
  page,
}) => {
  const panel = await openEditor(page);

  const bgInput = panel.locator('input[type="file"][accept*="image/png"]');
  await bgInput.setInputFiles(BG_FIXTURE);
  await expect(panel.locator('img[alt^="Custom background"]').first()).toBeVisible({
    timeout: 10_000,
  });

  const lineTiltSlider = panel.getByRole("slider", { name: "Line Tilt" });
  await lineTiltSlider.scrollIntoViewIfNeeded();
  await lineTiltSlider.focus();

  await lineTiltSlider.press("ArrowRight");

  await expect(panel).toBeAttached();
});
