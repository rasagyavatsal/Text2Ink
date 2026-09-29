import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import robots from '../robots';

describe('generated metadata routes', () => {
  it('lists only the root editor route', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(['https://text2ink.com/']);
    entries.forEach((entry) => {
      expect(entry).not.toHaveProperty('lastModified');
    });
  });

  it('publishes robots rules with the generated sitemap URL', () => {
    expect(robots()).toMatchObject({
      rules: {
        userAgent: '*',
        allow: '/',
      },
      sitemap: 'https://text2ink.com/sitemap.xml',
      host: 'https://text2ink.com',
    });
  });
});
