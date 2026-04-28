import type { Metadata } from 'next';
import Link from 'next/link';
import GlobalHeader from '@/components/patterns/GlobalHeader';
import HomepagePreviewGallery from '@/components/patterns/HomepagePreviewGallery';
import SiteFooter from '@/components/patterns/SiteFooter';

const siteUrl = 'https://text2ink.com';
const canonicalUrl = `${siteUrl}/`;
const homeTitle = 'Text to handwriting converter';
const homeDescription = 'Convert typed text into realistic handwritten notes with Text2Ink.';

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    siteName: 'Text2Ink',
    title: `${homeTitle} | Text2Ink`,
    description: homeDescription,
    images: [
      {
        url: '/Sample-handwriting-preview1.avif',
        width: 840,
        height: 1188,
        alt: 'Text2Ink handwriting preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${homeTitle} | Text2Ink`,
    description: homeDescription,
    images: ['/Sample-handwriting-preview1.avif'],
    creator: '@text2ink',
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--t2i-surface-app)] text-[var(--t2i-content-normal)]">
      <GlobalHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <section className="flex w-full max-w-6xl flex-col items-center justify-center gap-8 text-center sm:gap-10">
          <div className="flex max-w-3xl flex-col items-center gap-6">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--t2i-content-strong)] sm:text-5xl">
              Text to handwriting converter
            </h1>
            <Link
              href="/editor"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--t2i-brand-primary)] px-6 text-sm font-bold text-[var(--t2i-brand-on-primary)] transition hover:bg-[var(--t2i-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)]"
            >
              Go to editor
            </Link>
          </div>

          <HomepagePreviewGallery />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
