export type PaperFormat = 'letter' | 'a4' | 'a3';
export type PaperOrientation = 'portrait' | 'landscape';

// Per-page settings that can be customized for each page
export interface TextField {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: number;
}

export interface PageSettings {
  fontSize: number;
  lineTilt: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paperColor: string;
  customBackgroundImage: string | null;
  customLineOffset: number;
  customLineSpacing: number | null;
  inkColor: string;
  lineColor: string;
  paperStyle: 'blank' | 'lined' | 'wide-lined' | 'narrow-lined' | 'ruled' | 'wide-ruled' | 'narrow-ruled' | 'grid' | 'dot-grid' | 'cornell';
  textFields?: TextField[];
}

export interface HandwritingSettings {
  fontFamily: string;
  customFont: {
    name: string;
    family: string;
    dataUrl: string;
    format: 'truetype' | 'opentype';
  } | null;
  fontSize: number;
  lineHeight: number;
  lineTilt: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paperPresetId?: string | null;
  paperFormat: PaperFormat;
  paperOrientation: PaperOrientation;
  ruledMarginLineOffset: number;
  paperStyle: 'blank' | 'lined' | 'wide-lined' | 'narrow-lined' | 'ruled' | 'wide-ruled' | 'narrow-ruled' | 'grid' | 'dot-grid' | 'cornell';
  inkColor: string;
  paperColor: string;
  lineColor: string;
  customBackgroundImage: string | null;
  customBackgroundImages: string[];
  customLineOffset: number;
  customLineSpacing: number | null;
  randomness: {
    enabled: boolean;
    spacing: number;
    baseline: number;
    rotation: number;
  };
  textFields?: TextField[];
}

export interface FontOption {
  name: string;
  value: string;
  className: string;
}

export const HANDWRITING_FONTS: FontOption[] = [
  { name: 'Caveat', value: 'caveat', className: 'font-[family-name:var(--font-caveat)]' },
  { name: 'Dancing Script', value: 'dancing-script', className: 'font-[family-name:var(--font-dancing-script)]' },
  { name: 'Indie Flower', value: 'indie-flower', className: 'font-[family-name:var(--font-indie-flower)]' },
  { name: 'Shadows Into Light', value: 'shadows-into-light', className: 'font-[family-name:var(--font-shadows-into-light)]' },
  { name: 'Kalam', value: 'kalam', className: 'font-[family-name:var(--font-kalam)]' },
  { name: 'Patrick Hand', value: 'patrick-hand', className: 'font-[family-name:var(--font-patrick-hand)]' },
  { name: 'Architects Daughter', value: 'architects-daughter', className: 'font-[family-name:var(--font-architects-daughter)]' },
  { name: 'Satisfy', value: 'satisfy', className: 'font-[family-name:var(--font-satisfy)]' },
  { name: 'Homemade Apple', value: 'homemade-apple', className: 'font-[family-name:var(--font-homemade-apple)]' },
  { name: 'Barokah Signature', value: 'barokah-signature', className: 'font-[family-name:var(--font-barokah-signature)]' },
  { name: 'Bettina Signature', value: 'bettina-signature', className: 'font-[family-name:var(--font-bettina-signature)]' },
  { name: 'Children', value: 'children', className: 'font-[family-name:var(--font-children)]' },
  { name: 'Davys Crappy Writ', value: 'davys-crappy-writ', className: 'font-[family-name:var(--font-davys-crappy-writ)]' },
  { name: 'FF Comma', value: 'ff-comma', className: 'font-[family-name:var(--font-ff-comma)]' },
  { name: 'Fallin For You', value: 'fallin-for-you', className: 'font-[family-name:var(--font-fallin-for-you)]' },
  { name: 'Famulred', value: 'famulred', className: 'font-[family-name:var(--font-famulred)]' },
  { name: 'Gargouillette', value: 'gargouillette', className: 'font-[family-name:var(--font-gargouillette)]' },
  { name: 'Honey Script', value: 'honey-script', className: 'font-[family-name:var(--font-honey-script)]' },
  { name: 'Kalam Light', value: 'kalam-light', className: 'font-[family-name:var(--font-kalam-light)]' },
  { name: 'Megastina', value: 'megastina', className: 'font-[family-name:var(--font-megastina)]' },
  { name: 'Pecita', value: 'pecita', className: 'font-[family-name:var(--font-pecita)]' },
  { name: 'Quetine', value: 'quetine', className: 'font-[family-name:var(--font-quetine)]' },
  { name: 'Reenie Beanie', value: 'reenie-beanie', className: 'font-[family-name:var(--font-reenie-beanie)]' },
  { name: 'Sea Ponkle', value: 'sea-ponkle', className: 'font-[family-name:var(--font-sea-ponkle)]' },
  { name: 'Showclick', value: 'showclick', className: 'font-[family-name:var(--font-showclick)]' },
  { name: 'Singlong', value: 'singlong', className: 'font-[family-name:var(--font-singlong)]' },
  { name: 'Snake', value: 'snake', className: 'font-[family-name:var(--font-snake)]' },
  { name: 'Vanilla Cream', value: 'vanilla-cream', className: 'font-[family-name:var(--font-vanilla-cream)]' },
  { name: 'Vegan Days', value: 'vegan-days', className: 'font-[family-name:var(--font-vegan-days)]' },
  { name: 'Rainydays', value: 'rainydays', className: 'font-[family-name:var(--font-rainydays)]' },
  { name: 'Custom Font', value: 'custom', className: '' },
];

