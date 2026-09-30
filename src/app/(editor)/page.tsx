import type { Metadata } from 'next';
import { preload } from 'react-dom';
import RootEditorPageClient from './RootEditorPageClient';
import './editor.css';

const editorTitle = 'Handwriting Editor - Create Realistic Handwritten Notes';
const editorDescription = 'Use the Text2Ink handwriting editor to convert text into handwriting-style pages. Customize fonts, paper styles, colors, margins, text boxes, randomness, and export as PDF, PNG, or JPG.';

export const metadata: Metadata = {
  title: editorTitle,
  description: editorDescription,
};

export default function EditorPage() {
  preload('/Sample-handwriting-preview1-mobile.avif', { as: 'image' });
  preload('/Sample-handwriting-preview1.avif', { as: 'image' });

  return (
    <>
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
