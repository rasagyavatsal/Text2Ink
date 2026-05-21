import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, `../${relPath}`), 'utf-8');
}

describe('shared typography consumers use semantic tokens', () => {
  it('shared chrome wordmarks consume the brand mark token', () => {
    const headerSource = readSource('components/patterns/SiteHeader.tsx');
    const footerSource = readSource('components/patterns/SiteFooter.tsx');

    expect(headerSource).not.toMatch(/text-2xl sm:text-3xl/);
    expect(footerSource).not.toMatch(/text-2xl sm:text-3xl/);
    expect(headerSource).toMatch(/text-brand-mark/);
    expect(footerSource).toMatch(/text-brand-mark/);
  });

  it('landing and contact route copy consume semantic heading and body tokens', () => {
    const homeSource = readSource('app/page.tsx');
    const contactSource = readSource('app/contact/page.tsx');

    expect(homeSource).not.toMatch(/text-4xl sm:text-5xl md:text-6xl/);
    expect(homeSource).not.toMatch(/text-lg sm:text-xl/);
    expect(homeSource).toMatch(/text-display-title/);
    expect(homeSource).toMatch(/font-bold/);
    expect(homeSource).toMatch(/text-body-lg/);

    expect(contactSource).not.toMatch(/text-3xl sm:text-4xl/);
    expect(contactSource).toMatch(/text-page-title/);
    expect(contactSource).toMatch(/text-body/);
    expect(contactSource).toMatch(/text-supporting/);
  });

  it('legal route hierarchy consumes shared document, section, and supporting tokens', () => {
    const privacySource = readSource('app/privacy-policy/page.tsx');
    const termsSource = readSource('app/terms-of-service/page.tsx');

    for (const source of [privacySource, termsSource]) {
      expect(source).not.toMatch(/text-4xl font-bold tracking-tight text-foreground sm:text-5xl/);
      expect(source).not.toMatch(/text-2xl font-semibold tracking-tight text-foreground/);
      expect(source).not.toMatch(/text-base leading-7 text-muted-foreground sm:text-lg/);
      expect(source).not.toMatch(/text-sm text-muted-foreground/);

      expect(source).toMatch(/text-document-title/);
      expect(source).toMatch(/text-section-title/);
      expect(source).toMatch(/text-body-lg/);
      expect(source).toMatch(/text-body/);
      expect(source).toMatch(/text-caption/);
    }
  });

  it('footer metadata surfaces consume supporting and caption tokens', () => {
    const footerSource = readSource('components/patterns/SiteFooter.tsx');
    const versionSource = readSource('components/Version.tsx');

    expect(footerSource).not.toMatch(/gap-4 text-sm text-muted-foreground/);
    expect(footerSource).not.toMatch(/text-xs sm:text-sm/);
    expect(versionSource).not.toMatch(/text-label sm:text-xs/);

    expect(footerSource).toMatch(/text-supporting/);
    expect(footerSource).toMatch(/text-caption/);
    expect(versionSource).toMatch(/text-caption/);
  });

  it('dialog primitives consume overlay title and supporting tokens', () => {
    const dialogSource = readSource('components/ui/dialog.tsx');

    expect(dialogSource).not.toMatch(/text-lg font-semibold leading-none tracking-tight/);
    expect(dialogSource).not.toMatch(/text-sm text-muted-foreground/);
    expect(dialogSource).toMatch(/text-overlay-title/);
    expect(dialogSource).toMatch(/text-supporting/);
  });
});
