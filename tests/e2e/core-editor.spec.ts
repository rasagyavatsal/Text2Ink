import { gotoHydratedEditor, test, expect } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

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

interface CanvasInkBounds {
  count: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  canvasWidth: number;
  canvasHeight: number;
}

async function getCanvasInkBounds(canvas: Locator): Promise<CanvasInkBounds | null> {
  return canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext("2d");
    if (!context) return null;

    const { width, height } = canvasElement;
    const pixels = context.getImageData(0, 0, width, height).data;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 255;
      const green = pixels[index + 1] ?? 255;
      const blue = pixels[index + 2] ?? 255;
      const alpha = pixels[index + 3] ?? 0;
      if (alpha > 0 && red < 130 && green < 140 && blue < 180) {
        const pixelIndex = index / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        count += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    if (count === 0) return null;

    return {
      count,
      minX,
      minY,
      maxX,
      maxY,
      canvasWidth: width,
      canvasHeight: height,
    };
  });
}

async function waitForCanvasTextInk(canvas: Locator): Promise<CanvasInkBounds> {
  await expect
    .poll(
      async () => (await getCanvasInkBounds(canvas))?.count ?? 0,
      { timeout: 10_000 },
    )
    .toBeGreaterThan(20);

  const bounds = await getCanvasInkBounds(canvas);
  expect(bounds).not.toBeNull();
  return bounds!;
}

async function getSelectionBluePixelCount(canvas: Locator) {
  return canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext("2d");
    if (!context) return 0;

    const { width, height } = canvasElement;
    const pixels = context.getImageData(0, 0, width, height).data;
    let count = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 255;
      const green = pixels[index + 1] ?? 255;
      const blue = pixels[index + 2] ?? 255;
      const alpha = pixels[index + 3] ?? 0;
      if (alpha > 0 && blue > 180 && green > 150 && red < 210 && blue > red + 20) {
        count += 1;
      }
    }

    return count;
  });
}

async function getCanvasTextDragPoints(
  canvas: Locator,
  bounds: CanvasInkBounds,
  direction: "forward" | "backward",
) {
  return canvas.evaluate(
    (element, { bounds, direction }) => {
      const rect = element.getBoundingClientRect();
      const y = rect.top + (((bounds.minY + bounds.maxY) / 2) / bounds.canvasHeight) * rect.height;
      const left = rect.left + ((bounds.minX + 1) / bounds.canvasWidth) * rect.width;
      const right = rect.left + ((bounds.maxX - 1) / bounds.canvasWidth) * rect.width;
      const start = direction === "forward" ? { x: left, y } : { x: right, y };
      const end = direction === "forward" ? { x: right, y } : { x: left, y };
      return { start, end };
    },
    { bounds, direction },
  );
}

async function expectCanvasHitTarget(page: Page, point: { x: number; y: number }) {
  const tagName = await page.evaluate(({ x, y }) => {
    return document.elementFromPoint(x, y)?.tagName.toLowerCase();
  }, point);
  expect(tagName).toBe("canvas");
}

async function prepareCanvasSelectionScenario(page: Page) {
  await gotoHydratedEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("abcdef");
  await expect(textInput).toHaveValue("abcdef");

  const canvas = page.locator('canvas[aria-label="Page 1 preview"]').first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  const inkBounds = await waitForCanvasTextInk(canvas);
  const initialSelectionPixels = await getSelectionBluePixelCount(canvas);

  return { textInput, canvas, inkBounds, initialSelectionPixels };
}

async function dragRenderedTextSelection(
  page: Page,
  canvas: Locator,
  bounds: CanvasInkBounds,
  direction: "forward" | "backward",
) {
  const points = await getCanvasTextDragPoints(canvas, bounds, direction);
  await expectCanvasHitTarget(page, points.start);
  await expectCanvasHitTarget(page, points.end);

  await page.mouse.move(points.start.x, points.start.y);
  await page.mouse.down();
  await page.mouse.move(points.end.x, points.end.y, { steps: 8 });
  await page.mouse.up();
}

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

test("dragging rendered canvas text forward highlights selected text", async ({
  page,
}) => {
  const { textInput, canvas, inkBounds, initialSelectionPixels } =
    await prepareCanvasSelectionScenario(page);

  await dragRenderedTextSelection(page, canvas, inkBounds, "forward");

  await expect
    .poll(() =>
      textInput.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement;
        return textarea.selectionEnd - textarea.selectionStart;
      })
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      textInput.evaluate((element) => (element as HTMLTextAreaElement).selectionDirection)
    )
    .toBe("forward");
  await expect
    .poll(() => getSelectionBluePixelCount(canvas))
    .toBeGreaterThan(initialSelectionPixels + 50);
});

test("dragging rendered canvas text backward highlights selected text", async ({
  page,
}) => {
  const { textInput, canvas, inkBounds, initialSelectionPixels } =
    await prepareCanvasSelectionScenario(page);

  await dragRenderedTextSelection(page, canvas, inkBounds, "backward");

  await expect
    .poll(() =>
      textInput.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement;
        return textarea.selectionEnd - textarea.selectionStart;
      })
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      textInput.evaluate((element) => (element as HTMLTextAreaElement).selectionDirection)
    )
    .toBe("backward");
  await expect
    .poll(() => getSelectionBluePixelCount(canvas))
    .toBeGreaterThan(initialSelectionPixels + 50);
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
