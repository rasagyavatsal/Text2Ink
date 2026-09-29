import { test, expect } from "@playwright/test";
import {
  attachConsoleCollector,
  assertNoNextJsErrorOverlay,
  assertPageHasVisibleContent,
  navigateAndHealthCheck,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  downloadFromPage,
} from "./helpers/browser-health";

/**
 * Tests for shared E2E browser health utilities (issue #277).
 * Verifies that every helper module can be imported and behaves correctly
 * against the live app.
 */

test.describe("browser health utilities", () => {
  test("attachConsoleCollector returns a getErrors function that collects console errors", async ({
    page,
  }) => {
    const { getErrors } = attachConsoleCollector(page);
    await page.goto("/editor");
    // Inject a console error from the page context
    await page.evaluate(() => console.error("test-sentinel-error"));
    const errors = getErrors();
    expect(errors.some((e) => e.includes("test-sentinel-error"))).toBe(true);
  });

  test("assertNoNextJsErrorOverlay passes on a healthy page", async ({
    page,
  }) => {
    await page.goto("/editor");
    // Should not throw on a healthy page
    await assertNoNextJsErrorOverlay(page);
  });

  test("assertPageHasVisibleContent passes when the page has rendered content", async ({
    page,
  }) => {
    await page.goto("/editor");
    await assertPageHasVisibleContent(page);
  });

  test("navigateAndHealthCheck navigates and runs all health checks", async ({
    page,
  }) => {
    // Should not throw for a valid route
    await navigateAndHealthCheck(page, "/editor");
  });

  test("DESKTOP_VIEWPORT has expected dimensions", () => {
    expect(DESKTOP_VIEWPORT.width).toBeGreaterThanOrEqual(1280);
    expect(DESKTOP_VIEWPORT.height).toBeGreaterThan(0);
  });

  test("MOBILE_VIEWPORT has expected dimensions", () => {
    expect(MOBILE_VIEWPORT.width).toBeLessThanOrEqual(430);
    expect(MOBILE_VIEWPORT.height).toBeGreaterThan(0);
  });

  test("downloadFromPage is exported and callable with correct signature", async ({
    page,
  }) => {
    // Verify the export is a function (import-level smoke test)
    expect(typeof downloadFromPage).toBe("function");

    // Verify the static download fixture returns the expected Content-Disposition
    // header so that Playwright can trigger a real download event in export tests.
    const response = await page.request.get("/e2e-test-download.txt");
    expect(response.status()).toBe(200);
    const disposition = response.headers()["content-disposition"] ?? "";
    expect(disposition).toContain("attachment");
  });
});
