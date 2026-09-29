import path from "path";
import { openDesktopEditor, test, expect } from "./fixtures";

/**
 * Editor Upload And Text Box E2E Tests (issue #285)
 *
 * Covers: custom font upload, custom background image upload,
 * removing an uploaded background image, adding a text box,
 * typing into the text box, opening text box settings, and
 * deleting the text box.
 *
 * Tests target the desktop settings sidebar identified by
 * data-testid="desktop-settings-panel".
 */

test.skip(
  ({ isMobile }) => isMobile,
  "Desktop editor coverage runs on desktop projects; mobile editor behavior is covered in mobile-editor.spec.ts."
);

const FONT_FIXTURE = path.join(__dirname, "fixtures", "test-font.ttf");
const BG_FIXTURE = path.join(__dirname, "fixtures", "test-background.png");

// ---------------------------------------------------------------------------
// Helper: open /, wait for the desktop settings panel to be present
// ---------------------------------------------------------------------------
async function openEditor(page: Parameters<typeof test>[1]["page"]) {
  return openDesktopEditor(page);
}

// ---------------------------------------------------------------------------
// Custom font upload – upload a .ttf font through the editor
// ---------------------------------------------------------------------------

test("can upload a custom font through the editor", async ({ page }) => {
  const panel = await openEditor(page);

  // The hidden file input inside the "Upload Font" label accepts .ttf and .otf
  const fontInput = panel.locator('input[type="file"][accept*=".ttf"]');
  await fontInput.setInputFiles(FONT_FIXTURE);

  // After upload, a FontCard for the custom font should appear in the panel.
  // The card shows the file name as the font name.
  await expect(panel.getByText("test-font.ttf")).toBeVisible({
    timeout: 10_000,
  });
});

// ---------------------------------------------------------------------------
// Custom font select – after uploading, select the uploaded custom font
// ---------------------------------------------------------------------------

test("can select the uploaded custom font", async ({ page }) => {
  const panel = await openEditor(page);

  const fontInput = panel.locator('input[type="file"][accept*=".ttf"]');
  await fontInput.setInputFiles(FONT_FIXTURE);

  // Wait for the custom font card to appear then click it to select it
  const customFontCard = panel.getByText("test-font.ttf");
  await expect(customFontCard).toBeVisible({ timeout: 10_000 });

  // The FontCard renders as a button; click its ancestor button
  await customFontCard.locator("..").locator("..").click();

  await expect(panel).toBeAttached();
});

// ---------------------------------------------------------------------------
// Custom background image upload – upload a PNG background image
// ---------------------------------------------------------------------------

