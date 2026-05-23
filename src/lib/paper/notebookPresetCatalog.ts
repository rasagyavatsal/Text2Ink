import type { PaperFormat, PaperOrientation, PaperStyle } from '@/lib/types';
import notebookPresetManifest from '../../../public/paper-presets/manifest.json';

export interface NotebookPaperBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface NotebookPaperContentArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface NotebookPaperAlignmentMetadata {
  writingMargins: NotebookPaperBox;
  firstBaselineOffset: number;
  lineSpacing: number;
  gridSpacing: number | null;
  ruledMarginPosition: number | null;
  safeCrop: NotebookPaperBox;
  contentArea: NotebookPaperContentArea;
}

export interface NotebookPaperPreset {
  id: string;
  style: 'lined' | 'wide-lined' | 'narrow-lined' | 'ruled' | 'wide-ruled' | 'narrow-ruled' | 'grid' | 'dot-grid' | 'cornell';
  format: PaperFormat;
  orientation: PaperOrientation;
  pageSize: {
    width: number;
    height: number;
  };
  assetPath: string;
  alignment: NotebookPaperAlignmentMetadata;
}

export const NOTEBOOK_PAPER_PRESETS = notebookPresetManifest as NotebookPaperPreset[];

export type PresetBackedPaperStyle = Extract<PaperStyle, 'lined' | 'wide-lined' | 'narrow-lined' | 'ruled' | 'wide-ruled' | 'narrow-ruled' | 'grid' | 'dot-grid' | 'cornell'>;

const PRESET_BACKED_PAPER_STYLES = new Set<PresetBackedPaperStyle>(['lined', 'wide-lined', 'narrow-lined', 'ruled', 'wide-ruled', 'narrow-ruled', 'grid', 'dot-grid', 'cornell']);
const NOTEBOOK_PAPER_PRESET_BY_ID = new Map(
  NOTEBOOK_PAPER_PRESETS.map((preset) => [preset.id.toLowerCase(), preset] as const),
);
const NOTEBOOK_PAPER_PRESET_BY_KEY = new Map(
  NOTEBOOK_PAPER_PRESETS.map((preset) => [
    notebookPaperPresetKey(preset.style, preset.format, preset.orientation),
    preset,
  ] as const),
);

export function isPresetBackedPaperStyle(
  value: PaperStyle,
): value is PresetBackedPaperStyle {
  return PRESET_BACKED_PAPER_STYLES.has(value as PresetBackedPaperStyle);
}

export function resolveNotebookPaperPresetById(value: unknown): NotebookPaperPreset | null {
  const presetId = normalizePresetId(value);
  return presetId ? NOTEBOOK_PAPER_PRESET_BY_ID.get(presetId) ?? null : null;
}

export function resolveNotebookPaperPreset(input: {
  style: PaperStyle;
  format: PaperFormat;
  orientation: PaperOrientation;
}): NotebookPaperPreset | null {
  if (!isPresetBackedPaperStyle(input.style)) {
    return null;
  }

  return NOTEBOOK_PAPER_PRESET_BY_KEY.get(
    notebookPaperPresetKey(input.style, input.format, input.orientation),
  ) ?? null;
}

export function resolveNotebookPaperPresetId(input: {
  style: PaperStyle;
  format: PaperFormat;
  orientation: PaperOrientation;
}): string | null {
  return resolveNotebookPaperPreset(input)?.id ?? null;
}

function notebookPaperPresetKey(
  style: PresetBackedPaperStyle,
  format: PaperFormat,
  orientation: PaperOrientation,
): string {
  return `${style}:${format}:${orientation}`;
}

function normalizePresetId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null;
}
