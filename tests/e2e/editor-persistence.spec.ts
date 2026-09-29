import { openDesktopEditor, test, expect, waitForHydratedEditor } from "./fixtures";

/**
 * Editor Persistence And Clear-All E2E Tests (issue #286)
 *
 * Covers: text persistence across page reloads, settings persistence,
 * text box persistence, "Clear Everything" dialog confirmation,
 * cleared state persistence after reload.
 *
 * Editor persistence is handled by editorPersistence.ts and invoked
 * from RootEditorPageClient.tsx. State is stored in localStorage
 * under the key 'text2ink.editor.state'.
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

// ---------------------------------------------------------------------------
// Text persistence – enter text, reload, assert text is restored
// ---------------------------------------------------------------------------

test("editor text is persisted across page reloads", async ({ page }) => {
  await openEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Persisted text content");

  // Wait briefly for the debounced persistence to save
  await page.waitForTimeout(1500);

  // Reload the page
  await page.reload();
  await waitForHydratedEditor(page);
  await expect(page.getByTestId("desktop-settings-panel")).toBeVisible({
    timeout: 15_000,
  });

  // The text should be restored from localStorage
  const restoredInput = page.getByLabel("Handwriting text input");
  await expect(restoredInput).toHaveValue("Persisted text content", {
    timeout: 10_000,
  });
});

// ---------------------------------------------------------------------------
// Setting persistence – change a setting, reload, assert it is restored
// ---------------------------------------------------------------------------

test("changed setting (paper style) is persisted across page reloads", async ({
  page,
}) => {
  const panel = await openEditor(page);

  // Select the dot-grid paper style
  const dotGridCard = panel.getByTestId("paper-style-card-dot-grid");
  await dotGridCard.scrollIntoViewIfNeeded();
  await dotGridCard.click();

  await expect(dotGridCard).toHaveAttribute("aria-pressed", "true");

  // Wait for persistence debounce
  await page.waitForTimeout(1500);

  // Reload
  await page.reload();
  await waitForHydratedEditor(page);
  const restoredPanel = page.getByTestId("desktop-settings-panel");
  await expect(restoredPanel).toBeVisible({ timeout: 15_000 });

  // The dot-grid card should still be selected
  const restoredDotGrid = restoredPanel.getByTestId("paper-style-card-dot-grid");
  await restoredDotGrid.scrollIntoViewIfNeeded();
  await expect(restoredDotGrid).toHaveAttribute("aria-pressed", "true", {
    timeout: 10_000,
  });
});

// ---------------------------------------------------------------------------
// Clear Everything – click Clear Everything, confirm, assert text is empty
// ---------------------------------------------------------------------------

test("Clear Everything removes editor text after confirmation", async ({
  page,
}) => {
  const panel = await openEditor(page);

  // Enter some text
  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Text that will be cleared");

  // Click "Clear Everything" in the settings panel
  const clearBtn = panel.getByRole("button", { name: /Clear Everything/i });
  await clearBtn.scrollIntoViewIfNeeded();
  await clearBtn.click();

  // The confirmation dialog should appear
  await expect(
    page.getByRole("dialog", { name: /Clear Everything/i })
  ).toBeVisible({ timeout: 5_000 });

  // Click the "Clear" button in the dialog to confirm
  const confirmClearBtn = page.getByRole("button", { name: "Clear" });
  await confirmClearBtn.click();

  // The text input should now be empty
  await expect(textInput).toHaveValue("", { timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// Clear Everything – removes text boxes after confirmation
// ---------------------------------------------------------------------------

test("Clear Everything removes text boxes after confirmation", async ({
  page,
}) => {
  const panel = await openEditor(page);

  // Add a text box
  const addTextBoxBtn = panel.getByRole("button", { name: /Add Text Box/i });
  await addTextBoxBtn.scrollIntoViewIfNeeded();
  await addTextBoxBtn.click();

  // Wait for the text box to appear
  const textBoxTextarea = page
    .getByTestId("preview-scroll-container")
    .locator("textarea:not([aria-label])")
    .first();
  await expect(textBoxTextarea).toBeAttached({ timeout: 10_000 });

  // Click "Clear Everything"
  const clearBtn = panel.getByRole("button", { name: /Clear Everything/i });
  await clearBtn.scrollIntoViewIfNeeded();
  await clearBtn.click();

  // Confirm
  await expect(
    page.getByRole("dialog", { name: /Clear Everything/i })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Clear" }).click();

  // All text box textareas should be gone
  await expect(
    page
      .getByTestId("preview-scroll-container")
      .locator("textarea:not([aria-label])")
  ).toHaveCount(0, { timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// Cleared state persists – after clearing, reload, assert cleared state remains
// ---------------------------------------------------------------------------

test("cleared state (empty text) persists after page reload", async ({
  page,
}) => {
  await openEditor(page);

  // Enter text
  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Text that will be cleared and reloaded");
  await page.waitForTimeout(1500);

  // Clear everything
  const panel = page.getByTestId("desktop-settings-panel");
  const clearBtn = panel.getByRole("button", { name: /Clear Everything/i });
  await clearBtn.scrollIntoViewIfNeeded();
  await clearBtn.click();

  await expect(
    page.getByRole("dialog", { name: /Clear Everything/i })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Clear" }).click();

  // Wait for clear to persist
  await page.waitForTimeout(1500);

  // Reload the page
  await page.reload();
  await waitForHydratedEditor(page);
  await expect(page.getByTestId("desktop-settings-panel")).toBeVisible({
    timeout: 15_000,
  });

  // Text should still be empty
  const restoredInput = page.getByLabel("Handwriting text input");
  await expect(restoredInput).toHaveValue("", { timeout: 10_000 });
});
