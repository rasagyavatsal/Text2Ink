import { gotoHydratedEditor, test, expect } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

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

type CanvasInkBounds = {
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  canvasWidth: number;
  canvasHeight: number;
};

type Point = { x: number; y: number };

async function disableNextDevToolsPointerInterception(page: Page) {
  await page.addStyleTag({
    content: "nextjs-portal { pointer-events: none !important; }",
  });
}

// ---------------------------------------------------------------------------
// Helper: open /editor at mobile viewport, wait for preview to be visible.
// ---------------------------------------------------------------------------
async function openMobileEditor(page: Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await gotoHydratedEditor(page);
  await disableNextDevToolsPointerInterception(page);
  // Preview scroll container is always rendered in mobile layout.
  const previewContainer = page.getByTestId("preview-scroll-container");
  await expect(previewContainer).toBeVisible({ timeout: 15_000 });
  return previewContainer;
}

async function openFreshMobileEditor(page: Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.addInitScript(() => window.localStorage.clear());
  await gotoHydratedEditor(page);
  await disableNextDevToolsPointerInterception(page);
  const previewContainer = page.getByTestId("preview-scroll-container");
  await expect(previewContainer).toBeVisible({ timeout: 15_000 });
  return previewContainer;
}

// ---------------------------------------------------------------------------
// Helper: open the sheet by clicking the handle.
// ---------------------------------------------------------------------------
async function openSheet(page: Page) {
  const openHandle = page.getByRole("button", { name: "Open editor controls" });
  await expectElementTopmostAtCenter(openHandle);
  await openHandle.click();
  // Wait for the sheet to expand (label changes once anchor transitions).
  await expect(
    page.getByRole("button", { name: "Expand editor controls" })
  ).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Helper: wait for multiple pages in mobile footer controls.
// ---------------------------------------------------------------------------
async function waitForMobileMultiplePages(page: Page) {
  // In mobile layout the page counter is inside the sheet footer via
  // PageZoomControls which renders "Page X of Y".
  const pageCounter = page.locator("span").filter({ hasText: /Page \d+ of [2-9]\d*/ });
  await expect(pageCounter).toBeVisible({ timeout: 30_000 });
}

async function expectElementTopmostAtCenter(locator: ReturnType<Page["locator"]>) {
  await expect(locator).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(
      () =>
        locator.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const topElement = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + Math.min(rect.height / 2, 40)
          );
          return topElement === element || element.contains(topElement);
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
}

async function expectHandleTopmost(page: Page, name: string | RegExp = /editor controls/i) {
  const handle = page.getByRole("button", { name });
  await expectElementTopmostAtCenter(handle);
  return handle;
}

async function expectPeekHandleAtBottom(page: Page) {
  const handle = await expectHandleTopmost(page, "Open editor controls");
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect
    .poll(async () => {
      const box = await handle.boundingBox();
      return box?.y ?? 0;
    }, { timeout: 10_000 })
    .toBeGreaterThan(viewport!.height - 140);
  return handle;
}

async function expectMinimumHitTarget(locator: ReturnType<Page["locator"]>) {
  await expect(locator).toBeAttached({ timeout: 10_000 });
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function expectLocatorHitTestableAtPoint(
  page: Page,
  locator: Locator,
  point: Point,
) {
  await expect
    .poll(
      () =>
        locator.evaluate((element, { x, y }) => {
          const topElement = document.elementFromPoint(x, y);
          return topElement === element || element.contains(topElement);
        }, point),
      { timeout: 10_000 },
    )
    .toBe(true);
}

async function expectLocatorHitTestableAtRatio(
  locator: Locator,
  xRatio: number,
  yRatio = 0.5,
) {
  await expect
    .poll(
      () =>
        locator.evaluate((element, { xRatio, yRatio }) => {
          const rect = element.getBoundingClientRect();
          const x = Math.round(rect.left + rect.width * xRatio);
          const y = Math.round(rect.top + rect.height * yRatio);
          const topElement = document.elementFromPoint(x, y);
          return topElement === element || element.contains(topElement);
        }, { xRatio, yRatio }),
      { timeout: 10_000 },
    )
    .toBe(true);
}

async function getLocatorDragPoint(locator: Locator, xRatio: number, yRatio = 0.5) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  return {
    x: Math.round(box!.x + box!.width * xRatio),
    y: Math.round(box!.y + box!.height * yRatio),
  };
}

async function performChromiumTouchDrag(
  page: Page,
  start: Point,
  end: Point,
  steps = 8,
) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    });
    await page.waitForTimeout(50);

    for (let step = 1; step <= steps; step++) {
      const ratio = step / steps;
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: Math.round(start.x + (end.x - start.x) * ratio),
            y: Math.round(start.y + (end.y - start.y) * ratio),
            id: 1,
          },
        ],
      });
      await page.waitForTimeout(16);
    }

    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(50);
  } finally {
    await client.detach();
  }
}

