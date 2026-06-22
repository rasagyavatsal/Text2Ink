import FeaturePage from '@/components/patterns/FeaturePage';
import { buildFeatureMetadata } from '@/lib/seo/pageMetadata';
import { productFacts } from '@/lib/seo/productFacts';

const path = '/features/handwriting-fonts';
const title = 'Handwriting Fonts in Text2Ink';
const description = 'See the built-in handwriting font choices and custom font upload support available in the Text2Ink editor.';
const directAnswer = `Text2Ink includes ${productFacts.handwritingFonts.length} built-in handwriting font choices in the editor and also supports custom font upload for .ttf or .otf files. You can choose a font, adjust font size, set ink color, and combine the selected handwriting with paper styles, page sizes, orientation, alignment controls, and exports from the same editor.`;

export const metadata = buildFeatureMetadata({ path, title, description });

const sections = [
  {
    title: 'Built-in font choices',
    body: 'The font picker is populated from the editor font catalog. Each built-in option is shown in the editor font carousel.',
    items: productFacts.handwritingFonts.map((font) => font.name),
  },
  {
    title: 'Custom font upload',
    body: `Text2Ink can upload .ttf or .otf font files through the Custom Font control. Uploaded font data can be stored as part of the browser-local editor draft described in the privacy policy.`,
  },
  {
    title: 'Typography controls',
    body: 'The editor exposes font size and ink color controls for the selected handwriting. Line height is shown when the selected paper setup supports that control.',
    items: ['Font Size', 'Ink Color', 'Line Height'],
  },
  {
    title: 'Connected editor settings',
    body: 'Fonts work with the same paper, margin, line offset, text box, randomness, and export controls used elsewhere in the editor.',
    items: ['Paper styles', 'Margins', 'Text boxes', 'Randomness', 'Export'],
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
