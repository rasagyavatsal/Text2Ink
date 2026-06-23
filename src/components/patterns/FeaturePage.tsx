import Link from 'next/link';
import { Fragment } from 'react';
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

export type FeatureMediaPlaceholder = {
  readonly kind: 'image' | 'video';
  readonly title: string;
  readonly description: string;
};

export type FeatureSection = {
  readonly title: string;
  readonly body: string | readonly string[];
  readonly items?: readonly string[];
  readonly media?: FeatureMediaPlaceholder | readonly FeatureMediaPlaceholder[];
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
          <div className="w-full">
            <Breadcrumbs items={breadcrumbLinks} />

            <article data-testid="feature-article" className="w-full max-w-none">
              <div className="max-w-5xl">
                <h1 className="text-document-title font-bold tracking-tight text-foreground mb-4">
                  {title}
                </h1>
                <p className="text-body-lg text-muted-foreground mb-6">
                  {description}
                </p>
              </div>
              <p
                data-testid="feature-direct-answer"
                className="max-w-5xl text-body-lg leading-8 text-foreground font-medium"
              >
                {directAnswer}
              </p>
              <Button variant="brand" size="lg" className="mt-6 shadow-sm" asChild>
                <Link href="/editor">Open the editor</Link>
              </Button>

              <div className="mt-section space-y-12">
                {sections.map((section) => {
                  const paragraphs = Array.isArray(section.body) ? section.body : [section.body];
                  const items = section.items ?? [];
                  const mediaItems = section.media
                    ? Array.isArray(section.media)
                      ? section.media
                      : [section.media]
                    : [];

                  return (
                    <section
                      key={section.title}
                      data-testid="feature-content-section"
                      className="border-t border-border pt-10 first:border-t-0 first:pt-0"
                    >
                      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)] xl:items-start">
                        <div className="min-w-0">
                          <h2 className="text-section-title font-semibold tracking-tight text-foreground mb-4">
                            {section.title}
                          </h2>
                          <div className="space-y-4">
                            {paragraphs.map((paragraph) => (
                              <p
                                key={paragraph}
                                data-testid="feature-section-paragraph"
                                className="text-body leading-7 text-muted-foreground"
                              >
                                {paragraph}
                              </p>
                            ))}
                            {items.length > 0 ? (
                              <p
                                data-testid="feature-section-facts"
                                className="text-body leading-7 text-foreground"
                              >
                                <span className="font-semibold">Editor facts: </span>
                                {items.map((item, index) => (
                                  <Fragment key={item}>
                                    <span>{item}</span>
                                    {index < items.length - 1 ? ', ' : ''}
                                  </Fragment>
                                ))}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {mediaItems.length > 0 ? (
                          <div className="space-y-5">
                            {mediaItems.map((media) => (
                              <figure
                                key={`${media.kind}-${media.title}`}
                                data-testid={`feature-media-placeholder-${media.kind}`}
                                className="border-y border-dashed border-border py-5"
                              >
                                <div className="flex min-h-44 flex-col justify-center">
                                  <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                                    {media.kind === 'video' ? 'Video placeholder' : 'Image placeholder'}
                                  </p>
                                  <figcaption>
                                    <h3 className="mt-2 font-semibold text-foreground">{media.title}</h3>
                                    <p className="mt-2 text-supporting leading-6 text-muted-foreground">
                                      {media.description}
                                    </p>
                                  </figcaption>
                                </div>
                              </figure>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
              </div>

              <section className="mt-section border-t border-border pt-10">
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
            </article>
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
