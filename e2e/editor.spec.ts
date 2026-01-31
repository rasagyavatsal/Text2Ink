import { test, expect } from '@playwright/test';

test('typing enables export button', async ({ page }) => {
  await page.goto('/editor');

  await expect(page.getByLabel('Handwriting text input')).toBeVisible();

  await page.getByRole('button', { name: 'Export', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeDisabled();

  await page.getByLabel('Handwriting text input').fill('Hello from E2E');

  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeEnabled();
});

test('settings + sidebar interactions work', async ({ page }) => {
  await page.goto('/editor');

  await expect(page.getByLabel('Handwriting text input')).toBeVisible();

  await expect(page.getByLabel('Close sidebar')).toBeVisible();
  await page.getByLabel('Close sidebar').click();
  await expect(page.getByLabel('Open sidebar')).toBeVisible();

  await page.getByLabel('Open sidebar').click();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const fontSelect = page.getByRole('combobox', { name: 'Handwriting Style' });
  await fontSelect.click();

  await page.getByRole('option', { name: 'Kalam' }).click();
  await expect(fontSelect).toContainText('Kalam');
});
