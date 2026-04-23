import type { Metadata } from 'next';
import { preload } from 'react-dom';
import RootEditorPageClient from './RootEditorPageClient';
import './editor.css';

const siteUrl = 'https://text2ink.com';
const canonicalUrl = `${siteUrl}/`;
const editorTitle = 'Handwriting Editor - Create Realistic Handwritten Notes';
const editorDescription = 'Use our free online handwriting editor to convert text to realistic handwritten notes. Customize fonts, paper styles, ink effects, margins, and export as PDF or images.';

const editorJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Text2Ink',
  description: editorDescription,
  url: canonicalUrl,
  applicationCategory: 'UtilityApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Convert text to handwriting',
    'Multiple handwriting fonts',
    'Custom paper backgrounds',
    'Realistic ink effects',
    'Export to PDF and images',
    'Adjustable margins and spacing',
  ],
  screenshot: `${siteUrl}/Sample-handwriting-preview1.avif`,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
};

export const metadata: Metadata = {
  title: editorTitle,
  description: editorDescription,
  keywords: [
    'handwriting editor',
    'text to handwriting editor',
    'online handwriting generator',
    'handwritten notes maker',
    'convert text to handwriting online',
    'free handwriting tool',
    'handwriting PDF generator',
    'realistic handwriting creator',
  ],
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    siteName: 'Text2Ink',
    title: `${editorTitle} | Text2Ink`,
    description: editorDescription,
    images: [
      {
        url: '/Sample-handwriting-preview1.avif',
        width: 840,
        height: 1188,
        alt: 'Text2Ink handwriting editor preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${editorTitle} | Text2Ink`,
    description: editorDescription,
    images: ['/Sample-handwriting-preview1.avif'],
    creator: '@text2ink',
  },
};

export default function HomePage() {
  preload('/Sample-handwriting-preview1-mobile.avif', { as: 'image' });
  preload('/Sample-handwriting-preview1.avif', { as: 'image' });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(editorJsonLd) }}
      />
      <RootEditorPageClient />
    </>
  );
}