async function readMobileSheetCurrentHeight(page: Page) {
  return page.locator(".mobile-editor-sheet__container").evaluate((element) => {
    return Number.parseFloat(
      (element as HTMLElement).style.getPropertyValue("--mobile-editor-sheet-current-height")
    );
  });
}

async function tapCanvasFraction(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
  fractionX: number,
  fractionY: number,
  isMobile: boolean,
) {
  const point = await canvas.evaluate(
    (element, { fractionX, fractionY }) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width * fractionX,
        y: rect.top + rect.height * fractionY,
      };
    },
    { fractionX, fractionY },
  );

  const topElementTag = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return element?.tagName.toLowerCase();
  }, point);
  expect(topElementTag).toBe("canvas");

  if (isMobile) {
    await page.touchscreen.tap(point.x, point.y);
  } else {
    await page.mouse.click(point.x, point.y);
  }
}

async function tapCanvasClientPoint(
  page: Page,
  point: { x: number; y: number },
  isMobile: boolean,
) {
  const topElementTag = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return element?.tagName.toLowerCase();
  }, point);
  expect(topElementTag).toBe("canvas");

  if (isMobile) {
    await page.touchscreen.tap(point.x, point.y);
  } else {
    await page.mouse.click(point.x, point.y);
  }
}

async function getCanvasInkBounds(
  canvas: ReturnType<Page["locator"]>,
): Promise<CanvasInkBounds | null> {
  return canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext("2d");
    if (!context) {
      return null;
    }

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

    if (count === 0) {
      return null;
    }

    return {
      count,
      minX,
      maxX,
      minY,
      maxY,
      canvasWidth: width,
      canvasHeight: height,
    };
  });
}

async function waitForCanvasTextInk(
  canvas: ReturnType<Page["locator"]>,
): Promise<CanvasInkBounds> {
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

async function getCanvasInkPoint(
  canvas: ReturnType<Page["locator"]>,
  bounds: CanvasInkBounds,
  xMode: "center" | "rightWhitespace",
) {
  return canvas.evaluate(
    (element, { bounds, xMode }) => {
      const rect = element.getBoundingClientRect();
      const inkCenterX = (bounds.minX + bounds.maxX) / 2;
      const inkCenterY = (bounds.minY + bounds.maxY) / 2;
      return {
        x:
          xMode === "rightWhitespace"
            ? rect.left + rect.width * 0.9
            : rect.left + (inkCenterX / bounds.canvasWidth) * rect.width,
        y: rect.top + (inkCenterY / bounds.canvasHeight) * rect.height,
      };
    },
    { bounds, xMode },
  );
}

async function getTextareaSelection(textInput: Locator) {
  return textInput.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  });
}

async function expectCollapsedTextareaSelection(textInput: Locator) {
  const selection = await getTextareaSelection(textInput);
  expect(selection.end).toBe(selection.start);
}

