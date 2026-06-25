export type PaperFormat = 'letter' | 'a4' | 'a3';
export type PaperOrientation = 'portrait' | 'landscape';
export type PaperStyle =
  | 'blank'
  | 'lined'
  | 'wide-lined'
  | 'narrow-lined'
  | 'ruled'
  | 'wide-ruled'
  | 'narrow-ruled'
  | 'grid'
  | 'dot-grid'
  | 'cornell';

export type DocumentPaperSelection =
  | {
      kind: 'preset';
      presetId: string;
    }
  | {
      kind: 'generated';
      style: PaperStyle;
      format: PaperFormat;
      orientation: PaperOrientation;
    };

export type PagePaperSelection =
  | {
      kind: 'inherit';
    };

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
  paper: PagePaperSelection;
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
  paper: DocumentPaperSelection;
  ruledMarginLineOffset: number;
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
  cssFontFamily: string;
}

export const HANDWRITING_FONTS: FontOption[] = [
  { name: 'Caveat', value: 'caveat', className: 'font-[family-name:var(--font-caveat)]', cssFontFamily: "'Caveat', cursive" },
  { name: 'Dancing Script', value: 'dancing-script', className: 'font-[family-name:var(--font-dancing-script)]', cssFontFamily: "'Dancing Script', cursive" },
  { name: 'Indie Flower', value: 'indie-flower', className: 'font-[family-name:var(--font-indie-flower)]', cssFontFamily: "'Indie Flower', cursive" },
  { name: 'Shadows Into Light', value: 'shadows-into-light', className: 'font-[family-name:var(--font-shadows-into-light)]', cssFontFamily: "'Shadows Into Light', cursive" },
  { name: 'Kalam', value: 'kalam', className: 'font-[family-name:var(--font-kalam)]', cssFontFamily: "'Kalam', cursive" },
  { name: 'Patrick Hand', value: 'patrick-hand', className: 'font-[family-name:var(--font-patrick-hand)]', cssFontFamily: "'Patrick Hand', cursive" },
  { name: 'Architects Daughter', value: 'architects-daughter', className: 'font-[family-name:var(--font-architects-daughter)]', cssFontFamily: "'Architects Daughter', cursive" },
  { name: 'Satisfy', value: 'satisfy', className: 'font-[family-name:var(--font-satisfy)]', cssFontFamily: "'Satisfy', cursive" },
  { name: 'Homemade Apple', value: 'homemade-apple', className: 'font-[family-name:var(--font-homemade-apple)]', cssFontFamily: "'Homemade Apple', cursive" },
  { name: 'Barokah Signature', value: 'barokah-signature', className: 'font-[family-name:var(--font-barokah-signature)]', cssFontFamily: "'Barokah Signature', cursive" },
  { name: 'Bettina Signature', value: 'bettina-signature', className: 'font-[family-name:var(--font-bettina-signature)]', cssFontFamily: "'Bettina Signature', cursive" },
  { name: 'Children', value: 'children', className: 'font-[family-name:var(--font-children)]', cssFontFamily: "'Children', cursive" },
  { name: 'Davys Crappy Writ', value: 'davys-crappy-writ', className: 'font-[family-name:var(--font-davys-crappy-writ)]', cssFontFamily: "'DavysCrappyWrit', cursive" },
  { name: 'FF Comma', value: 'ff-comma', className: 'font-[family-name:var(--font-ff-comma)]', cssFontFamily: "'FFCommaTrial', cursive" },
  { name: 'Fallin For You', value: 'fallin-for-you', className: 'font-[family-name:var(--font-fallin-for-you)]', cssFontFamily: "'Fallin For You Script', cursive" },
  { name: 'Famulred', value: 'famulred', className: 'font-[family-name:var(--font-famulred)]', cssFontFamily: "'Famulred', cursive" },
  { name: 'Gargouillette', value: 'gargouillette', className: 'font-[family-name:var(--font-gargouillette)]', cssFontFamily: "'Gargouillette', cursive" },
  { name: 'Honey Script', value: 'honey-script', className: 'font-[family-name:var(--font-honey-script)]', cssFontFamily: "'HoneyScript', cursive" },
  { name: 'Kalam Light', value: 'kalam-light', className: 'font-[family-name:var(--font-kalam-light)]', cssFontFamily: "'Kalam Light', cursive" },
  { name: 'Megastina', value: 'megastina', className: 'font-[family-name:var(--font-megastina)]', cssFontFamily: "'Megastina', cursive" },
  { name: 'Pecita', value: 'pecita', className: 'font-[family-name:var(--font-pecita)]', cssFontFamily: "'Pecita', cursive" },
  { name: 'Quetine', value: 'quetine', className: 'font-[family-name:var(--font-quetine)]', cssFontFamily: "'Quetine', cursive" },
  { name: 'Reenie Beanie', value: 'reenie-beanie', className: 'font-[family-name:var(--font-reenie-beanie)]', cssFontFamily: "'ReenieBeanie', cursive" },
  { name: 'Sea Ponkle', value: 'sea-ponkle', className: 'font-[family-name:var(--font-sea-ponkle)]', cssFontFamily: "'SeaPonkle', cursive" },
  { name: 'Showclick', value: 'showclick', className: 'font-[family-name:var(--font-showclick)]', cssFontFamily: "'Showclick', cursive" },
  { name: 'Singlong', value: 'singlong', className: 'font-[family-name:var(--font-singlong)]', cssFontFamily: "'Singlong', cursive" },
  { name: 'Snake', value: 'snake', className: 'font-[family-name:var(--font-snake)]', cssFontFamily: "'Snake', cursive" },
  { name: 'Vanilla Cream', value: 'vanilla-cream', className: 'font-[family-name:var(--font-vanilla-cream)]', cssFontFamily: "'VanillaCream', cursive" },
  { name: 'Vegan Days', value: 'vegan-days', className: 'font-[family-name:var(--font-vegan-days)]', cssFontFamily: "'Vegan Days', cursive" },
  { name: 'Rainydays', value: 'rainydays', className: 'font-[family-name:var(--font-rainydays)]', cssFontFamily: "'Rainydays', cursive" },
  { name: 'Custom Font', value: 'custom', className: '', cssFontFamily: '' },
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
  paper: {
    kind: 'preset',
    presetId: 'lined-letter-portrait',
  },
  ruledMarginLineOffset: -10,
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
  paper: { kind: 'inherit' },
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
