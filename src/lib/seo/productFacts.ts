import {
  DEFAULT_SETTINGS,
  HANDWRITING_FONTS,
  PAPER_COLORS,
  PAPER_FORMATS,
  PAPER_ORIENTATIONS,
  PAPER_STYLES,
} from '@/lib/types';
import { EDITOR_STORAGE_KEY } from '@/lib/editorPersistence';

export const siteFacts = {
  siteName: 'Text2Ink',
  canonicalBaseUrl: 'https://text2ink.com',
  contactEmail: 'rasagyavatsal16@gmail.com',
  logoPath: '/logo-512.png',
  previewImagePath: '/Sample-handwriting-preview1.avif',
  previewImageAlt: 'Text2Ink handwritten page preview on lined notebook paper',
} as const;

export const canonicalUrl = (path = '/') => {
  if (path === '/') return `${siteFacts.canonicalBaseUrl}/`;
  return `${siteFacts.canonicalBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export const publicRoutes = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/editor', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terms-of-service', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.4, changeFrequency: 'monthly' },

] as const;



export const productFacts = {
  handwritingFonts: HANDWRITING_FONTS
    .filter((font) => font.value !== 'custom')
    .map(({ name, value }) => ({ name, value })),
  customFontUpload: {
    formats: ['.ttf', '.otf'],
  },
  paper: {
    styles: PAPER_STYLES.map(({ name, value }) => ({ name, value })),
    formats: PAPER_FORMATS.map(({ name, value }) => ({ name, value })),
    orientations: PAPER_ORIENTATIONS.map(({ name, value }) => ({ name, value })),
    colors: PAPER_COLORS.map(({ name, value }) => ({ name, value })),
    customBackgroundFormats: ['PNG', 'JPG'],
  },
  realism: {
    toggleLabel: 'Enable Randomness',
    enabledDefault: DEFAULT_SETTINGS.randomness.enabled,
    variations: [
      { name: 'Letter spacing variation', value: DEFAULT_SETTINGS.randomness.spacing },
      { name: 'Baseline variation', value: DEFAULT_SETTINGS.randomness.baseline },
      { name: 'Rotation variation', value: DEFAULT_SETTINGS.randomness.rotation },
    ],
    appliedBy: [
      'renderer handwriting text',
      'movable text boxes',
    ],
  },
  controls: [
    'Font size',
    'Ink color',
    'Paper color',
    'Text position',
    'Line height',
    'Line tilt for upload-backed paper',
    'Margins',
    'Line offset',
    'Custom line spacing',
    'Randomness',
    'Letter spacing variation',
    'Baseline variation',
    'Rotation variation',
    'Movable text boxes',
  ],
  exportFormats: [
    { value: 'pdf', label: 'PDF Document', extension: 'pdf' },
    { value: 'png', label: 'PNG Image', extension: 'png' },
    { value: 'jpg', label: 'JPG Image', extension: 'jpg' },
  ],
  browserDraft: {
    storageKey: EDITOR_STORAGE_KEY,
    savedState: [
      'typed text',
      'handwriting settings',
      'page settings',
      'text boxes',
      'custom font data',
      'uploaded background images',
      'preview scale',
      'current page position',
    ],
  },
} as const;

export const webApplicationFeatureList = [
  `${productFacts.handwritingFonts.length} built-in handwriting fonts`,
  'Custom .ttf and .otf font upload',
  `${productFacts.paper.styles.length} paper styles`,
  'Letter, A4, and A3 page sizes',
  'Portrait and landscape orientation',
  'Ink color, paper color, and text position controls',
  'Margins, line offset, line spacing, and upload-backed line tilt controls',
  'Randomness controls for spacing, baseline, and rotation variation',
  'Movable text boxes',
  'PDF, PNG, and JPG exports',
] as const;
