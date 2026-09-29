import { test, expect } from "./fixtures";

/**
 * Foundation health-check – verifies the Playwright setup can reach the app.
 * This is the tracer-bullet test for the E2E foundation (issue #276).
 */
test("app is reachable at the base URL", async ({ page }) => {
  const response = await page.goto("/editor");
  expect(response?.status()).toBeLessThan(500);
});

test("page has a valid HTML document title", async ({ page }) => {
  await page.goto("/editor");
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
