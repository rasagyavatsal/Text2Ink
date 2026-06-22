import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/patterns/Breadcrumbs';
import SiteFooter from '@/components/patterns/SiteFooter';
import SiteHeader from '@/components/patterns/SiteHeader';
import JsonLd from '@/components/seo/JsonLd';
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  type BreadcrumbItem,
  type FaqItem,
} from '@/lib/seo/jsonLd';
import { canonicalUrl } from '@/lib/seo/productFacts';

export type FeatureSection = {
  readonly title: string;
  readonly body: string;
  readonly items?: readonly string[];
};

type FeaturePageProps = {
  readonly title: string;
  readonly description: string;
  readonly directAnswer: string;
  readonly path: string;
  readonly sections: readonly FeatureSection[];
  readonly faqs: readonly FaqItem[];
};

export default function FeaturePage({
  title,
  description,
  directAnswer,
  path,
  sections,
  faqs,
}: FeaturePageProps) {
  const frameClasses = 'w-full px-public-gutter';
  const breadcrumbLinks = [
    { name: 'Home', href: '/' },
    { name: title, href: path },
  ] as const;
  const breadcrumbJsonLdItems: BreadcrumbItem[] = [
    { name: 'Home', url: canonicalUrl('/') },
    { name: title, url: canonicalUrl(path) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBreadcrumbListJsonLd(breadcrumbJsonLdItems)} />
      <JsonLd data={buildFaqPageJsonLd(faqs)} />

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className={`${frameClasses} py-chrome-y`}>
          <SiteHeader
            cta={(
              <Button variant="brand" size="chrome" asChild>
                <Link href="/editor">Open Editor</Link>
              </Button>
            )}
          />
        </div>
      </header>

      <main className="py-page-y">
        <div className={frameClasses}>
          <div className="mx-auto w-full max-w-document">
            <Breadcrumbs items={breadcrumbLinks} />

            <div className="max-w-3xl">
              <h1 className="text-document-title font-bold tracking-tight text-foreground mb-4">
                {title}
              </h1>
              <p className="text-body-lg text-muted-foreground mb-6">
                {description}
              </p>
              <p
                data-testid="feature-direct-answer"
                className="text-body leading-7 text-foreground bg-muted/40 border border-border rounded-lg p-5"
              >
                {directAnswer}
              </p>
              <Button variant="brand" size="lg" className="mt-6 shadow-sm" asChild>
                <Link href="/editor">Open the editor</Link>
              </Button>
            </div>

            <div className="mt-section grid grid-cols-1 gap-6 md:grid-cols-2">
              {sections.map((section) => (
                <section key={section.title} className="rounded-lg border border-border bg-card p-5 sm:p-6">
                  <h2 className="text-section-title font-semibold tracking-tight text-foreground mb-3">
                    {section.title}
                  </h2>
                  <p className="text-body leading-7 text-muted-foreground">
                    {section.body}
                  </p>
                  {section.items ? (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="rounded-md border border-border bg-background px-3 py-2 text-supporting text-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <section className="mt-section max-w-3xl">
              <h2 className="text-section-title font-semibold tracking-tight text-foreground mb-5">
                Feature FAQ
              </h2>
              <div className="space-y-5">
                {faqs.map((faq) => (
                  <div key={faq.question} className="border-b border-border pb-5 last:border-b-0">
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-body leading-7 text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
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
