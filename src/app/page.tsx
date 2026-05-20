import { Metadata } from 'next';
import Link from 'next/link';
import NextImage from 'next/image';
import Version from '@/components/Version';
import ThemePicker from '@/components/ThemePicker';
import StandardPageShell from '@/components/patterns/StandardPageShell';

export const metadata: Metadata = {
  title: 'Text to Handwriting Converter',
  description: "Because life's too short to handwrite assignments.",
};

export default function HomePage() {
  return (
    <StandardPageShell
      header={
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-2xl sm:text-3xl font-dancing-script hover:text-brand-accent transition-colors"
          >
            <span className="text-brand-accent">Text</span>
            <span className="text-foreground">2</span>
            <span className="text-brand-accent">Ink</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemePicker />
            <Link
              href="/contact"
              className="text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/editor"
              className="bg-brand-accent text-brand-accent-foreground px-4 sm:px-5 py-2 rounded-lg font-medium text-sm sm:text-base hover:bg-brand-accent-hover transition-colors"
            >
              Open Editor
            </Link>
          </div>
        </div>
      }
      content={
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-12 sm:gap-16">
          <div className="text-center flex flex-col items-center gap-6 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              Text to Handwriting converter
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Because life&apos;s too short to handwrite assignments.
            </p>
            <Link
              href="/editor"
              className="bg-brand-accent text-brand-accent-foreground px-6 sm:px-8 py-3 rounded-xl font-semibold text-base sm:text-lg hover:bg-brand-accent-hover transition-colors shadow-sm mt-2"
            >
              Open Editor
            </Link>
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
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <NextImage
              src="/logo-192.png"
              alt="Text2Ink logo"
              width={64}
              height={64}
              className="w-16 h-16"
              priority
            />
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-muted-foreground text-xs sm:text-sm">
              © {new Date().getFullYear()} Text2Ink. All rights reserved.
            </p>
            <Version />
          </div>
        </div>
      }
    />
  );
}
