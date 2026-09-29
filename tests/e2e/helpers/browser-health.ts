import { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Shared browser health utilities for text2ink E2E tests.
 *
 * Every browser E2E should use these helpers to consistently catch:
 *  - Blank pages
 *  - Next.js framework error overlays
 *  - Console / page errors
 *
 * across all `src/app` routes.
 */

// ---------------------------------------------------------------------------
// Viewport definitions
// ---------------------------------------------------------------------------

/** Standard desktop viewport used for editor coverage. */
export const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const;

/** Standard mobile viewport used for mobile editor coverage. */
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

// ---------------------------------------------------------------------------
// Console / page-error collector
// ---------------------------------------------------------------------------

export interface ConsoleCollector {
  /**
   * Returns all console error messages (and uncaught page errors) recorded
   * since `attachConsoleCollector` was called.
   */
  getErrors: () => string[];
}

/**
 * Attaches listeners for `console.error` and uncaught page errors to `page`.
 * Returns a `ConsoleCollector` whose `getErrors()` method returns the
 * accumulated messages.
 *
 * Call this before `page.goto()` so that errors emitted during navigation are
 * captured.
 *
 * @example
 * ```ts
 * const { getErrors } = attachConsoleCollector(page);
 * await page.goto("/");
 * expect(getErrors()).toHaveLength(0);
 * ```
 */
export function attachConsoleCollector(page: Page): ConsoleCollector {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  return {
    getErrors: () => [...errors],
  };
}

// ---------------------------------------------------------------------------
// Next.js error-overlay assertion
// ---------------------------------------------------------------------------

/**
 * Fails the test if a Next.js development error overlay is currently visible
 * in `page`.
 *
 * The overlay is rendered by Next.js when an unhandled error or hydration
 * mismatch occurs during development. Its root element has the attribute
 * `data-nextjs-dialog` or wraps content in a `nextjs-portal` shadow host.
 *
 * @throws If the overlay is detected within a short timeout.
 */
export async function assertNoNextJsErrorOverlay(page: Page): Promise<void> {
  // Next.js dev error overlay selectors (covers different Next.js versions)
  const overlaySelectors = [
    "[data-nextjs-dialog]",
    "nextjs-portal",
    "#__next-build-error",
  ];

  for (const selector of overlaySelectors) {
    const isVisible = await page
      .locator(selector)
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      throw new Error(
        `Next.js error overlay detected on page "${await page.url()}" (selector: ${selector}). ` +
          `Check the browser console for the underlying error.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Visible content assertion
// ---------------------------------------------------------------------------

/**
 * Asserts that the page `<body>` contains meaningful visible text content.
 *
 * This catches blank / white-screen failures where the route renders an empty
 * shell without any user-visible text.
 *
 * @param minLength Minimum number of non-whitespace characters required.
 *   Defaults to 10.
 */
export async function assertPageHasVisibleContent(
  page: Page,
  minLength = 10
): Promise<void> {
  // Wait for the body to be attached
  await page.waitForSelector("body");

  const text = await page.evaluate(() => {
    return (document.body.innerText || "").trim();
  });

  expect(text.replace(/\s+/g, "").length).toBeGreaterThanOrEqual(minLength);
}

// ---------------------------------------------------------------------------
// Navigate + health-check composite helper
// ---------------------------------------------------------------------------

/**
 * Navigates to `route` and runs the full suite of shared health checks:
 *  1. Asserts the page has visible content.
 *  2. Asserts no Next.js error overlay is present.
 *
 * Any console / page-error collection should be set up separately via
 * `attachConsoleCollector` before calling this function.
 *
 * @param page  The Playwright `Page` object.
 * @param route The application route to navigate to (e.g. `"/"`).
 */
export async function navigateAndHealthCheck(
  page: Page,
  route: string
): Promise<void> {
  await page.goto(route);
  await assertPageHasVisibleContent(page);
  await assertNoNextJsErrorOverlay(page);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Triggers a file download by clicking `triggerSelector` and returns the
 * downloaded file contents as a `Buffer`.
 *
 * Waits for the download event that is initiated by the click, streams the
 * file, and resolves once the download is complete.
 *
 * @param page            The Playwright `Page` object.
 * @param triggerSelector CSS selector for the element that triggers the download.
 * @returns               A `Buffer` containing the downloaded file bytes.
 *
 * @example
 * ```ts
 * const pdf = await downloadFromPage(page, "[data-testid='export-pdf-btn']");
 * expect(pdf.byteLength).toBeGreaterThan(0);
 * ```
 */
export async function downloadFromPage(
  page: Page,
  triggerSelector: string
): Promise<Buffer> {
  const [download] = await Promise.all([
    page.context().waitForEvent("download"),
    page.click(triggerSelector),
  ]);

  const stream = await download.createReadStream();

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
