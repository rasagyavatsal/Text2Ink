import FeaturePage from '@/components/patterns/FeaturePage';
import { buildFeatureMetadata } from '@/lib/seo/pageMetadata';
import { productFacts } from '@/lib/seo/productFacts';

const path = '/features/notebook-paper-styles';
const title = 'Notebook Paper Styles in Text2Ink';
const description = 'Review the paper styles, page sizes, orientations, colors, and alignment controls available in the Text2Ink editor.';
const paperFormats = productFacts.paper.formats.map((format) => format.name).join(', ');
const paperOrientations = productFacts.paper.orientations.map((orientation) => orientation.name).join(' and ');
const directAnswer = `Text2Ink lets you build handwriting-style pages on Blank, lined, ruled, grid, dot grid, and Cornell paper options from the editor catalog. The page size controls include ${paperFormats}, and the orientation controls include ${paperOrientations}. Paper color, line color, line height, line tilt, margins, line offset, custom line spacing, and PNG or JPG background uploads are available where the selected paper setup exposes those controls.`;

export const metadata = buildFeatureMetadata({ path, title, description });

const sections = [
  {
    title: 'Paper styles',
    body: [
      'The paper picker is populated from the editor paper catalog. Each style appears as a selectable card in the Paper section.',
      'The catalog includes blank, lined, ruled, grid, dot grid, and Cornell variants.',
      `The current product facts list ${productFacts.paper.styles.length} paper styles, and the feature page mirrors that catalog instead of maintaining a separate marketing list.`,
    ],
    items: productFacts.paper.styles.map((style) => style.name),
    media: [
      {
        kind: 'image',
        title: 'Paper picker placeholder',
        description: 'Placeholder for an editor image showing paper picker cards and the selected paper setup.',
      },
      {
        kind: 'image',
        title: 'Paper catalog placeholder',
        description: 'Placeholder for an editor image showing blank, lined, ruled, grid, dot grid, and Cornell paper options.',
      },
    ],
  },
  {
    title: 'Page size and orientation',
    body: [
      `${paperFormats.replace(/, ([^,]*)$/, ', and $1')} are available page sizes.`,
      `${paperOrientations} are available orientation choices, so paper geometry can be set independently from the selected style.`,
    ],
    items: [
      ...productFacts.paper.formats.map((format) => format.name),
      ...productFacts.paper.orientations.map((orientation) => orientation.name),
    ],
    media: [
      {
        kind: 'image',
        title: 'Page size control placeholder',
        description: 'Placeholder for an editor image showing Letter, A4, and A3 page size controls.',
      },
      {
        kind: 'image',
        title: 'Orientation control placeholder',
        description: 'Placeholder for an editor image showing Portrait and Landscape orientation controls.',
      },
    ],
  },
  {
    title: 'Paper and alignment controls',
    body: [
      'Depending on the selected paper setup, Text2Ink exposes paper color, line color, line height, line tilt, margins, line offset, and custom line spacing controls.',
      'These controls sit under the same paper and alignment workflow, so paper style, page geometry, margins, and line spacing are documented together on this page.',
    ],
    items: ['Paper Color', 'Line Color', 'Line Height', 'Line Tilt', 'Margins', 'Line Offset', 'Custom Line Spacing'],
    media: [
      {
        kind: 'image',
        title: 'Alignment controls placeholder',
        description: 'Placeholder for an editor image showing margins, line offset, line tilt, and line spacing controls.',
      },
    ],
  },
  {
    title: 'Custom backgrounds',
    body: [
      'The Custom Background Image control accepts PNG or JPG uploads.',
      'Upload-backed paper can show controls for line detection, line offset, custom line spacing, and upload-backed line color.',
      'Uploaded background images are treated as paper inputs in the editor, and uploaded background data can be stored in the browser-local editor draft described in the privacy policy.',
    ],
    items: ['PNG', 'JPG', 'Auto-Detect Lines'],
    media: [
      {
        kind: 'image',
        title: 'Background upload placeholder',
        description: 'Placeholder for an editor image showing the PNG or JPG custom background upload control.',
      },
      {
        kind: 'image',
        title: 'Line detection placeholder',
        description: 'Placeholder for an editor image showing upload-backed line detection and spacing controls.',
      },
    ],
  },
] as const;

const faqs = [
  {
    question: 'Which notebook paper styles are available?',
    answer: `The editor includes ${productFacts.paper.styles.map((style) => style.name).join(', ')}.`,
  },
  {
    question: 'Can Text2Ink switch paper size and orientation?',
    answer: `Yes. The Size control includes ${paperFormats}, and the Orientation control includes ${paperOrientations}.`,
  },
] as const;

export default function NotebookPaperStylesFeaturePage() {
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
