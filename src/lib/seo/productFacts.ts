import { HANDWRITING_FONTS, PAPER_STYLES } from '@/lib/types';

export const siteFacts = {
  siteName: 'Text2Ink',
  canonicalBaseUrl: 'https://text2ink.com',
  previewImagePath: '/Sample-handwriting-preview1.avif',
  previewImageAlt: 'Text2Ink handwritten page preview on lined notebook paper',
} as const;

export const canonicalUrl = (path: string) =>
  `${siteFacts.canonicalBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

export const webApplicationFeatureList = [
  `${HANDWRITING_FONTS.filter((font) => font.value !== 'custom').length} built-in handwriting fonts`,
  'Custom .ttf and .otf font upload',
  `${PAPER_STYLES.length} paper styles`,
  'Letter, A4, and A3 page sizes',
  'Portrait and landscape orientation',
  'Ink color, paper color, and text position controls',
  'Margins, line offset, line spacing, and upload-backed line tilt controls',
  'Randomness controls for spacing, baseline, and rotation variation',
  'Movable text boxes',
  'PDF, PNG, and JPG exports',
] as const;
