import { openDesktopEditor, test, expect } from "./fixtures";

/**
 * Export Flow E2E Tests (issue #287)
 *
 * Covers: export modal opens with empty content (action disabled),
 * PDF export with non-empty content, PNG export, JPG export,
 * multi-page export, and cancel export.
 *
 * Export UI lives in ExportModal.tsx and browser delivery is handled
 * by ExportEngine.ts.
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
// Helper: open the export modal via the Export button in the toolbar
// ---------------------------------------------------------------------------
async function openExportModal(page: Parameters<typeof test>[1]["page"]) {
  const exportButton = page.getByRole("button", { name: "Export" });
  await exportButton.click();
  const modal = page.getByRole("dialog", { name: "Export Document" });
  await expect(modal).toBeVisible({ timeout: 5_000 });
  return modal;
}

// ---------------------------------------------------------------------------
// Export modal – opens with empty content and export action is disabled
// ---------------------------------------------------------------------------

test("export button is disabled for empty editor content", async ({ page }) => {
  await openEditor(page);

  // Open the export modal with no content typed
  const modal = await openExportModal(page);

  // The Export PDF button should be disabled when no content is present
  const exportPdfBtn = modal.getByRole("button", { name: /Export PDF/i });
  await expect(exportPdfBtn).toBeDisabled();
});

test("export modal shows 'Start typing to enable export' hint for empty content", async ({
  page,
}) => {
  await openEditor(page);
  const modal = await openExportModal(page);

  // A hint message should be visible when there is no content
  await expect(modal.getByText(/Start typing to enable export/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// PDF export – enter content, open modal, export PDF
// ---------------------------------------------------------------------------

test("can export a PDF file from the editor", async ({ page }) => {
  await openEditor(page);

  // Enter some text
  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Hello handwriting");

  // Wait for pagination to update
  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });
  await expect(toolbar).toContainText("Page 1 of 1", { timeout: 15_000 });

  const modal = await openExportModal(page);

  // The export button should now be enabled
  const exportBtn = modal.getByRole("button", { name: /Export PDF/i });
  await expect(exportBtn).toBeEnabled();

  // Initiate the download and click export
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportBtn.click(),
  ]);

  // Assert the downloaded file is named handwritten-document.pdf
  expect(download.suggestedFilename()).toBe("handwritten-document.pdf");
});

// ---------------------------------------------------------------------------
// PNG export – select PNG format and export
// ---------------------------------------------------------------------------

test("can export a PNG file from the editor", async ({ page }) => {
  await openEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("PNG export test");

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });
  await expect(toolbar).toContainText("Page 1 of 1", { timeout: 15_000 });

  const modal = await openExportModal(page);

  // Switch to PNG format
  const formatTrigger = modal.locator("#export-format");
  await formatTrigger.click();
  const pngOption = page.getByRole("option", { name: /PNG/i });
  await pngOption.click();

  const exportBtn = modal.getByRole("button", { name: /Export PNG/i });
  await expect(exportBtn).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportBtn.click(),
  ]);

  expect(download.suggestedFilename()).toBe("handwritten-page-1.png");
});

// ---------------------------------------------------------------------------
// JPG export – select JPG format and export
// ---------------------------------------------------------------------------

test("can export a JPG file from the editor", async ({ page }) => {
  await openEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("JPG export test");

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });
  await expect(toolbar).toContainText("Page 1 of 1", { timeout: 15_000 });

  const modal = await openExportModal(page);

  // Switch to JPG format
  const formatTrigger = modal.locator("#export-format");
  await formatTrigger.click();
  const jpgOption = page.getByRole("option", { name: /JPG/i });
  await jpgOption.click();

  const exportBtn = modal.getByRole("button", { name: /Export JPG/i });
  await expect(exportBtn).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportBtn.click(),
  ]);

  expect(download.suggestedFilename()).toBe("handwritten-page-1.jpg");
});

// ---------------------------------------------------------------------------
// Multi-page PNG export – enough text to produce multiple pages
// ---------------------------------------------------------------------------

test("multi-page PNG export downloads one file per page", async ({ page }) => {
  // Increase timeout for this test as multi-page export takes longer
  test.setTimeout(90_000);

  await openEditor(page);

  // Fill with enough text to produce at least 2 pages
  const longText = Array(200).fill("This is a line of text for multi-page export testing that is quite long.").join("\n");
  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill(longText);

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // Wait for pagination to complete for multiple pages (13+ pages for this long text)
  // Check for a page count with 2+ digits since the content produces many pages
  await expect(toolbar).toContainText(/Page 1 of \d{2,}/, { timeout: 60_000 });

  const modal = await openExportModal(page);

  // Switch to PNG format
  const formatTrigger = modal.locator("#export-format");
  await formatTrigger.click();
  const pngOption = page.getByRole("option", { name: /PNG/i });
  await pngOption.click();

  const exportBtn = modal.getByRole("button", { name: /Export PNG/i });
  await expect(exportBtn).toBeEnabled();

  // Collect multiple downloads (one per page)
  const downloads: Awaited<ReturnType<typeof page.waitForEvent<"download">>>[] = [];
  const downloadPromise = new Promise<void>((resolve) => {
    page.on("download", (d) => {
      downloads.push(d);
      // Resolve after we've seen at least 2 downloads
      if (downloads.length >= 2) resolve();
    });
  });

  await exportBtn.click();

  // Wait for at least 2 downloads
  await downloadPromise;

  // Each downloaded file should follow the naming pattern handwritten-page-N.png
  const filenames = downloads.map((d) => d.suggestedFilename());
  expect(filenames).toContain("handwritten-page-1.png");
  expect(filenames).toContain("handwritten-page-2.png");
});

// ---------------------------------------------------------------------------
// Cancel export – click Cancel Export during a multi-page document export
// ---------------------------------------------------------------------------

test("can cancel export on a multi-page document", async ({ page }) => {
  test.setTimeout(90_000);

  await openEditor(page);

  // Fill with enough text to produce multiple pages (ensuring export takes some time)
  // Use very long lines that will wrap and create many more lines than fit on one page
  const longText = Array(200).fill("Cancel export test line of text that is quite long to ensure wrapping.").join("\n");
  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill(longText);

  const toolbar = page.getByTestId("canvas-toolbar");
  await expect(toolbar).toBeVisible({ timeout: 10_000 });

  // Wait for pagination to complete for multiple pages (13+ pages for this long text)
  // Check for a page count with 2+ digits since the content produces many pages
  await expect(toolbar).toContainText(/Page 1 of \d{2,}/, { timeout: 60_000 });

  const modal = await openExportModal(page);

  const exportBtn = modal.getByRole("button", { name: /Export PDF/i });
  await expect(exportBtn).toBeEnabled();

  // Start the export
  await exportBtn.click();

  // Wait for the Cancel Export button to appear during export
  const cancelBtn = modal.getByRole("button", { name: /Cancel Export/i });
  await expect(cancelBtn).toBeVisible({ timeout: 15_000 });

  // Click cancel
  await cancelBtn.click();

  // After cancellation the export button should be visible again (not exporting state)
  await expect(
    modal.getByRole("button", { name: /Export PDF/i })
  ).toBeVisible({ timeout: 10_000 });
});
