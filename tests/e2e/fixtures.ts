import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Shared editor navigation helpers for Playwright tests. */
export { test, expect };

export async function waitForHydratedEditor(page: Page): Promise<void> {
  await expect(page.getByTestId("editor-shell")).toHaveAttribute(
    "data-client-ready",
    "true",
    { timeout: 15_000 }
  );
}

export async function gotoHydratedEditor(page: Page): Promise<void> {
  await page.goto("/");
  await waitForHydratedEditor(page);
}

export async function openDesktopEditor(page: Page) {
  await gotoHydratedEditor(page);
  const panel = page.getByTestId("desktop-settings-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  return panel;
}
