import FeaturePage from '@/components/patterns/FeaturePage';
import { buildFeatureMetadata } from '@/lib/seo/pageMetadata';
import { productFacts } from '@/lib/seo/productFacts';

const path = '/features/export-handwritten-notes';
const title = 'Export Handwritten Notes from Text2Ink';
const description = 'Learn which export formats the Text2Ink editor supports and what the export dialog does while rendering pages.';
const exportLabels = productFacts.exportFormats.map((format) => format.label).join(', ');
const directAnswer = `Text2Ink exports rendered handwriting-style pages as ${exportLabels}. The export dialog lets you choose a format, starts export only when the document has text, renders pages with progress feedback, finalizes PDF output when needed, and can cancel an active export. The editor also provides zoom and page navigation so you can review generated pages before downloading.`;

export const metadata = buildFeatureMetadata({ path, title, description });

const sections = [
  {
    title: 'Supported export formats',
    body: 'The export format selector is populated by the editor export dialog.',
    items: productFacts.exportFormats.map((format) => format.label),
  },
  {
    title: 'Export progress',
    body: 'The dialog shows page progress while rendering. PDF export also shows a finalizing step before the downloaded PDF is delivered.',
    items: ['Page progress', 'PDF finalizing', 'Success state', 'Error state'],
  },
  {
    title: 'Cancel and retry controls',
    body: 'An active export can be cancelled. If export fails, the dialog can show the error and provide a Retry action.',
    items: ['Cancel Export', 'Retry', 'Close'],
  },
  {
    title: 'Review before export',
    body: 'The editor includes zoom controls and page navigation so you can inspect each generated page before opening the export dialog.',
    items: ['Zoom out', 'Zoom in', 'Previous page', 'Next page'],
  },
] as const;

const faqs = [
  {
    question: 'Which export formats does Text2Ink support?',
    answer: `The editor export dialog supports ${exportLabels}.`,
  },
  {
    question: 'Can Text2Ink cancel an active export?',
    answer: 'Yes. The export dialog includes a Cancel Export action while rendering is active.',
  },
] as const;

export default function ExportHandwrittenNotesFeaturePage() {
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
