import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import robots from '../robots';

describe('generated metadata routes', () => {
  it('includes public, editor, legal URLs in the sitemap without retired feature routes', () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      'https://text2ink.com/',
      'https://text2ink.com/editor',
      'https://text2ink.com/contact',
      'https://text2ink.com/terms-of-service',
      'https://text2ink.com/privacy-policy',
    ]));
    expect(urls).not.toContain('https://text2ink.com/features/handwriting-fonts');
    expect(urls).not.toContain('https://text2ink.com/features/notebook-paper-styles');
    expect(urls).not.toContain('https://text2ink.com/features/paper-colors');
    expect(urls).not.toContain('https://text2ink.com/features/realism-effects');
    expect(urls).not.toContain('https://text2ink.com/features/export-handwritten-notes');
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