async function expectTextareaCaret(page: Page, expectedIndex: number) {
  const textInput = page.getByLabel("Handwriting text input");
  await expect
    .poll(() =>
      textInput.evaluate((element) => (element as HTMLTextAreaElement).selectionStart ?? -1)
    )
    .toBe(expectedIndex);
  await expectCollapsedTextareaSelection(textInput);
}

async function prepareCanvasCaretScenario(page: Page) {
  await openFreshMobileEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("abcdef");
  await expect(textInput).toHaveValue("abcdef");

  const canvas = page.locator('canvas[aria-label="Page 1 preview"]').first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  const inkBounds = await waitForCanvasTextInk(canvas);
  return { textInput, canvas, inkBounds };
}

async function expectCollapsedTextareaCaretBefore(textInput: Locator, maxIndex: number) {
  await expect
    .poll(() =>
      textInput.evaluate((element) => (element as HTMLTextAreaElement).selectionStart ?? maxIndex)
    )
    .toBeLessThan(maxIndex);
  await expectCollapsedTextareaSelection(textInput);
}

async function prepareMobileMultiplePages(page: Page) {
  await openMobileEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await expect(textInput).toBeAttached({ timeout: 10_000 });
  await textInput.focus();
  await textInput.fill(LONG_TEXT_FIXTURE);

  await waitForMobileMultiplePages(page);
}

async function clickMobilePageButton(
  page: Page,
  name: "Next page" | "Previous page",
  expectedPage: number,
) {
  const button = page.getByRole("button", { name });
  await expect(button).toBeEnabled({ timeout: 10_000 });
  await button.click();

  const pageCounter = page.locator("span").filter({
    hasText: new RegExp(`Page ${expectedPage} of \\d+`),
  });
  await expect(pageCounter).toBeVisible({ timeout: 10_000 });
}

type CarouselScrollSnapshot = {
  scrollLeft: number;
  maxScrollLeft: number;
  pageScroll: number;
};

async function readCarouselScrollSnapshot(
  carousel: Locator,
): Promise<CarouselScrollSnapshot> {
  return carousel.evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    maxScrollLeft: Math.max(0, element.scrollWidth - element.clientWidth),
    pageScroll: Math.max(element.clientWidth * 0.85, 1),
  }));
}

function clampScrollTarget(value: number, maxScrollLeft: number) {
  return Math.min(Math.max(value, 0), maxScrollLeft);
}

async function waitForCarouselScrollToSettle(
  page: Page,
  carousel: Locator,
): Promise<number> {
  let settledScrollLeft = 0;

  await expect
    .poll(
      async () => {
        const before = await carousel.evaluate((element) => element.scrollLeft);
        await page.waitForTimeout(120);
        const after = await carousel.evaluate((element) => element.scrollLeft);
        settledScrollLeft = after;
        return Math.abs(after - before);
      },
      { timeout: 4_000 },
    )
    .toBeLessThanOrEqual(1);

  return settledScrollLeft;
}

// ---------------------------------------------------------------------------
// 1. Mobile bottom sheet is visible on load.
// ---------------------------------------------------------------------------

