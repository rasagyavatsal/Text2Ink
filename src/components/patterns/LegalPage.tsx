import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';

interface LegalPageProps {
  title: string;
  intro: string;
  effectiveDate: string;
  sections: Array<{ id: string; title: string; body: string }>;
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
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
            <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-32">
              <nav aria-label="Table of contents" className="flex flex-col gap-2">
                <h2 className="font-semibold text-foreground mb-2">Table of contents</h2>
                <ul className="flex flex-col gap-2">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <Link 
                        href={`#${section.id}`}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                      >
                        {section.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <div className="flex w-full flex-col gap-8 max-w-3xl">
              <div>
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

              <div className="space-y-8">
                {sections.map((section) => (
                  <section key={section.id} id={section.id} className="space-y-3 scroll-mt-32">
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
