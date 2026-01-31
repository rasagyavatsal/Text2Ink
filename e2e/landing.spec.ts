import { test, expect } from '@playwright/test';

test('landing -> editor navigation works', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner')).toBeVisible();

  await page.getByRole('link', { name: 'Open Editor' }).click();

  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByLabel('Handwriting text input')).toBeVisible();
});
