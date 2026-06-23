import FeaturePage from '@/components/patterns/FeaturePage';
import { buildFeatureMetadata } from '@/lib/seo/pageMetadata';
import { productFacts } from '@/lib/seo/productFacts';

const path = '/features/paper-colors';
const title = 'Paper Colors in Text2Ink';
const description = 'Review the built-in paper color choices and hex values available in the Text2Ink editor.';
const colorNames = productFacts.paper.colors.map((color) => color.name).join(', ');
const colorValues = productFacts.paper.colors
  .map((color) => `${color.name} ${color.value}`)
  .join(', ');
const directAnswer = `Text2Ink includes six paper color choices from the editor constants: ${colorValues}. The paper color control changes the page paper color while keeping ink color and line color as separate editor controls. These paper colors work with the same paper style, page size, orientation, margin, line offset, and line spacing controls already available in the editor, so page color is documented as part of the paper setup rather than as a separate rendering mode.`;

export const metadata = buildFeatureMetadata({ path, title, description });

const sections = [
  {
    title: 'Built-in color choices',
    body: [
      `The paper color picker is populated from the editor paper color catalog: ${colorNames}.`,
      'Each color has a fixed hex value from the shared constants used by the editor.',
      'The feature page reads the same paper color facts used by the editor so the visible color list does not drift from the product controls.',
    ],
    items: productFacts.paper.colors.flatMap((color) => [color.name, color.value]),
    media: [
      {
        kind: 'image',
        title: 'Paper color placeholder',
        description: 'Placeholder for an editor image showing the paper color picker and selected page color.',
      },
      {
        kind: 'image',
        title: 'Paper color catalog placeholder',
        description: 'Placeholder for an editor image showing Cream, White, Aged, Light Blue, Light Yellow, and Light Green options.',
      },
    ],
  },
  {
    title: 'Color values',
    body: [
      'The current paper color values are listed directly from the editor constants.',
      `Those values are ${colorValues}.`,
    ],
    items: productFacts.paper.colors.map((color) => `${color.name}: ${color.value}`),
    media: [
      {
        kind: 'image',
        title: 'Hex value reference placeholder',
        description: 'Placeholder for an editor image pairing each paper color name with its hex value.',
      },
      {
        kind: 'image',
        title: 'Selected color preview placeholder',
        description: 'Placeholder for an editor image showing how the selected paper color appears on the page preview.',
      },
    ],
  },
  {
    title: 'Separate color controls',
    body: [
      'Paper color is separate from ink color.',
      'Line color is also a separate control when upload-backed paper exposes it.',
      'Keeping these controls separate lets the editor document page color, handwriting ink, and upload-backed paper line color as distinct settings.',
    ],
    items: ['Paper Color', 'Ink Color', 'Line Color'],
    media: [
      {
        kind: 'image',
        title: 'Separate color controls placeholder',
        description: 'Placeholder for an editor image showing paper color, ink color, and line color as separate controls.',
      },
    ],
  },
  {
    title: 'Connected paper settings',
    body: [
      'Paper colors work with the same paper style, page size, orientation, margins, line offset, and line spacing controls used by the editor.',
      'The paper color choice does not replace those controls; it is one setting inside the broader page setup alongside Letter, A4, A3, Portrait, and Landscape options.',
    ],
    items: ['Paper styles', 'Letter', 'A4', 'A3', 'Portrait', 'Landscape'],
    media: [
      {
        kind: 'image',
        title: 'Paper setup placeholder',
        description: 'Placeholder for an editor image showing paper color together with paper style, page size, and orientation controls.',
      },
    ],
  },
] as const;

const faqs = [
  {
    question: 'Which paper colors are built into Text2Ink?',
    answer: `The editor includes ${colorValues}.`,
  },
  {
    question: 'Is paper color the same as ink color?',
    answer: 'No. Text2Ink keeps paper color and ink color as separate editor controls.',
  },
] as const;

export default function PaperColorsFeaturePage() {
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