export const DEFAULT_SETTINGS: HandwritingSettings = {
  fontFamily: 'caveat',
  customFont: null,
  fontSize: 24,
  lineHeight: 1.8,
  lineTilt: 0,
  marginTop: 60,
  marginBottom: 60,
  marginLeft: 60,
  marginRight: 60,
  paperPresetId: 'lined-letter-portrait',
  paperFormat: 'letter',
  paperOrientation: 'portrait',
  ruledMarginLineOffset: -10,
  paperStyle: 'lined',
  inkColor: '#1a365d',
  paperColor: '#fffef5',
  lineColor: '#a8d4f0',
  customBackgroundImage: null,
  customBackgroundImages: [],
  customLineOffset: 0,
  customLineSpacing: null,
  randomness: {
    enabled: true,
    spacing: 2,
    baseline: 1,
    rotation: 0.5,
  },
  textFields: [],
};

export const defaultPageSettingsFromHandwritingSettings = (
  settings: HandwritingSettings
): PageSettings => ({
  fontSize: settings.fontSize,
  lineTilt: settings.lineTilt,
  marginTop: settings.marginTop,
  marginBottom: settings.marginBottom,
  marginLeft: settings.marginLeft,
  marginRight: settings.marginRight,
  paperColor: settings.paperColor,
  customBackgroundImage: settings.customBackgroundImage,
  customLineOffset: settings.customLineOffset,
  customLineSpacing: settings.customLineSpacing,
  inkColor: settings.inkColor,
  lineColor: settings.lineColor,
  paperStyle: settings.paperStyle,
  textFields: settings.textFields || [],
});


export const PAPER_STYLES = [
  { name: 'Blank', value: 'blank' },
  { name: 'Lined (Medium)', value: 'lined' },
  { name: 'Wide Lined', value: 'wide-lined' },
  { name: 'Narrow Lined', value: 'narrow-lined' },
  { name: 'Ruled (Medium)', value: 'ruled' },
  { name: 'Wide Ruled', value: 'wide-ruled' },
  { name: 'Narrow Ruled', value: 'narrow-ruled' },
  { name: 'Grid', value: 'grid' },
  { name: 'Dot Grid', value: 'dot-grid' },
  { name: 'Cornell', value: 'cornell' },
] as const;

export const PAPER_FORMATS = [
  { name: 'Letter', value: 'letter' },
  { name: 'A4', value: 'a4' },
  { name: 'A3', value: 'a3' },
] as const;

export const PAPER_ORIENTATIONS = [
  { name: 'Portrait', value: 'portrait' },
  { name: 'Landscape', value: 'landscape' },
] as const;

export const PAPER_COLORS = [
  { name: 'Cream', value: '#fffef5' },
  { name: 'White', value: '#ffffff' },
  { name: 'Aged', value: '#f5f0e1' },
  { name: 'Light Blue', value: '#f0f7ff' },
  { name: 'Light Yellow', value: '#fffde7' },
  { name: 'Light Green', value: '#f0fff4' },
];

export type LineData = {
  text: string;
  lineIndex: number;
  hasNewline: boolean;
};

export type EditorMode = 'write';
