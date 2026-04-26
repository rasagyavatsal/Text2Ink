import { LineDetectionResult } from './lineDetection';
import { DEFAULT_SETTINGS, PageSettings, HandwritingSettings } from './types';
import { pageFormatById, paperTemplateById, paperTemplateIdForLegacyStyle } from './pageLayout';

export function validateFontFile(file: File): { format: 'truetype' | 'opentype' | null; error: string | null } {
  const lowerName = file.name.toLowerCase();
  const format = lowerName.endsWith('.ttf')
    ? ('truetype' as const)
    : lowerName.endsWith('.otf')
      ? ('opentype' as const)
      : null;

  if (!format) {
    return { format: null, error: 'Please upload a .ttf or .otf font file.' };
  }
  return { format, error: null };
}

export function generateFontFamilyName(fileName: string): string {
  const safeBase = fileName
    .replace(/\.(ttf|otf)$/i, '')
    .replace(/[^a-z0-9_-]/gi, '')
    .slice(0, 30);
  return `Text2InkCustom-${safeBase || 'Font'}-${Date.now()}`;
}

export function processLineDetectionResult(
  result: LineDetectionResult,
  _pageSettings: PageSettings,
  _settings: HandwritingSettings
): { offset: number; spacing: number } {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const detectedOffset = Math.round(result.lineOffset);
  const detectedSpacing = Math.round(result.lineSpacing);
  const clampedOffset = clamp(detectedOffset, -50, 50);
  const clampedSpacing = clamp(detectedSpacing, 20, 120);

  return { offset: clampedOffset, spacing: clampedSpacing };
}

export async function readFilesAsDataURL(files: File[]): Promise<string[]> {
  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.readAsDataURL(file);
    });

  return Promise.all(files.map(readAsDataURL));
}

export function applyPageSettingsToAll(
  prev: PageSettings[],
  sourceIndex: number,
  totalPages: number,
  defaultSettings: PageSettings
): PageSettings[] {
  const desiredLength = Math.max(totalPages, 1);
  const next = [...prev];

  while (next.length < desiredLength) {
    next.push({ ...defaultSettings });
  }

  const source = next[sourceIndex] ?? defaultSettings;

  return next.slice(0, desiredLength).map((page) => ({
    ...source,
    // Keep target page's text fields instead of copying from source
    textFields: page.textFields || []
  }));
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCustomFont = (value: unknown): value is HandwritingSettings['customFont'] => {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.family === 'string' &&
    typeof value.dataUrl === 'string' &&
    (value.format === 'truetype' || value.format === 'opentype')
  );
};

const isPaperStyle = (value: unknown): value is HandwritingSettings['paperStyle'] =>
  value === 'blank' || value === 'lined' || value === 'ruled' || value === 'grid';

const isPageOrientation = (value: unknown): value is HandwritingSettings['pageOrientation'] =>
  value === 'portrait' || value === 'landscape';

const isTextFields = (value: unknown): value is NonNullable<HandwritingSettings['textFields']> =>
  Array.isArray(value) &&
  value.every(
    (field) =>
      isRecord(field) &&
      typeof field.id === 'string' &&
      typeof field.text === 'string' &&
      typeof field.x === 'number' &&
      typeof field.y === 'number' &&
      typeof field.width === 'number' &&
      typeof field.height === 'number' &&
      typeof field.color === 'string' &&
      typeof field.fontSize === 'number'
  );

export function normalizeHandwritingSettings(persistedUnknown: unknown): HandwritingSettings {
  const next: HandwritingSettings = { ...DEFAULT_SETTINGS };
  if (!isRecord(persistedUnknown)) return next;

  const stringKeys = [
    'fontFamily',
    'inkColor',
    'paperColor',
    'lineColor',
    'customBackgroundImage',
  ] as const;
  for (const key of stringKeys) {
    const value = persistedUnknown[key];
    if (typeof value === 'string' || value === null) {
      next[key] = value as never;
    }
  }

  const numberKeys = [
    'fontSize',
    'lineHeight',
    'lineTilt',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'ruledMarginLineOffset',
    'customLineOffset',
    'customLineSpacing',
  ] as const;
  for (const key of numberKeys) {
    const value = persistedUnknown[key];
    if (typeof value === 'number' || value === null) {
      next[key] = value as never;
    }
  }

  if (isCustomFont(persistedUnknown.customFont)) {
    next.customFont = persistedUnknown.customFont;
  }

  if (Array.isArray(persistedUnknown.customBackgroundImages)) {
    next.customBackgroundImages = persistedUnknown.customBackgroundImages.filter(
      (item): item is string => typeof item === 'string'
    );
  }

  if (isPaperStyle(persistedUnknown.paperStyle)) {
    next.paperStyle = persistedUnknown.paperStyle;
  }

  if (typeof persistedUnknown.pageFormatId === 'string') {
    next.pageFormatId = pageFormatById(persistedUnknown.pageFormatId as HandwritingSettings['pageFormatId']).id;
  }

  if (isPageOrientation(persistedUnknown.pageOrientation)) {
    next.pageOrientation = persistedUnknown.pageOrientation;
  }

  if (typeof persistedUnknown.paperTemplateId === 'string') {
    next.paperTemplateId = paperTemplateById(persistedUnknown.paperTemplateId as HandwritingSettings['paperTemplateId']).id;
  } else if (isPaperStyle(persistedUnknown.paperStyle)) {
    next.paperTemplateId = paperTemplateIdForLegacyStyle(persistedUnknown.paperStyle);
  }

  if (isTextFields(persistedUnknown.textFields)) {
    next.textFields = persistedUnknown.textFields.map((field) => ({ ...field }));
  }

  return next;
}
