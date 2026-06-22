import FeaturePage from '@/components/patterns/FeaturePage';
import { buildFeatureMetadata } from '@/lib/seo/pageMetadata';
import { productFacts } from '@/lib/seo/productFacts';

const path = '/features/notebook-paper-styles';
const title = 'Notebook Paper Styles in Text2Ink';
const description = 'Review the paper styles, page sizes, orientations, colors, and alignment controls available in the Text2Ink editor.';
const paperFormats = productFacts.paper.formats.map((format) => format.name).join(', ');
const paperOrientations = productFacts.paper.orientations.map((orientation) => orientation.name).join(' and ');
const directAnswer = `Text2Ink lets you build handwriting-style pages on Blank, lined, ruled, grid, dot grid, and Cornell paper options from the editor catalog. The page size controls include ${paperFormats}, and the orientation controls include ${paperOrientations}. The editor also exposes paper color, margins, line tilt, line offset, custom line spacing, and PNG or JPG background uploads where those controls apply.`;

export const metadata = buildFeatureMetadata({ path, title, description });

const sections = [
  {
    title: 'Paper styles',
    body: 'The paper picker is populated from the editor paper catalog. Each style appears as a selectable card in the Paper section.',
    items: productFacts.paper.styles.map((style) => style.name),
  },
  {
    title: 'Page size and orientation',
    body: `${paperFormats.replace(/, ([^,]*)$/, ', and $1')} are available page sizes. ${paperOrientations} are available orientation choices.`,
    items: [
      ...productFacts.paper.formats.map((format) => format.name),
      ...productFacts.paper.orientations.map((orientation) => orientation.name),
    ],
  },
  {
    title: 'Paper and alignment controls',
    body: 'Depending on the selected paper setup, Text2Ink exposes paper color, line color, line height, line tilt, margins, line offset, and custom line spacing controls.',
    items: ['Paper Color', 'Line Color', 'Line Height', 'Line Tilt', 'Margins', 'Line Offset', 'Custom Line Spacing'],
  },
  {
    title: 'Custom backgrounds',
    body: 'The Custom Background Image control accepts PNG or JPG uploads and can show controls for line detection, line offset, custom line spacing, and upload-backed line color.',
    items: ['PNG', 'JPG', 'Auto-Detect Lines'],
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