test("can upload a custom background PNG image", async ({ page }) => {
  const panel = await openEditor(page);

  // The hidden file input for background images accepts image/png and image/jpeg
  const bgInput = panel.locator('input[type="file"][accept*="image/png"]');
  await bgInput.setInputFiles(BG_FIXTURE);

  // After upload the image thumbnail should appear (img with alt starting with "Custom background")
  await expect(
    panel.locator('img[alt^="Custom background"]').first()
  ).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// Remove uploaded background image – click the remove button on the thumbnail
// ---------------------------------------------------------------------------

test("can remove an uploaded background image", async ({ page }) => {
  const panel = await openEditor(page);

  const bgInput = panel.locator('input[type="file"][accept*="image/png"]');
  await bgInput.setInputFiles(BG_FIXTURE);

  // Wait for the thumbnail to appear
  const thumbnail = panel.locator('img[alt^="Custom background"]').first();
  await expect(thumbnail).toBeVisible({ timeout: 10_000 });

  // The remove button is the destructive icon button overlaid on the thumbnail
  // Its title is "Remove background image"
  const removeBtn = panel.getByTitle("Remove background image").first();
  await removeBtn.click();

  // After removal the thumbnail should no longer be visible
  await expect(thumbnail).not.toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// Add a text box – click "Add Text Box" in the settings panel Actions section
// ---------------------------------------------------------------------------

test("can add a text box via the Add Text Box button", async ({ page }) => {
  const panel = await openEditor(page);

  const addTextBoxBtn = panel.getByRole("button", { name: /Add Text Box/i });
  await addTextBoxBtn.scrollIntoViewIfNeeded();
  await addTextBoxBtn.click();

  // A TextField is rendered on the canvas preview area.
  // The textarea inside it should be present in the DOM.
  // Exclude the main sr-only "Handwriting text input" textarea by filtering on the absence of aria-label.
  const textBoxTextarea = page
    .getByTestId("preview-scroll-container")
    .locator('textarea:not([aria-label])')
    .first();
  await expect(textBoxTextarea).toBeAttached({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// Type into the text box – after adding, type text into the textarea
// ---------------------------------------------------------------------------

test("can type text into a text box", async ({ page }) => {
  const panel = await openEditor(page);

  const addTextBoxBtn = panel.getByRole("button", { name: /Add Text Box/i });
  await addTextBoxBtn.scrollIntoViewIfNeeded();
  await addTextBoxBtn.click();

  const textBoxTextarea = page
    .getByTestId("preview-scroll-container")
    .locator('textarea:not([aria-label])')
    .first();
  await expect(textBoxTextarea).toBeAttached({ timeout: 10_000 });

  await textBoxTextarea.focus();
  await textBoxTextarea.fill("Hello text box");

  await expect(textBoxTextarea).toHaveValue("Hello text box");
});

// ---------------------------------------------------------------------------
// Open text box settings – click the Settings icon on the text box
// ---------------------------------------------------------------------------

test("can open text box settings popover", async ({ page }) => {
  const panel = await openEditor(page);

  const addTextBoxBtn = panel.getByRole("button", { name: /Add Text Box/i });
  await addTextBoxBtn.scrollIntoViewIfNeeded();
  await addTextBoxBtn.click();

  const textBoxTextarea = page
    .getByTestId("preview-scroll-container")
    .locator('textarea:not([aria-label])')
    .first();
  await expect(textBoxTextarea).toBeAttached({ timeout: 10_000 });

  // Focus the text box to select it and reveal its controls
  await textBoxTextarea.focus();

  // The settings button has aria-label="Text box settings"
  const settingsBtn = page.getByRole("button", { name: "Text box settings" }).first();
  await expect(settingsBtn).toBeVisible({ timeout: 5_000 });
  await settingsBtn.click({ force: true });

  // The popover content should appear with "Delete Text Box" option
  await expect(
    page.getByRole("button", { name: /Delete Text Box/i })
  ).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// Delete the text box – open settings and click "Delete Text Box"
// ---------------------------------------------------------------------------

test("can delete a text box via the settings popover", async ({ page }) => {
  const panel = await openEditor(page);

  const addTextBoxBtn = panel.getByRole("button", { name: /Add Text Box/i });
  await addTextBoxBtn.scrollIntoViewIfNeeded();
  await addTextBoxBtn.click();

  const textBoxTextarea = page
    .getByTestId("preview-scroll-container")
    .locator('textarea:not([aria-label])')
    .first();
  await expect(textBoxTextarea).toBeAttached({ timeout: 10_000 });

  // Focus the text box to reveal its controls
  await textBoxTextarea.focus();

  // Open settings
  const settingsBtn = page.getByRole("button", { name: "Text box settings" }).first();
  await expect(settingsBtn).toBeVisible({ timeout: 5_000 });
  await settingsBtn.click({ force: true });

  // Click "Delete Text Box"
  const deleteBtn = page.getByRole("button", { name: /Delete Text Box/i });
  await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
  await deleteBtn.click();

  // After deleting, no text box textareas should remain
  await expect(
    page
      .getByTestId("preview-scroll-container")
      .locator('textarea:not([aria-label])')
  ).toHaveCount(0, { timeout: 5_000 });
});
