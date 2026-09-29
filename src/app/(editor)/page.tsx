import type { Metadata } from 'next';
import { preload } from 'react-dom';
import JsonLd from '@/components/seo/JsonLd';
import { buildSoftwareApplicationJsonLd } from '@/lib/seo/jsonLd';
import {
  canonicalUrl,
  siteFacts,
  webApplicationFeatureList,
} from '@/lib/seo/productFacts';
import RootEditorPageClient from './RootEditorPageClient';
import './editor.css';

const canonical = canonicalUrl('/');
const editorTitle = 'Handwriting Editor - Create Realistic Handwritten Notes';
const editorDescription = 'Use the Text2Ink handwriting editor to convert text into handwriting-style pages. Customize fonts, paper styles, colors, margins, text boxes, randomness, and export as PDF, PNG, or JPG.';

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
    canonical,
  },
  openGraph: {
    type: 'website',
    url: canonical,
    siteName: siteFacts.siteName,
    title: `${editorTitle} | ${siteFacts.siteName}`,
    description: editorDescription,
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
    title: `${editorTitle} | ${siteFacts.siteName}`,
    description: editorDescription,
    images: [siteFacts.previewImagePath],
  },
};

export default function EditorPage() {
  preload('/Sample-handwriting-preview1-mobile.avif', { as: 'image' });
  preload('/Sample-handwriting-preview1.avif', { as: 'image' });

  return (
    <>
      <JsonLd
        data={buildSoftwareApplicationJsonLd({
          url: canonical,
          description: editorDescription,
          featureList: webApplicationFeatureList,
        })}
      />
      <section aria-labelledby="editor-page-title">
        <h1 id="editor-page-title" className="sr-only">
          Text2Ink Handwriting Editor
        </h1>
        <p className="sr-only">
          Type text, choose handwriting and paper controls, add text boxes, review pages, and export the rendered document.
        </p>
      </section>
      <RootEditorPageClient />
    </>
  );
}
