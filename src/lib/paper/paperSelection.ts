import {
  DEFAULT_SETTINGS,
  type DocumentPaperSelection,
  type PagePaperSelection,
  type PaperFormat,
  type PaperOrientation,
  type PaperStyle,
} from '@/lib/types';
import {
  resolveNotebookPaperPresetById,
  resolveNotebookPaperPresetId,
} from './notebookPresetCatalog';

const PAPER_STYLES = new Set<PaperStyle>([
  'blank',
  'lined',
  'wide-lined',
  'narrow-lined',
  'ruled',
  'wide-ruled',
  'narrow-ruled',
  'grid',
  'dot-grid',
  'cornell',
]);
const PAPER_FORMATS = new Set<PaperFormat>(['letter', 'a4', 'a3']);
const PAPER_ORIENTATIONS = new Set<PaperOrientation>(['portrait', 'landscape']);
export const DEFAULT_GENERATED_PAPER_SELECTION =
  DEFAULT_SETTINGS.paper.kind === 'generated'
    ? DEFAULT_SETTINGS.paper
    : ({
        kind: 'generated',
        style: 'lined',
        format: 'letter',
        orientation: 'portrait',
      } satisfies DocumentPaperSelection);

export function isPaperStyle(value: unknown): value is PaperStyle {
  return typeof value === 'string' && PAPER_STYLES.has(value as PaperStyle);
}

export function isPaperFormat(value: unknown): value is PaperFormat {
  return typeof value === 'string' && PAPER_FORMATS.has(value as PaperFormat);
}

export function isPaperOrientation(value: unknown): value is PaperOrientation {
  return typeof value === 'string' && PAPER_ORIENTATIONS.has(value as PaperOrientation);
}

export function isDocumentPaperSelection(value: unknown): value is DocumentPaperSelection {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.kind === 'preset') {
    return typeof candidate.presetId === 'string' && candidate.presetId.trim().length > 0;
  }

  if (candidate.kind === 'generated') {
    return isPaperStyle(candidate.style)
      && isPaperFormat(candidate.format)
      && isPaperOrientation(candidate.orientation);
  }

  return false;
}

export function createDocumentPaperSelection(input: {
  style: PaperStyle;
  format: PaperFormat;
  orientation: PaperOrientation;
}): DocumentPaperSelection {
  const presetId = resolveNotebookPaperPresetId(input);
  if (presetId) {
    return {
      kind: 'preset',
      presetId,
    };
  }

  return {
    kind: 'generated',
    style: input.style,
    format: input.format,
    orientation: input.orientation,
  };
}

export function updateDocumentPaperSelection(
  selection: DocumentPaperSelection,
  patch: Partial<{
    style: PaperStyle;
    format: PaperFormat;
    orientation: PaperOrientation;
  }>,
): DocumentPaperSelection {
  return createDocumentPaperSelection({
    style: patch.style ?? resolveDocumentPaperStyle(selection),
    format: patch.format ?? resolveDocumentPaperFormat(selection),
    orientation: patch.orientation ?? resolveDocumentPaperOrientation(selection),
  });
}

export function resolveDocumentPaperPresetId(selection: DocumentPaperSelection): string | null {
  if (selection.kind !== 'preset') {
    return null;
  }

  return resolveNotebookPaperPresetById(selection.presetId)?.id ?? selection.presetId;
}

export function resolveDocumentPaperStyle(selection: DocumentPaperSelection): PaperStyle {
  if (selection.kind === 'generated') {
    return selection.style;
  }

  return resolveNotebookPaperPresetById(selection.presetId)?.style ?? DEFAULT_GENERATED_PAPER_SELECTION.style;
}

export function resolveDocumentPaperFormat(selection: DocumentPaperSelection): PaperFormat {
  if (selection.kind === 'generated') {
    return selection.format;
  }

  return resolveNotebookPaperPresetById(selection.presetId)?.format ?? DEFAULT_GENERATED_PAPER_SELECTION.format;
}

export function resolveDocumentPaperOrientation(selection: DocumentPaperSelection): PaperOrientation {
  if (selection.kind === 'generated') {
    return selection.orientation;
  }

  return resolveNotebookPaperPresetById(selection.presetId)?.orientation ?? DEFAULT_GENERATED_PAPER_SELECTION.orientation;
}