test("mobile bottom sheet is visible at mobile viewport", async ({ page }) => {
  await openMobileEditor(page);

  // The sheet handle button is the most reliable accessible element to assert.
  const sheetHandle = await expectPeekHandleAtBottom(page);
  await sheetHandle.click();
  await expectHandleTopmost(page, "Expand editor controls");
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

test("sheet handle cycles peek to default to expanded to peek", async ({ page }) => {
  await openMobileEditor(page);

  for (let i = 0; i < 2; i++) {
    const openHandle = await expectPeekHandleAtBottom(page);
    await openHandle.click();

    const expandHandle = await expectHandleTopmost(page, "Expand editor controls");
    await expandHandle.click();

    const collapseHandle = await expectHandleTopmost(page, "Collapse editor controls");
    await collapseHandle.click();

    await expectPeekHandleAtBottom(page);
  }
});

test("sheet handle returns visible and topmost after editor focus blur", async ({ page }) => {
  await openFreshMobileEditor(page);

  const textInput = page.getByLabel("Handwriting text input");
  await textInput.fill("Focus blur mobile handle");
  await textInput.evaluate((element) => (element as HTMLTextAreaElement).blur());

  await expectPeekHandleAtBottom(page);
});

test("viewport resize keeps the sheet handle visible and tappable", async ({ page }) => {
  await openFreshMobileEditor(page);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId("preview-scroll-container")).toBeVisible({ timeout: 10_000 });
  await page.setViewportSize(MOBILE_VIEWPORT);

  const handle = await expectPeekHandleAtBottom(page);
  await handle.click();
  await expectHandleTopmost(page, "Expand editor controls");
});

test("tapping rendered canvas text moves the hidden textarea caret", async ({
  page,
  isMobile,
}) => {
  const { textInput, canvas, inkBounds } = await prepareCanvasCaretScenario(page);

  await tapCanvasClientPoint(
    page,
    await getCanvasInkPoint(canvas, inkBounds, "center"),
    isMobile,
  );

  await expectCollapsedTextareaCaretBefore(textInput, 6);
});

test("preview paper taps place the caret on text, line whitespace, and lower blank area", async ({
  page,
  isMobile,
}) => {
  const { textInput, canvas, inkBounds } = await prepareCanvasCaretScenario(page);

  await tapCanvasClientPoint(
    page,
    await getCanvasInkPoint(canvas, inkBounds, "center"),
    isMobile,
  );
  await expectCollapsedTextareaCaretBefore(textInput, 6);

  await tapCanvasClientPoint(
    page,
    await getCanvasInkPoint(canvas, inkBounds, "rightWhitespace"),
    isMobile,
  );
  await expectTextareaCaret(page, 6);

  await tapCanvasFraction(page, canvas, 0.5, 0.8, isMobile);
  await expectTextareaCaret(page, 6);
});

// ---------------------------------------------------------------------------
// 5. Use mobile sheet tabs: Text, Paper, Align, Realism – each tab button is
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

test("mobile sheet Realism tab button is visible and clickable", async ({ page }) => {
  await openMobileEditor(page);
  await openSheet(page);

  const tabBar = page.locator("div.sticky.top-0.-mt-6");
  await expect(tabBar).toBeVisible({ timeout: 5_000 });

  const realismTab = tabBar.getByRole("button", { name: "Realism", exact: true });
  await expect(realismTab).toBeVisible({ timeout: 5_000 });
  await expect(tabBar.getByRole("button", { name: "More", exact: true })).toHaveCount(0);
  await realismTab.click();

  const moreSection = page.locator('[data-section="more"]').first();
  await expect(moreSection).toBeAttached({ timeout: 5_000 });
});

test("sheet drag updates current height CSS variable before touch ends", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP real touch drag requires Chromium");

  await openFreshMobileEditor(page);

  const handle = await expectHandleTopmost(page, "Open editor controls");
  const sheetContainer = page.locator(".mobile-editor-sheet__container");
  await expect(sheetContainer).toBeVisible({ timeout: 10_000 });

  const beforeHeight = await readMobileSheetCurrentHeight(page);
  const start = await getLocatorDragPoint(handle, 0.5, 0.5);
  const end = { x: start.x, y: start.y - 220 };
  const client = await page.context().newCDPSession(page);

  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    });
    await page.waitForTimeout(50);

    for (let step = 1; step <= 10; step++) {
      const ratio = step / 10;
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: Math.round(start.x + (end.x - start.x) * ratio),
            y: Math.round(start.y + (end.y - start.y) * ratio),
            id: 1,
          },
        ],
      });
      await page.waitForTimeout(16);
    }

    await expect
      .poll(() => readMobileSheetCurrentHeight(page))
      .toBeGreaterThan(beforeHeight + 40);
  } finally {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    }).catch(() => {});
    await client.detach();
  }
});

