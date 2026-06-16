import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';

export const metadata: Metadata = {
  title: 'Text to Handwriting Converter',
  description: "Because life's too short to handwrite assignments.",
};

export default function HomePage() {
  const frameClasses = 'w-full px-public-gutter';

  return (
    <div className="min-h-screen bg-background">
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
          <div className="text-center flex flex-col items-center gap-6 max-w-3xl mx-auto">
            <h1 className="text-display-title font-bold tracking-tight text-foreground">
              Text to Handwriting converter
            </h1>
            <p className="text-body-lg text-muted-foreground">
              Because life&apos;s too short to handwrite assignments.
            </p>
            <Button variant="brand" size="lg" className="mt-2 shadow-sm" asChild>
              <Link href="/editor">
                Open Editor
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full px-public-gutter grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-4">
          <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card flex items-center justify-center">
                <picture className="w-full h-auto flex">
                  <source srcSet="/Sample-handwriting-preview1.avif" type="image/avif" media="(min-width: 640px)" />
                  <source srcSet="/Sample-handwriting-preview1-mobile.avif" type="image/avif" />
                  <img
                    src="/Sample-handwriting-preview1.png"
                    alt="Handwriting preview 1"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </picture>
              </div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card flex items-center justify-center">
                <picture className="w-full h-auto flex">
                  <source srcSet="/Sample-handwriting-preview2.avif" type="image/avif" media="(min-width: 640px)" />
                  <source srcSet="/Sample-handwriting-preview2-mobile.avif" type="image/avif" />
                  <img
                    src="/Sample-handwriting-preview2.png"
                    alt="Handwriting preview 2"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </picture>
              </div>
            </div>

        <section className={`${frameClasses} mt-16 md:mt-24`}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
              How to use Text2Ink
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create a handwritten document by typing your content, choosing a handwriting style, setting up the paper, and exporting the finished pages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-semibold mb-3">Open the editor and type</h3>
              <p className="text-muted-foreground leading-relaxed">
                Select Open Editor, click the paper preview, and start typing. Text2Ink renders your text as handwriting on the current page and paginates longer content across pages.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-semibold mb-3">Choose handwriting</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use Typography to choose a built-in handwriting font, upload a custom .ttf or .otf font, adjust font size, and tune line height when that control is available for the selected paper setup.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-semibold mb-3">Set up paper</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use Page Layout to choose Blank, Lined (Medium), Wide Lined, Narrow Lined, Ruled (Medium), Wide Ruled, Narrow Ruled, Grid, Dot Grid, or Cornell paper. Pick Letter, A4, or A3, switch between portrait and landscape, upload PNG or JPG backgrounds, and adjust margins, line offset, line spacing, or the ruled margin line when those controls are available.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-semibold mb-3">Add page details</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use Add Text Box for dates, names, signatures, and other page-specific text. Text boxes can be moved, resized, edited, recolored, adjusted by font size, and deleted from their text box settings.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-semibold mb-3">Tune realism</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use Colors to set ink and paper colors, and the line color when upload-backed paper exposes it. Use Realism Effects to enable or disable randomness and adjust letter spacing variation, baseline variation, and rotation variation.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-semibold mb-3">Review and export</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use Zoom and Page Navigation to inspect each generated page. When the document has text, choose Export, select PDF Document, PNG Image, or JPG Image, and download the rendered pages. The export dialog shows page progress and can cancel an active export.
              </p>
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
