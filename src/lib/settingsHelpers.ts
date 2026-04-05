import { LineDetectionResult } from './lineDetection';
import { PageSettings } from './types';

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
  result: LineDetectionResult
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

