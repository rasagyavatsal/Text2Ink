import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

    expect(homeSource).toMatch(/text-6xl/);
    expect(homeSource).toMatch(/text-body-lg/);

    expect(contactSource).not.toMatch(/text-3xl sm:text-4xl/);
    expect(contactSource).toMatch(/text-page-title/);
    expect(contactSource).toMatch(/text-body-lg/);
    expect(contactSource).toMatch(/text-supporting/);
  });

  it('public long-form prose uses one large reading size', () => {
    const homeSource = readSource('app/page.tsx');
    const legalPageSource = readSource('components/patterns/LegalPage.tsx');

    expect(homeSource).toMatch(
      /<h3 className="text-body-lg leading-8 font-semibold text-foreground mb-2">\{faq\.question\}<\/h3>/
    );
    expect(homeSource).not.toMatch(
      /<h3 className="font-semibold text-foreground mb-2">\{faq\.question\}<\/h3>/
    );
    expect(homeSource).toMatch(
      /<p className="text-body-lg leading-8 text-muted-foreground">\{faq\.answer\}<\/p>/
    );
    expect(homeSource).not.toMatch(
      /<p className="text-body leading-7 text-muted-foreground">\{faq\.answer\}<\/p>/
    );

    expect(legalPageSource).toMatch(
      /<ul key=\{index\} className="list-disc space-y-2 pl-6 text-body-lg leading-8 text-muted-foreground">/
    );
    expect(legalPageSource).toMatch(
      /<p key=\{index\} className="text-body-lg leading-8 text-muted-foreground">/
    );
    expect(legalPageSource).not.toMatch(/text-body leading-7 text-muted-foreground/);
  });

  it('legal route hierarchy consumes shared document, section, and supporting tokens', () => {
    const privacySource = readSource('app/privacy-policy/page.tsx');
    const termsSource = readSource('app/terms-of-service/page.tsx');
    const legalPageSource = readSource('components/patterns/LegalPage.tsx');

    for (const source of [privacySource, termsSource]) {
      expect(source).not.toMatch(/text-4xl font-bold tracking-tight text-foreground sm:text-5xl/);
      expect(source).not.toMatch(/text-2xl font-semibold tracking-tight text-foreground/);
      expect(source).not.toMatch(/text-base leading-7 text-muted-foreground sm:text-lg/);
      expect(source).not.toMatch(/text-sm text-muted-foreground/);
    }

    expect(legalPageSource).not.toMatch(/text-4xl font-bold tracking-tight text-foreground sm:text-5xl/);
    expect(legalPageSource).not.toMatch(/text-2xl font-semibold tracking-tight text-foreground/);
    expect(legalPageSource).not.toMatch(/text-base leading-7 text-muted-foreground sm:text-lg/);
    expect(legalPageSource).not.toMatch(/text-sm text-muted-foreground/);

    expect(legalPageSource).toMatch(/text-document-title/);
    expect(legalPageSource).toMatch(/text-section-title/);
    expect(legalPageSource).toMatch(/text-body-lg/);
    expect(legalPageSource).toMatch(/text-body/);
    expect(legalPageSource).toMatch(/text-caption/);
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
