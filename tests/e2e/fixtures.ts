import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

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

export async function waitForHydratedEditor(page: Page): Promise<void> {
  await expect(page.getByTestId("editor-shell")).toHaveAttribute(
    "data-client-ready",
    "true",
    { timeout: 15_000 }
  );
}

export async function gotoHydratedEditor(page: Page): Promise<void> {
  await page.goto("/editor");
  await waitForHydratedEditor(page);
}

export async function openDesktopEditor(page: Page) {
  await gotoHydratedEditor(page);
  const panel = page.getByTestId("desktop-settings-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  return panel;
}
