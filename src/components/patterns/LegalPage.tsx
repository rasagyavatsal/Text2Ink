import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/patterns/Breadcrumbs';
import JsonLd from '@/components/seo/JsonLd';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';
import HomeToc from '@/components/patterns/HomeToc';
import { buildBreadcrumbListJsonLd } from '@/lib/seo/jsonLd';
import { canonicalUrl } from '@/lib/seo/productFacts';

interface LegalPageProps {
  title: string;
  path: string;
  intro: string;
  effectiveDate: string;
  sections: Array<{ id: string; title: string; body: string }>;
}

function renderLegalBody(body: string) {
  return body
    .split(/\n\s*\n/)
    .filter((block) => block.trim() !== '')
    .map((block, index) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
      const isBulletList = lines.length > 0 && lines.every((line) => line.startsWith('- '));

      if (isBulletList) {
        return (
          <ul key={index} className="list-disc space-y-2 pl-6 text-body leading-7 text-muted-foreground">
            {lines.map((line) => (
              <li key={line}>{line.slice(2)}</li>
            ))}
          </ul>
        );
      }

      return (
        <p key={index} className="text-body leading-7 text-muted-foreground">
          {block}
        </p>
      );
    });
}

export default function LegalPage({
  title,
  path,
  intro,
  effectiveDate,
  sections,
}: LegalPageProps) {
  const frameClasses = 'w-full px-public-gutter';
  const breadcrumbLinks = [
    { name: 'Home', href: '/' },
    { name: title, href: path },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: 'Home', url: canonicalUrl('/') },
          { name: title, url: canonicalUrl(path) },
        ])}
      />

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className={`${frameClasses} py-chrome-y`}>
          <SiteHeader
            hideContactLink
            cta={(
              <Button variant="brand" size="chrome" asChild>
                <Link href="/editor">
                  Back to Editor
                </Link>
              </Button>
            )}
          />
        </div>
      </header>

      <main className="py-page-y flex flex-col items-center gap-section w-full">
        <div className={`${frameClasses} flex gap-10`}>
          <HomeToc
            items={sections.map((s) => ({ id: s.id, title: s.title }))}
          />

          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-3xl space-y-12 px-2 sm:px-6 md:px-10">
              <div className="space-y-4">
                <Breadcrumbs items={breadcrumbLinks} />
                <h1 className="text-document-title font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                <p className="text-body-lg text-muted-foreground">
                  {intro}
                </p>
                <p className="text-caption text-muted-foreground">
                  Effective date: {effectiveDate}
                </p>
              </div>

              {sections.map((section) => {
                return (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="text-section-title font-semibold tracking-tight text-foreground mb-4">
                      {section.title}
                    </h2>
                    <div className="space-y-4">
                      {renderLegalBody(section.body)}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-background py-footer mt-section">
        <div className={frameClasses}>
          <SiteFooter />
        </div>
      </footer>
    </div>
  );
}
