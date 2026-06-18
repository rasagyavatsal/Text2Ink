const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 }
];

const paths = [
  { name: 'home', url: 'http://localhost:3000/' },
  { name: 'contact', url: 'http://localhost:3000/contact' },
  { name: 'terms', url: 'http://localhost:3000/terms-of-service' }
];

async function capture() {
  const browser = await playwright.chromium.launch({ headless: true });
  const resultsDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  for (const pagePath of paths) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();
      try {
        console.log(`Navigating to ${pagePath.url} with viewport ${viewport.name} (${viewport.width}x${viewport.height})...`);
        await page.goto(pagePath.url, { waitUntil: 'networkidle' });
        
        // Wait an extra second for any animations or next-themes mount
        await page.waitForTimeout(1000);
        
        const screenshotPath = path.join(resultsDir, `${pagePath.name}-${viewport.name}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot to ${screenshotPath}`);
      } catch (err) {
        console.error(`Failed to capture ${pagePath.name}-${viewport.name}:`, err.message);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
}

capture().catch(err => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
