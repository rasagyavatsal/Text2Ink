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
  paperStyle: 'blank' | 'lined' | 'ruled' | 'grid';
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
  ruledMarginLineOffset: number;
  paperStyle: 'blank' | 'lined' | 'ruled' | 'grid';
  inkColor: string;
  paperColor: string;
  lineColor: string;
  customBackgroundImage: string | null;
  customBackgroundImages: string[];
  customLineOffset: number;
  customLineSpacing: number | null;
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
  ruledMarginLineOffset: -10,
  paperStyle: 'lined',
  inkColor: '#1a365d',
  paperColor: '#fffef5',
  lineColor: '#a8d4f0',
  customBackgroundImage: null,
  customBackgroundImages: [],
  customLineOffset: 0,
  customLineSpacing: null,
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
  { name: 'Lined', value: 'lined' },
  { name: 'Ruled', value: 'ruled' },
  { name: 'Grid', value: 'grid' },
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
