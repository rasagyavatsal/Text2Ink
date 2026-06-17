import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';

interface LegalPageProps {
  title: string;
  intro: string;
  effectiveDate: string;
  sections: Array<{ title: string; body: string }>;
}

export default function LegalPage({
  title,
  intro,
  effectiveDate,
  sections,
}: LegalPageProps) {
  const frameClasses = 'w-full px-public-gutter';

  return (
    <div className="min-h-screen bg-background">
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

      <main className="py-page-y">
        <div className={frameClasses}>
          <div className="flex w-full flex-col gap-8">
            <div className="max-w-3xl">
              <h1 className="text-document-title font-bold tracking-tight text-foreground mb-4">
                {title}
              </h1>
              <p className="text-body-lg text-muted-foreground mb-4">
                {intro}
              </p>
              <p className="text-caption text-muted-foreground mb-8">
                Effective date: {effectiveDate}
              </p>
            </div>

            <div className="max-w-3xl space-y-8">
              {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h2 className="text-section-title font-semibold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <p className="text-body leading-7 text-muted-foreground">
                    {section.body}
                  </p>
                </section>
              ))}
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
