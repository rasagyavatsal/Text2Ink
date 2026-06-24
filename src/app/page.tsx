import { Metadata } from 'next';
import Link from 'next/link';
import { preload } from 'react-dom';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';
import JsonLd from '@/components/seo/JsonLd';
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo/jsonLd';
import {
  canonicalUrl,
  productFacts,
  siteFacts,
  webApplicationFeatureList,
} from '@/lib/seo/productFacts';

const pageTitle = 'Text to Handwriting Converter';
const pageDescription = 'Use Text2Ink to convert typed text into handwriting-style notebook pages with built-in fonts, paper styles, text boxes, and PDF, PNG, or JPG exports.';

const directAnswer = `Text2Ink is a text to handwriting converter that renders typed content as handwriting-style notebook pages. In the editor, you can choose built-in handwriting fonts or upload .ttf/.otf fonts, pick paper styles such as lined, ruled, grid, dot grid, and Cornell, set page size and orientation, adjust colors and alignment, add text boxes, and export the result as PDF, PNG, or JPG.`;

const homeFaqs = [
  {
    question: 'What does Text2Ink convert?',
    answer: 'Text2Ink converts typed text into handwriting-style pages inside a browser-based editor.',
  },
  {
    question: 'Which export formats does Text2Ink support?',
    answer: `The export dialog supports ${productFacts.exportFormats.map((format) => format.label).join(', ')}.`,
  },
  {
    question: 'Which paper styles are available?',
    answer: `The editor includes ${productFacts.paper.styles.map((style) => style.name).join(', ')} paper styles.`,
  },
  {
    question: 'Does Text2Ink save editor drafts in the browser?',
    answer: `The editor saves work in browser local storage under ${productFacts.browserDraft.storageKey}, as described in the privacy policy.`,
  },
] as const;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: canonicalUrl('/'),
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl('/'),
    siteName: siteFacts.siteName,
    title: `${pageTitle} | ${siteFacts.siteName}`,
    description: pageDescription,
    images: [
      {
        url: siteFacts.previewImagePath,
        width: 618,
        height: 800,
        alt: siteFacts.previewImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${pageTitle} | ${siteFacts.siteName}`,
    description: pageDescription,
    images: [siteFacts.previewImagePath],
  },
};

export default function HomePage() {
  preload('/fonts/FFCommaTrial-Regular.ttf', { as: 'font', crossOrigin: '' });

  const frameClasses = 'w-full px-public-gutter';

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildWebSiteJsonLd()} />
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd
        data={buildSoftwareApplicationJsonLd({
          url: canonicalUrl('/editor'),
          description: pageDescription,
          featureList: webApplicationFeatureList,
        })}
      />
      <JsonLd data={buildFaqPageJsonLd(homeFaqs)} />
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: 'Home', url: canonicalUrl('/') },
        ])}
      />

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className={`${frameClasses} py-chrome-y`}>
          <SiteHeader
            cta={(
              <Button variant="brand" size="chrome" asChild>
                <Link href="/editor">
                  Open Editor
                </Link>
              </Button>
            )}
          />
        </div>
      </header>

      <main className="py-page-y flex flex-col items-center gap-section w-full">
        <div className={frameClasses}>
          <div className="text-center flex flex-col items-center gap-6 max-w-7xl mx-auto">
            <h1 className="text-page-title sm:text-display-title font-normal tracking-tight text-foreground leading-tight whitespace-normal lg:whitespace-nowrap">
              Text to
              {' '}
              <span className="font-bold font-[family-name:var(--font-ff-comma)] text-amber-600 dark:text-amber-300">
                Handwriting
              </span>
              {' '}
              Converter
            </h1>
            <p data-testid="home-direct-answer" className="text-body-lg text-muted-foreground max-w-3xl leading-8">
              {directAnswer}
            </p>
            <Button variant="brand" size="lg" className="mt-2 shadow-sm" asChild>
              <Link href="/editor">
                Open Editor
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full px-public-gutter grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mt-6 sm:mt-8 lg:mt-10">
          <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-sm bg-card flex items-center justify-center">
                <picture className="w-full h-auto flex">
                  <source srcSet="/Sample-handwriting-preview1.avif" type="image/avif" media="(min-width: 640px)" />
                  <source srcSet="/Sample-handwriting-preview1-mobile.avif" type="image/avif" />
                  <img
                    src="/Sample-handwriting-preview1.png"
                    alt="Text2Ink handwritten page preview on lined notebook paper"
                    width={618}
                    height={800}
                    className="w-full h-auto object-cover"
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              </div>
              <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-sm bg-card flex items-center justify-center">
                <picture className="w-full h-auto flex">
                  <source srcSet="/Sample-handwriting-preview2.avif" type="image/avif" media="(min-width: 640px)" />
                  <source srcSet="/Sample-handwriting-preview2-mobile.avif" type="image/avif" />
                  <img
                    src="/Sample-handwriting-preview2.png"
                    alt="Text2Ink handwritten page preview with blue ink and notebook lines"
                    width={618}
                    height={800}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </picture>
              </div>
            </div>

        <section className={`${frameClasses} mt-10 sm:mt-16 md:mt-24`}>
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
              Text2Ink features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore the editor controls that are backed by the current Text2Ink product code.
            </p>
          </div>

          <div className="space-y-12">
            <section id="handwriting-fonts" data-testid="feature-section" className="grid gap-6 md:grid-cols-2 md:items-start">
              <div>
                <h3 className="text-xl font-semibold mb-3">Fonts</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Choose from {productFacts.handwritingFonts.length} built-in fonts or upload .ttf and .otf font files. The font picker controls the active handwriting face, while font size, ink color, and line height shape how that handwriting is rendered on the selected paper setup.
                </p>
              </div>
              <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center min-h-44 bg-muted/20">
                <p className="text-sm text-muted-foreground">Image placeholder</p>
              </div>
            </section>

            <section id="paper-styles" data-testid="feature-section" className="grid gap-6 md:grid-cols-2 md:items-start">
              <div>
                <h3 className="text-xl font-semibold mb-3">Paper styles</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Use {productFacts.paper.styles.map((style) => style.name).join(', ')} paper with Letter, A4, A3, portrait, and landscape options. Paper color, line color, line height, line tilt, margins, line offset, and custom line spacing are available where the selected paper setup exposes those controls.
                </p>
              </div>
              <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center min-h-44 bg-muted/20">
                <p className="text-sm text-muted-foreground">Image placeholder</p>
              </div>
            </section>

            <section id="paper-colors" data-testid="feature-section" className="grid gap-6 md:grid-cols-2 md:items-start">
              <div>
                <h3 className="text-xl font-semibold mb-3">Paper colors</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Pick {productFacts.paper.colors.map((color) => color.name).join(', ')} paper colors from the editor catalog. Paper color is separate from ink color and line color, so each can be set independently as part of the page setup.
                </p>
              </div>
              <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center min-h-44 bg-muted/20">
                <p className="text-sm text-muted-foreground">Image placeholder</p>
              </div>
            </section>

            <section id="realism-effects" data-testid="feature-section" className="grid gap-6 md:grid-cols-2 md:items-start">
              <div>
                <h3 className="text-xl font-semibold mb-3">Realism effects</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Toggle randomness and tune spacing, baseline, and rotation variation from their editor defaults. When enabled, seeded per-character offsets produce natural handwriting variation across spacing, baseline, and rotation.
                </p>
              </div>
              <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center min-h-44 bg-muted/20">
                <p className="text-sm text-muted-foreground">Image placeholder</p>
              </div>
            </section>
          </div>
        </section>

        <section className={`${frameClasses} mt-10 sm:mt-16 md:mt-24`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 text-center">
              Text2Ink FAQ
            </h2>
            <div className="space-y-5">
              {homeFaqs.map((faq) => (
                <div key={faq.question} className="border-b border-border pb-5 last:border-b-0">
                  <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                  <p className="text-body leading-7 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-footer mt-section">
        <div className={frameClasses}>
          <SiteFooter />
        </div>
      </footer>
    </div>
  );
}
