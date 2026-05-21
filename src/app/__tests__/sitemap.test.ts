import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const sitemap = fs.readFileSync(
  path.resolve(__dirname, '../../../public/sitemap.xml'),
  'utf-8'
);

describe('public sitemap', () => {
  it('includes the legal routes', () => {
    expect(sitemap).toContain('<loc>https://text2ink.com/terms-of-service</loc>');
    expect(sitemap).toContain('<loc>https://text2ink.com/privacy-policy</loc>');
  });
});
