import { test, expect } from './fixtures';

test('only the editor page is available', async ({ page }) => {
  const editorResponse = await page.goto('/editor');
  expect(editorResponse?.status()).toBe(200);
  await expect(page.getByTestId('editor-shell')).toBeVisible();

  for (const path of ['/', '/contact', '/privacy-policy', '/terms-of-service', '/api/inquiry']) {
    const response = await page.request.get(path);
    expect(response.status(), `${path} should be unavailable`).toBe(404);
  }
});
