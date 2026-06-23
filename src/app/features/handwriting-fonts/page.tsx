import FeaturePage from '@/components/patterns/FeaturePage';
import { buildFeatureMetadata } from '@/lib/seo/pageMetadata';
import { productFacts } from '@/lib/seo/productFacts';

const path = '/features/handwriting-fonts';
const title = 'Handwriting Fonts in Text2Ink';
const description = 'See the built-in handwriting font choices and custom font upload support available in the Text2Ink editor.';
const directAnswer = `Text2Ink includes ${productFacts.handwritingFonts.length} built-in handwriting font choices from the editor font catalog and supports custom font uploads for .ttf or .otf files. The font picker controls the active handwriting face, while font size, ink color, and line height controls shape how that handwriting is rendered on the selected paper setup. Custom Font is a separate upload option, not part of the built-in catalog count.`;

export const metadata = buildFeatureMetadata({ path, title, description });

const sections = [
  {
    title: 'Built-in font choices',
    body: [
      'The font picker is populated from the editor font catalog. Each built-in option is shown in the editor font carousel.',
      'The Custom Font option is not counted as a built-in font because it is a user upload path.',
      `The built-in catalog currently lists ${productFacts.handwritingFonts.length} selectable handwriting options before the Custom Font upload path.`,
    ],
    items: productFacts.handwritingFonts.map((font) => font.name),
    media: [
      {
        kind: 'image',
        title: 'Font picker placeholder',
        description: 'Placeholder for an editor image showing the font picker with built-in fonts and the Custom Font upload option.',
      },
      {
        kind: 'image',
        title: 'Built-in font carousel placeholder',
        description: 'Placeholder for an editor image showing the built-in font choices as selectable controls.',
      },
    ],
  },
  {
    title: 'Custom font upload',
    body: [
      `Text2Ink can upload .ttf or .otf font files through the Custom Font control.`,
      'Uploaded font data can be stored as part of the browser-local editor draft described in the privacy policy.',
      'After a supported custom font file is read by the browser, the editor can select the uploaded font through the same font setting used by the built-in catalog.',
    ],
    media: [
      {
        kind: 'image',
        title: 'Custom font upload placeholder',
        description: 'Placeholder for an editor image showing the Custom Font upload control and supported .ttf and .otf formats.',
      },
    ],
  },
  {
    title: 'Typography controls',
    body: [
      'The editor exposes font size and ink color controls for the selected handwriting.',
      'Line height is shown when the selected paper setup supports that control, so the available typography controls stay connected to the active paper setup.',
    ],
    items: ['Font Size', 'Ink Color', 'Line Height'],
    media: [
      {
        kind: 'image',
        title: 'Typography controls placeholder',
        description: 'Placeholder for an editor image showing font size, ink color, and line height controls together.',
      },
      {
        kind: 'image',
        title: 'Ink color control placeholder',
        description: 'Placeholder for an editor image showing ink color as a separate handwriting setting.',
      },
    ],
  },
  {
    title: 'Connected editor settings',
    body: [
      'Fonts work with the same paper, margin, line offset, text box, and randomness controls used elsewhere in the editor.',
      'That means the selected handwriting font is only one part of the page setup; paper choice, spacing controls, text boxes, and randomness can all affect the rendered page.',
    ],
    items: ['Paper styles', 'Margins', 'Text boxes', 'Randomness'],
    media: [
      {
        kind: 'image',
        title: 'Font with paper controls placeholder',
        description: 'Placeholder for an editor image showing handwriting font settings beside paper and alignment controls.',
      },
    ],
  },
] as const;

const faqs = [
  {
    question: 'Which handwriting fonts are built into Text2Ink?',
    answer: `The editor includes ${productFacts.handwritingFonts.map((font) => font.name).join(', ')}.`,
  },
  {
    question: 'Can Text2Ink use a custom handwriting font?',
    answer: 'Yes. The Custom Font control accepts .ttf and .otf files and then lets you select the uploaded font in the editor.',
  },
] as const;

export default function HandwritingFontsFeaturePage() {
  return (
    <FeaturePage
      title={title}
      description={description}
      directAnswer={directAnswer}
      path={path}
      sections={sections}
      faqs={faqs}
    />
  );
}