function resolveValidModernSelection(paper: unknown): DocumentPaperSelection | null {
  if (isDocumentPaperSelection(paper)) {
    if (paper.kind === 'preset') {
      const normalizedPresetId = resolveNotebookPaperPresetById(paper.presetId)?.id;
      if (normalizedPresetId) {
        return {
          kind: 'preset',
          presetId: normalizedPresetId,
        };
      }
    } else {
      return paper;
    }
  }
  return null;
}

function detectLegacyFields(input: {
  paperPresetId?: unknown;
  paperStyle?: unknown;
  paperFormat?: unknown;
  paperOrientation?: unknown;
  pagePaperStyle?: unknown;
}): boolean {
  return (
    hasExplicitValue(input.paperPresetId) ||
    hasExplicitValue(input.paperStyle) ||
    hasExplicitValue(input.pagePaperStyle) ||
    hasExplicitValue(input.paperFormat) ||
    hasExplicitValue(input.paperOrientation)
  );
}

function normalizeLegacyStyleFormatOrientation(input: {
  paperStyle?: unknown;
  paperFormat?: unknown;
  paperOrientation?: unknown;
  pagePaperStyle?: unknown;
}) {
  const getLegacyStyle = () => {
    if (isPaperStyle(input.paperStyle)) return input.paperStyle;
    if (isPaperStyle(input.pagePaperStyle)) return input.pagePaperStyle;
    return DEFAULT_GENERATED_PAPER_SELECTION.style;
  };
  const legacyStyle = getLegacyStyle();
  const legacyFormat = isPaperFormat(input.paperFormat)
    ? input.paperFormat
    : DEFAULT_GENERATED_PAPER_SELECTION.format;
  const legacyOrientation = isPaperOrientation(input.paperOrientation)
    ? input.paperOrientation
    : DEFAULT_GENERATED_PAPER_SELECTION.orientation;
  return { legacyStyle, legacyFormat, legacyOrientation };
}

export function normalizeDocumentPaperSelection(input: {
  paper?: unknown;
  paperPresetId?: unknown;
  paperStyle?: unknown;
  paperFormat?: unknown;
  paperOrientation?: unknown;
  pagePaperStyle?: unknown;
  defaultWhenMissing?: DocumentPaperSelection;
}): {
  selection: DocumentPaperSelection;
  incompatible: boolean;
} {
  const modern = resolveValidModernSelection(input.paper);
  if (modern) {
    return { selection: modern, incompatible: false };
  }

  const hasLegacySelectionFields = detectLegacyFields(input);
  const { legacyStyle, legacyFormat, legacyOrientation } = normalizeLegacyStyleFormatOrientation(input);
  const explicitLegacyPreset = resolveNotebookPaperPresetById(input.paperPresetId);
  const incompatible =
    (input.paper !== undefined && !isDocumentPaperSelection(input.paper)) ||
    (hasExplicitValue(input.paperStyle) && !isPaperStyle(input.paperStyle)) ||
    (hasExplicitValue(input.pagePaperStyle) && !isPaperStyle(input.pagePaperStyle)) ||
    (hasExplicitValue(input.paperFormat) && !isPaperFormat(input.paperFormat)) ||
    (hasExplicitValue(input.paperOrientation) && !isPaperOrientation(input.paperOrientation));

  if (explicitLegacyPreset) {
    return {
      selection: {
        kind: 'preset',
        presetId: explicitLegacyPreset.id,
      },
      incompatible,
    };
  }

  if (!hasLegacySelectionFields) {
    return {
      selection: input.defaultWhenMissing ?? DEFAULT_GENERATED_PAPER_SELECTION,
      incompatible,
    };
  }

  if (incompatible) {
    return {
      selection: {
        kind: 'generated',
        style: legacyStyle,
        format: legacyFormat,
        orientation: legacyOrientation,
      },
      incompatible,
    };
  }

  return {
    selection: createDocumentPaperSelection({
      style: legacyStyle,
      format: legacyFormat,
      orientation: legacyOrientation,
    }),
    incompatible,
  };
}

export function normalizePagePaperSelection(value: unknown): PagePaperSelection {
  if (value && typeof value === 'object' && (value as Record<string, unknown>).kind === 'inherit') {
    return { kind: 'inherit' };
  }

  return { kind: 'inherit' };
}

function hasExplicitValue(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim().length === 0);
}