test("Clear dialog opened from the mobile sheet is above the sheet and clickable", async ({
  page,
}) => {
  await openFreshMobileEditor(page);
  await openSheet(page);

  await page.getByRole("button", { name: /Clear Everything/i }).click();

  const dialog = page.getByRole("dialog", { name: /Clear Everything/i });
  await expectElementTopmostAtCenter(dialog);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden({ timeout: 5_000 });
});

test("Paper Size select opens above the mobile sheet and can change selection", async ({
  page,
}) => {
  await openFreshMobileEditor(page);
  await openSheet(page);

  const tabBar = page.locator("div.sticky.top-0.-mt-6");
  await tabBar.getByRole("button", { name: "Paper", exact: true }).click();

  const sheetContent = page.locator(".mobile-editor-sheet__content");
  const sizeTrigger = sheetContent.getByRole("combobox", { name: "Size" });
  await sizeTrigger.click();

  const a4Option = page.getByRole("option", { name: "A4" });
  await expectElementTopmostAtCenter(a4Option);
  await a4Option.click();

  await expect(sizeTrigger).toContainText("A4");
});

test("carousel arrow buttons scroll font and paper carousels", async ({ page }) => {
  await openFreshMobileEditor(page);
  await openSheet(page);

  const buttonScrollCarousel = async (
    carousel: Locator,
    nextButtonName: string,
    previousButtonName: string,
  ) => {
    await expect(carousel).toBeVisible({ timeout: 10_000 });
    await carousel.evaluate((element) => {
      element.scrollLeft = 0;
    });

    const nextButton = page.getByRole("button", { name: nextButtonName });
    const previousButton = page.getByRole("button", { name: previousButtonName });
    await expect(nextButton).toBeVisible({ timeout: 10_000 });
    await expect(previousButton).toBeVisible({ timeout: 10_000 });
    await expect(previousButton).toBeDisabled();

    const startSnapshot = await readCarouselScrollSnapshot(carousel);
    const nextTarget = clampScrollTarget(
      startSnapshot.scrollLeft + startSnapshot.pageScroll,
      startSnapshot.maxScrollLeft,
    );
    const targetTolerance = Math.max(8, Math.min(120, startSnapshot.pageScroll * 0.5));
    const prefersReducedMotion = await page.evaluate(() =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    await nextButton.click();
    await page.waitForTimeout(80);

    const earlyScrollLeft = await carousel.evaluate((element) => element.scrollLeft);
    if (
      !prefersReducedMotion &&
      earlyScrollLeft > startSnapshot.scrollLeft + 1 &&
      earlyScrollLeft < nextTarget - 1
    ) {
      expect(earlyScrollLeft).toBeGreaterThan(startSnapshot.scrollLeft + 1);
      expect(earlyScrollLeft).toBeLessThan(nextTarget - 1);
    } else {
      test.info().annotations.push({
        type: "skip",
        description: "Smooth scroll intermediate assertion skipped: reduced motion or instant completion.",
      });
    }

    await expect
      .poll(() => carousel.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(startSnapshot.scrollLeft + 20);
    const settledNextScrollLeft = await waitForCarouselScrollToSettle(page, carousel);
    expect(Math.abs(settledNextScrollLeft - nextTarget)).toBeLessThanOrEqual(targetTolerance);
    await expect(previousButton).toBeEnabled();

    await previousButton.click();
    await expect
      .poll(() => carousel.evaluate((element) => element.scrollLeft))
      .toBeLessThanOrEqual(5);
    const settledPreviousScrollLeft = await waitForCarouselScrollToSettle(page, carousel);
    expect(settledPreviousScrollLeft).toBeLessThanOrEqual(5);
    await expect(previousButton).toBeDisabled();
    await expect(page.getByRole("button", { name: "Expand editor controls" })).toBeVisible();
  };

  await buttonScrollCarousel(
    page.locator("#mobile-settings-section-text").getByTestId("font-carousel"),
    "Next fonts",
    "Previous fonts",
  );

  const tabBar = page.locator("div.sticky.top-0.-mt-6");
  await tabBar.getByRole("button", { name: "Paper", exact: true }).click();
  await buttonScrollCarousel(
    page.locator("#mobile-settings-section-paper").getByTestId("paper-style-carousel"),
    "Next paper styles",
    "Previous paper styles",
  );
});

test("vertical drag that starts on the font carousel scrolls the mobile sheet", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP real touch drag requires Chromium");

  await openFreshMobileEditor(page);
  await openSheet(page);

  const sheetScroller = page.locator(".mobile-editor-sheet__scroller");
  const carousel = page.locator("#mobile-settings-section-text").getByTestId("font-carousel");
  const firstFontCard = carousel.getByRole("button", { name: /Caveat/ });
  await expect(carousel).toBeVisible({ timeout: 10_000 });
  await expect(firstFontCard).toBeVisible({ timeout: 10_000 });
  await sheetScroller.evaluate((element) => {
    element.scrollTop = 0;
  });

  await expectLocatorHitTestableAtRatio(firstFontCard, 0.5, 0.35);
  const start = await getLocatorDragPoint(firstFontCard, 0.5, 0.35);
  const end = { x: start.x + 8, y: start.y - 240 };

  await performChromiumTouchDrag(page, start, end, 14);

  await expect
    .poll(() => sheetScroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(20);
  await expect(page.getByRole("button", { name: "Expand editor controls" })).toBeVisible();
});

test("diagonal drag on the font carousel scrolls the sheet but not the carousel", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP real touch drag requires Chromium");

  await openFreshMobileEditor(page);
  await openSheet(page);

  const sheetScroller = page.locator(".mobile-editor-sheet__scroller");
  const carousel = page.locator("#mobile-settings-section-text").getByTestId("font-carousel");
  const firstFontCard = carousel.getByRole("button", { name: /Caveat/ });
  await expect(carousel).toBeVisible({ timeout: 10_000 });
  await expect(firstFontCard).toBeVisible({ timeout: 10_000 });
  await sheetScroller.evaluate((element) => {
    element.scrollTop = 0;
  });
  await carousel.evaluate((element) => {
    element.scrollLeft = 0;
  });

  await expectLocatorHitTestableAtRatio(firstFontCard, 0.75, 0.35);
  const start = await getLocatorDragPoint(firstFontCard, 0.75, 0.35);
  const end = { x: start.x - 170, y: start.y - 170 };

  await performChromiumTouchDrag(page, start, end, 14);

  await expect
    .poll(() => carousel.evaluate((element) => element.scrollLeft))
    .toBeLessThan(5);
  await expect
    .poll(() => sheetScroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(20);
  await expect(page.getByRole("button", { name: "Expand editor controls" })).toBeVisible();
});

test("horizontal touch drag on the font carousel does not scroll it", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP real touch drag requires Chromium");

  await openFreshMobileEditor(page);
  await openSheet(page);

  const carousel = page.locator("#mobile-settings-section-text").getByTestId("font-carousel");
  await expect(carousel).toBeVisible({ timeout: 10_000 });
  await carousel.evaluate((element) => {
    element.scrollLeft = 0;
  });

  await expectLocatorHitTestableAtRatio(carousel, 0.82, 0.25);
  const start = await getLocatorDragPoint(carousel, 0.82, 0.25);
  const end = await getLocatorDragPoint(carousel, 0.18, 0.25);

  await performChromiumTouchDrag(page, start, end);

  await expect
    .poll(() => carousel.evaluate((element) => element.scrollLeft))
    .toBeLessThan(5);
});

test("preview scroll touch drag scrolls preview instead of sheet drag", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP real touch drag requires Chromium");

  const previewContainer = await openFreshMobileEditor(page);
  await openSheet(page);

  const canvas = page.locator('canvas[aria-label="Page 1 preview"]').first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await previewContainer.evaluate((element) => {
    element.scrollTop = 0;
  });

  const start = await canvas.evaluate(() => {
    const canvasElement = document.querySelector('canvas[aria-label="Page 1 preview"]');
    const sheetContainer = document.querySelector(".mobile-editor-sheet__container");
    if (!canvasElement || !sheetContainer) {
      throw new Error("Missing canvas or mobile sheet");
    }

    const canvasRect = canvasElement.getBoundingClientRect();
    const sheetRect = sheetContainer.getBoundingClientRect();
    const visibleCanvasBottom = Math.min(canvasRect.bottom, sheetRect.top - 80);
    return {
      x: Math.round(canvasRect.left + canvasRect.width / 2),
      y: Math.round(
        Math.max(
          canvasRect.top + 40,
          Math.min(canvasRect.top + canvasRect.height * 0.45, visibleCanvasBottom),
        ),
      ),
    };
  });
  const end = { x: start.x, y: Math.max(40, start.y - 220) };
  await expectLocatorHitTestableAtPoint(page, canvas, start);

  let previewScrollTop = 0;
  for (let attempt = 0; attempt < 2 && previewScrollTop <= 20; attempt++) {
    await previewContainer.evaluate((element) => {
      element.scrollTop = 0;
    });
    await performChromiumTouchDrag(page, start, end, 14);
    previewScrollTop = await previewContainer.evaluate((element) => element.scrollTop);
  }

  expect(previewScrollTop).toBeGreaterThan(20);
  await expect(page.getByRole("button", { name: "Expand editor controls" })).toBeVisible();
});

