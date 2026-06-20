import { test as base, expect } from "@playwright/test";

/**
 * Shared Playwright fixtures for text2ink E2E tests.
 *
 * Extend this base test to add custom fixtures (e.g. authenticated pages,
 * seeded database state, helper utilities) that should be available across
 * all E2E suites.
 */

// Re-export everything from @playwright/test so tests only need to import from
// this file and automatically get all the shared setup.
export { expect };

export const test = base.extend<{
  /** Navigate to the home page before the test body runs */
  homePage: void;
}>({
  homePage: [
    async ({ page }, use) => {
      await page.goto("/");
      await use();
    },
    { auto: false },
  ],
});
