import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, `../${relPath}`), 'utf-8');
}

describe('shared layout consumers use token-backed framing utilities', () => {
  it('HomePage consumes shared width, gutter, and rhythm tokens', () => {
    const source = readSource('app/page.tsx');

    expect(source).not.toMatch(/max-w-6xl\b/);
    expect(source).not.toMatch(/px-4 sm:px-6/);
    expect(source).not.toMatch(/py-3 sm:py-4/);
    expect(source).not.toMatch(/py-12 sm:py-16 md:py-20/);
    expect(source).not.toMatch(/mt-12\b/);

    expect(source).toMatch(/max-w-content/);
    expect(source).toMatch(/px-page-x/);
    expect(source).toMatch(/py-chrome-y/);
    expect(source).toMatch(/py-page-y/);
    expect(source).toMatch(/mt-section/);
  });

  it('ContactPage consumes shared width, gutter, and rhythm tokens', () => {
    const source = readSource('app/contact/page.tsx');

    expect(source).not.toMatch(/max-w-6xl\b/);
    expect(source).not.toMatch(/px-4 sm:px-6/);
    expect(source).not.toMatch(/py-3 sm:py-4/);
    expect(source).not.toMatch(/py-12 sm:py-16 md:py-20/);
    expect(source).not.toMatch(/mt-12\b/);

    expect(source).toMatch(/max-w-content/);
    expect(source).toMatch(/px-page-x/);
    expect(source).toMatch(/py-chrome-y/);
    expect(source).toMatch(/py-page-y/);
    expect(source).toMatch(/mt-section/);
  });

  it('SiteHeader consumes shared chrome gap tokens', () => {
    const source = readSource('components/patterns/SiteHeader.tsx');

    expect(source).not.toMatch(/gap-3 sm:gap-4/);
    expect(source).toMatch(/gap-chrome/);
  });

  it('HomePage consumes shared section rhythm tokens', () => {
    const source = readSource('app/page.tsx');

    expect(source).not.toMatch(/gap-12 sm:gap-16/);
    expect(source).toMatch(/gap-section/);
  });

  it('RootEditorPageClient consumes shared gutter, section, and chrome tokens', () => {
    const source = readSource('app/editor/RootEditorPageClient.tsx');

    expect(source).not.toMatch(/px-4 sm:px-6/);
    expect(source).not.toMatch(/py-3 sm:py-4/);
    expect(source).not.toMatch(/gap-3 sm:gap-4/);
    expect(source).not.toMatch(/py-12 px-6/);

    expect(source).toMatch(/px-page-x/);
    expect(source).toMatch(/py-chrome-y/);
    expect(source).toMatch(/gap-chrome/);
    expect(source).toMatch(/py-section/);
  });
});