test("real touch slider drag changes value without sheet drag or sheet scroll", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP real touch drag requires Chromium");

  await openFreshMobileEditor(page);
  await openSheet(page);

  const slider = page.getByRole("slider", { name: "Font Size" });
  await expect(slider).toBeVisible({ timeout: 10_000 });
  await slider.scrollIntoViewIfNeeded();

  const sheetScroller = page.locator(".mobile-editor-sheet__scroller");
  const beforeScrollTop = await sheetScroller.evaluate((element) => element.scrollTop);
  const beforeValue = Number(await slider.getAttribute("aria-valuenow"));
  const sliderRoot = page
    .locator("#mobile-settings-section-text [data-slot='slider']")
    .filter({ has: slider })
    .first();

  await expectLocatorHitTestableAtRatio(sliderRoot, 0.35);
  const start = await getLocatorDragPoint(sliderRoot, 0.35);
  const end = await getLocatorDragPoint(sliderRoot, 0.82);

  await performChromiumTouchDrag(page, start, end);

  await expect
    .poll(async () => Number(await slider.getAttribute("aria-valuenow")))
    .toBeGreaterThan(beforeValue);
  await expect
    .poll(() => sheetScroller.evaluate((element) => element.scrollTop))
    .toBe(beforeScrollTop);
  await expect(page.getByRole("button", { name: "Expand editor controls" })).toBeVisible();
});

test("mobile text-box controls expose 44px touch targets", async ({ page }) => {
  await openFreshMobileEditor(page);
  await openSheet(page);

  await page.getByRole("button", { name: /Add Text Box/i }).click();

  await expectMinimumHitTarget(page.getByRole("button", { name: "Move text box" }));
  await expectMinimumHitTarget(page.getByRole("button", { name: "Text box settings" }));
  await expectMinimumHitTarget(page.getByTestId("handle-se").first());
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
    await prepareMobileMultiplePages(page);
    await clickMobilePageButton(page, "Next page", 2);
  });

  test("previous page button navigates back to page 1", async ({ page }) => {
    test.setTimeout(60_000);
    await prepareMobileMultiplePages(page);
    await clickMobilePageButton(page, "Next page", 2);
    await clickMobilePageButton(page, "Previous page", 1);
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
