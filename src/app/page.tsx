import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';
import StandardPageShell from '@/components/patterns/StandardPageShell';

export const metadata: Metadata = {
  title: 'Text to Handwriting Converter',
  description: "Because life's too short to handwrite assignments.",
};

export default function HomePage() {
  return (
    <StandardPageShell
      header={
        <SiteHeader
          cta={
            <Button variant="brand" size="chrome" asChild>
              <Link href="/editor">
                Open Editor
              </Link>
            </Button>
          }
        />
      }
      content={
        <div className="flex flex-col items-center gap-section w-full">
          <div className="text-center flex flex-col items-center gap-6 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              Text to Handwriting converter
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Because life&apos;s too short to handwrite assignments.
            </p>
            <Button variant="brand" size="lg" className="mt-2 shadow-sm" asChild>
              <Link href="/editor">
                Open Editor
              </Link>
            </Button>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-4">
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
        </div>
      }
      footer={
        <SiteFooter />
      }
    />
  );
}
