import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import {
  DEFAULT_SETTINGS,
  type HandwritingSettings,
  type PaperFormat,
  type PaperOrientation,
  type PageSettings,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { buildBuiltinNotebookPaperDataUrl } from './builtinNotebookSvg';
import {
  NOTEBOOK_PAPER_PRESETS,
  type NotebookPaperAlignmentMetadata,
  type NotebookPaperPreset,
  resolveNotebookPaperPreset,
  resolveNotebookPaperPresetById,
} from './notebookPresetCatalog';

type PaperStyle = HandwritingSettings['paperStyle'];

type RawDocumentPaperSettings = Partial<
  Pick<
    HandwritingSettings,
    | 'customBackgroundImage'
    | 'customBackgroundImages'
    | 'lineColor'
    | 'lineHeight'
    | 'paperColor'
    | 'paperPresetId'
    | 'paperStyle'
    | 'paperFormat'
    | 'paperOrientation'
    | 'ruledMarginLineOffset'
  >
>;

type RawPagePaperSettings = Partial<
  Pick<
    PageSettings,
    | 'customBackgroundImage'
    | 'customLineOffset'
    | 'customLineSpacing'
    | 'fontSize'
    | 'lineColor'
    | 'marginBottom'
    | 'marginLeft'
    | 'marginRight'
    | 'marginTop'
    | 'paperColor'
    | 'paperStyle'
  >
>;

export interface ResolvePagePaperInput {
  pageIndex: number;
  settings?: RawDocumentPaperSettings;
  pageSettings?: RawPagePaperSettings;
  pageSize?: {
    width?: number;
    height?: number;
  };
}

export type ResolvedPaperBackground =
  | {
      kind: 'solid-color';
      color: string;
    }
  | {
      kind: 'image';
      imageSrc: string;
    };

export type ResolvedPaperGuides =
  | { kind: 'none' }
  | {
      kind: 'lined';
      lineColor: string;
    }
  | {
      kind: 'ruled';
      lineColor: string;
      marginLineX: number;
      marginLineColor: string;
      marginLineWidth: number;
    }
  | {
      kind: 'grid';
      lineColor: string;
      alpha: number;
    }
  | {
      kind: 'dot-grid';
      lineColor: string;
      alpha: number;
    }
  | {
      kind: 'cornell';
      lineColor: string;
      marginLineX: number;
      marginLineColor: string;
      marginLineWidth: number;
    };

export interface ResolvedPaperGeometry {
  pageWidth: number;
  pageHeight: number;
  aspectRatio: number;
  fontSize: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  contentWidth: number;
  contentHeight: number;
  contentBounds: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
  textTop: number;
  textLeft: number;
  textWidth: number;
  lineHeightPx: number;
  lineOffset: number;
}

/**
 * ResolvedPaper is the single paper model callers consume.
 * It hides legacy settings fallback, uploaded background precedence, and
 * writing-area geometry behind one stable contract.
 */
export interface ResolvedPaper {
  variant: 'preset' | 'upload' | 'legacy-fallback';
  style: PaperStyle;
  background: ResolvedPaperBackground;
  guides: ResolvedPaperGuides;
  geometry: ResolvedPaperGeometry;
  preset: ResolvedBuiltinPaperPreset | null;
}

export interface ResolvedBuiltinPaperPreset {
  id: string;
  style: 'lined' | 'ruled' | 'grid' | 'dot-grid' | 'cornell';
  format: PaperFormat;
  orientation: PaperOrientation;
  pageSize: {
    width: number;
    height: number;
  };
  assetPath: string;
  supportedFormats: PaperFormat[];
  supportedOrientations: PaperOrientation[];
  alignment: NotebookPaperAlignmentMetadata;
}

const DEFAULT_PAGE_SETTINGS = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
const PAPER_STYLES = new Set<PaperStyle>(['blank', 'lined', 'ruled', 'grid', 'dot-grid', 'cornell']);
const PAPER_FORMATS = new Set<PaperFormat>(['letter', 'a4', 'a3']);
const PAPER_ORIENTATIONS = new Set<PaperOrientation>(['portrait', 'landscape']);
const PAPER_DIMENSIONS_PT: Record<PaperFormat, { width: number; height: number }> = {
  letter: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },
  a4: {
    width: 595.28,
    height: 841.89,
  },
  a3: {
    width: 841.89,
    height: 1190.55,
  },
};
const RULED_TEXT_INSET_PX = 10;
const RULED_MARGIN_LINE_COLOR = '#f39ca6';
const RULED_MARGIN_LINE_WIDTH = 2.4;
const GRID_GUIDE_ALPHA = 0.5;
const BUILTIN_PRESET_EPSILON = 0.01;
const BUILTIN_PRESET_SUPPORT = buildBuiltinPresetSupport();
const BUILTIN_PRESET_BY_KEY = buildBuiltinPresetLookup();
const BUILTIN_PRESET_BY_ID = buildBuiltinPresetIdLookup();

export function resolvePagePaper(input: ResolvePagePaperInput): ResolvedPaper {
  const settings = input.settings ?? {};
  const pageSettings = input.pageSettings ?? {};
  const backgroundImage = resolveBackgroundImage({
    pageIndex: input.pageIndex,
    settings,
    pageSettings,
  });
  const hasUploadBackground = backgroundImage !== null;
  const explicitBuiltinPreset = !hasUploadBackground
    ? resolveBuiltinPresetById(settings.paperPresetId)
    : null;
  const fontSizeResolution = resolvePositiveNumber(pageSettings.fontSize, DEFAULT_PAGE_SETTINGS.fontSize);
  const paperColorResolution = resolveString(
    pageSettings.paperColor,
    settings.paperColor,
    DEFAULT_SETTINGS.paperColor,
  );
  const lineColorResolution = resolveString(
    pageSettings.lineColor,
    settings.lineColor,
    DEFAULT_SETTINGS.lineColor,
  );

  if (explicitBuiltinPreset) {
    return resolveExplicitBuiltinPresetPaper({
      preset: explicitBuiltinPreset,
      backgroundImage,
      fontSize: fontSizeResolution.value,
      paperColor: paperColorResolution.value,
      lineColor: lineColorResolution.value,
    });
  }

  const paperFormatResolution = resolvePaperFormat(settings.paperFormat, DEFAULT_SETTINGS.paperFormat);
  const paperOrientationResolution = resolvePaperOrientation(
    settings.paperOrientation,
    DEFAULT_SETTINGS.paperOrientation,
  );
  const resolvedPageSize = resolvePaperPageSize(
    paperFormatResolution.value,
    paperOrientationResolution.value,
  );
  const pageWidth = resolvePositiveNumber(input.pageSize?.width, resolvedPageSize.width).value;
  const pageHeight = resolvePositiveNumber(input.pageSize?.height, resolvedPageSize.height).value;
  const styleResolution = resolvePaperStyle(settings.paperStyle, pageSettings.paperStyle);
  const lineHeightResolution = resolvePositiveNumber(settings.lineHeight, DEFAULT_SETTINGS.lineHeight);
  const ruledMarginLineOffsetResolution = resolveFiniteNumber(
    settings.ruledMarginLineOffset,
    DEFAULT_SETTINGS.ruledMarginLineOffset,
  );
  const marginTopResolution = resolveFiniteNumber(pageSettings.marginTop, DEFAULT_PAGE_SETTINGS.marginTop);
  const marginRightResolution = resolveFiniteNumber(pageSettings.marginRight, DEFAULT_PAGE_SETTINGS.marginRight);
  const marginBottomResolution = resolveFiniteNumber(pageSettings.marginBottom, DEFAULT_PAGE_SETTINGS.marginBottom);
  const marginLeftResolution = resolveFiniteNumber(pageSettings.marginLeft, DEFAULT_PAGE_SETTINGS.marginLeft);
  const customLineOffsetResolution = resolveFiniteNumber(
    pageSettings.customLineOffset,
    DEFAULT_PAGE_SETTINGS.customLineOffset,
  );
  const customLineSpacingResolution = resolveNullablePositiveNumber(
    pageSettings.customLineSpacing,
    DEFAULT_PAGE_SETTINGS.customLineSpacing,
  );
  const style = styleResolution.value;
  const margins = {
    top: marginTopResolution.value,
    right: marginRightResolution.value,
    bottom: marginBottomResolution.value,
    left: marginLeftResolution.value,
  };
  const contentWidth = Math.max(0, pageWidth - margins.left - margins.right);
  const contentHeight = Math.max(0, pageHeight - margins.top - margins.bottom);
  const contentBounds = {
    top: margins.top,
    right: pageWidth - margins.right,
    bottom: pageHeight - margins.bottom,
    left: margins.left,
    width: contentWidth,
    height: contentHeight,
  };
  const lineHeightPx =
    hasUploadBackground && customLineSpacingResolution.value !== null
      ? customLineSpacingResolution.value
      : fontSizeResolution.value * lineHeightResolution.value;
  const lineOffset = hasUploadBackground ? customLineOffsetResolution.value : 0;
  const textLeft =
    style === 'ruled' && !hasUploadBackground
      ? margins.left + ruledMarginLineOffsetResolution.value + RULED_TEXT_INSET_PX
      : margins.left;
  const textTop = margins.top + lineOffset;
  const textWidth = Math.max(0, pageWidth - textLeft - margins.right);

  const usedCompatibilityFallback =
    paperFormatResolution.incompatible
    || paperOrientationResolution.incompatible
    || styleResolution.incompatible
    || lineHeightResolution.incompatible
    || ruledMarginLineOffsetResolution.incompatible
    || fontSizeResolution.incompatible
    || marginTopResolution.incompatible
    || marginRightResolution.incompatible
    || marginBottomResolution.incompatible
    || marginLeftResolution.incompatible
    || paperColorResolution.incompatible
    || lineColorResolution.incompatible
    || customLineOffsetResolution.incompatible
    || customLineSpacingResolution.incompatible;
  // Prefer the new preset id when it exists, otherwise deterministically
  // map legacy built-in settings into the preset catalog inside PaperEngine.
  const candidateBuiltinPreset = !hasUploadBackground
    ? explicitBuiltinPreset
      ?? resolveBuiltinPreset({
        style,
        paperFormat: paperFormatResolution.value,
        paperOrientation: paperOrientationResolution.value,
      })
    : null;
  const builtinPreset = isCompatibleBuiltinPreset({
    candidatePreset: candidateBuiltinPreset,
    usedCompatibilityFallback,
    style,
    pageWidth,
    pageHeight,
    paperColor: paperColorResolution.value,
    lineColor: lineColorResolution.value,
    margins,
    textTop,
    textLeft,
    lineHeightPx,
  })
    ? candidateBuiltinPreset
    : null;

  const presetBackground = !hasUploadBackground
    ? resolveBuiltinPresetBackground({
        builtinPreset,
        style,
        pageWidth,
        pageHeight,
        paperColor: paperColorResolution.value,
        lineColor: lineColorResolution.value,
        margins,
        textTop,
        lineHeightPx,
        ruledMarginLineOffset: ruledMarginLineOffsetResolution.value,
      })
    : null;

  return {
    variant: hasUploadBackground
      ? 'upload'
      : (builtinPreset || (style === 'blank' && !usedCompatibilityFallback))
        ? 'preset'
        : (usedCompatibilityFallback || style !== 'blank')
        ? 'legacy-fallback'
        : 'preset',
    style,
    background: hasUploadBackground
      ? {
          kind: 'image',
          imageSrc: backgroundImage,
        }
      : presetBackground ?? {
          kind: 'solid-color',
          color: paperColorResolution.value,
        },
    guides: presetBackground
      ? { kind: 'none' }
      : resolveGuides({
      hasUploadBackground,
      style,
      lineColor: lineColorResolution.value,
      marginLeft: margins.left,
      ruledMarginLineOffset: ruledMarginLineOffsetResolution.value,
      }),
    geometry: {
      pageWidth,
      pageHeight,
      aspectRatio: pageWidth / pageHeight,
      fontSize: fontSizeResolution.value,
      margins,
      contentWidth,
      contentHeight,
      contentBounds,
      textTop,
      textLeft,
      textWidth,
      lineHeightPx,
      lineOffset,
    },
    preset: builtinPreset,
  };
}

function resolveExplicitBuiltinPresetPaper(input: {
  preset: ResolvedBuiltinPaperPreset;
  backgroundImage: string | null;
  fontSize: number;
  paperColor: string;
  lineColor: string;
}): ResolvedPaper {
  if (input.backgroundImage) {
    throw new Error('Explicit built-in presets should not be resolved through upload backgrounds.');
  }

  const margins = input.preset.alignment.writingMargins;
  const contentBounds = input.preset.alignment.contentArea;
  const textTop = input.preset.alignment.firstBaselineOffset;
  const textLeft = input.preset.style === 'ruled'
    ? (input.preset.alignment.ruledMarginPosition ?? contentBounds.left) + RULED_TEXT_INSET_PX
    : contentBounds.left;

  return {
    variant: 'preset',
    style: input.preset.style,
    background: resolveExplicitBuiltinPresetBackground(input),
    guides: { kind: 'none' },
    geometry: {
      pageWidth: input.preset.pageSize.width,
      pageHeight: input.preset.pageSize.height,
      aspectRatio: input.preset.pageSize.width / input.preset.pageSize.height,
      fontSize: input.fontSize,
      margins: {
        top: margins.top,
        right: margins.right,
        bottom: margins.bottom,
        left: margins.left,
      },
      contentWidth: contentBounds.width,
      contentHeight: contentBounds.height,
      contentBounds: {
        top: contentBounds.top,
        right: contentBounds.right,
        bottom: contentBounds.bottom,
        left: contentBounds.left,
        width: contentBounds.width,
        height: contentBounds.height,
      },
      textTop,
      textLeft,
      textWidth: Math.max(0, contentBounds.right - textLeft),
      lineHeightPx: input.preset.alignment.lineSpacing,
      lineOffset: Math.max(0, textTop - contentBounds.top),
    },
    preset: input.preset,
  };
}

function resolveExplicitBuiltinPresetBackground(input: {
  preset: ResolvedBuiltinPaperPreset;
  paperColor: string;
  lineColor: string;
}): ResolvedPaperBackground {
  if (
    sameString(input.paperColor, DEFAULT_SETTINGS.paperColor)
    && sameString(input.lineColor, DEFAULT_SETTINGS.lineColor)
  ) {
    return {
      kind: 'image',
      imageSrc: input.preset.assetPath,
    };
  }

  return {
    kind: 'image',
    imageSrc: buildBuiltinNotebookPaperDataUrl({
      style: input.preset.style,
      pageWidth: input.preset.pageSize.width,
      pageHeight: input.preset.pageSize.height,
      paperColor: input.paperColor,
      lineColor: input.lineColor,
      margins: input.preset.alignment.writingMargins,
      textTop: input.preset.alignment.firstBaselineOffset,
      lineHeightPx: input.preset.alignment.lineSpacing,
      marginLineX: input.preset.alignment.ruledMarginPosition ?? undefined,
    }),
  };
}

function resolveBuiltinPresetBackground(input: {
  builtinPreset: ResolvedBuiltinPaperPreset | null;
  style: PaperStyle;
  pageWidth: number;
  pageHeight: number;
  paperColor: string;
  lineColor: string;
  margins: ResolvedPaperGeometry['margins'];
  textTop: number;
  lineHeightPx: number;
  ruledMarginLineOffset: number;
}): ResolvedPaperBackground | null {
  if (input.style !== 'lined' && input.style !== 'ruled' && input.style !== 'grid' && input.style !== 'dot-grid' && input.style !== 'cornell') {
    return null;
  }

  if (input.builtinPreset) {
    return {
      kind: 'image',
      imageSrc: input.builtinPreset.assetPath,
    };
  }

  return {
    kind: 'image',
    imageSrc: buildBuiltinNotebookPaperDataUrl({
      style: input.style,
      pageWidth: input.pageWidth,
      pageHeight: input.pageHeight,
      paperColor: input.paperColor,
      lineColor: input.lineColor,
      margins: input.margins,
      textTop: input.textTop,
      lineHeightPx: input.lineHeightPx,
      marginLineX:
        input.style === 'ruled'
          ? input.margins.left + input.ruledMarginLineOffset
          : undefined,
    }),
  };
}

function resolvePaperFormat(
  value: RawDocumentPaperSettings['paperFormat'],
  fallback: PaperFormat,
): { value: PaperFormat; usedFallback: boolean; incompatible: boolean } {
  if (isPaperFormat(value)) {
    return { value, usedFallback: false, incompatible: false };
  }

  return {
    value: fallback,
    usedFallback: true,
    incompatible: hasExplicitValue(value),
  };
}

function resolvePaperOrientation(
  value: RawDocumentPaperSettings['paperOrientation'],
  fallback: PaperOrientation,
): { value: PaperOrientation; usedFallback: boolean; incompatible: boolean } {
  if (isPaperOrientation(value)) {
    return { value, usedFallback: false, incompatible: false };
  }

  return {
    value: fallback,
    usedFallback: true,
    incompatible: hasExplicitValue(value),
  };
}

function resolvePaperStyle(
  documentStyle: RawDocumentPaperSettings['paperStyle'],
  pageStyle: RawPagePaperSettings['paperStyle'],
): { value: PaperStyle; usedFallback: boolean; incompatible: boolean } {
  if (isPaperStyle(documentStyle)) {
    return { value: documentStyle, usedFallback: false, incompatible: false };
  }

  if (isPaperStyle(pageStyle)) {
    return {
      value: pageStyle,
      usedFallback: true,
      incompatible: hasExplicitValue(documentStyle),
    };
  }

  return {
    value: DEFAULT_SETTINGS.paperStyle,
    usedFallback: true,
    incompatible: hasExplicitValue(documentStyle) || hasExplicitValue(pageStyle),
  };
}

function resolvePaperPageSize(
  paperFormat: PaperFormat,
  paperOrientation: PaperOrientation,
): { width: number; height: number } {
  const { width, height } = PAPER_DIMENSIONS_PT[paperFormat];
  if (paperOrientation === 'landscape') {
    return { width: height, height: width };
  }

  return { width, height };
}

function resolveBackgroundImage(input: {
  pageIndex: number;
  settings: RawDocumentPaperSettings;
  pageSettings: RawPagePaperSettings;
}): string | null {
  const pageSpecificBackground = Array.isArray(input.settings.customBackgroundImages)
    ? normalizeString(input.settings.customBackgroundImages[input.pageIndex])
    : null;

  return (
    pageSpecificBackground
    ?? normalizeString(input.pageSettings.customBackgroundImage)
    ?? normalizeString(input.settings.customBackgroundImage)
    ?? null
  );
}

function resolveGuides(input: {
  hasUploadBackground: boolean;
  style: PaperStyle;
  lineColor: string;
  marginLeft: number;
  ruledMarginLineOffset: number;
}): ResolvedPaperGuides {
  if (input.hasUploadBackground || input.style === 'blank') {
    return { kind: 'none' };
  }

  if (input.style === 'lined') {
    return {
      kind: 'lined',
      lineColor: input.lineColor,
    };
  }

  if (input.style === 'ruled') {
    return {
      kind: 'ruled',
      lineColor: input.lineColor,
      marginLineX: input.marginLeft + input.ruledMarginLineOffset,
      marginLineColor: RULED_MARGIN_LINE_COLOR,
      marginLineWidth: RULED_MARGIN_LINE_WIDTH,
    };
  }

  if (input.style === 'cornell') {
    return {
      kind: 'cornell',
      lineColor: input.lineColor,
      marginLineX: input.marginLeft + input.ruledMarginLineOffset,
      marginLineColor: RULED_MARGIN_LINE_COLOR,
      marginLineWidth: RULED_MARGIN_LINE_WIDTH,
    };
  }

  if (input.style === 'dot-grid') {
    return {
      kind: 'dot-grid',
      lineColor: input.lineColor,
      alpha: GRID_GUIDE_ALPHA,
    };
  }

  return {
    kind: 'grid',
    lineColor: input.lineColor,
    alpha: GRID_GUIDE_ALPHA,
  };
}

function resolveFiniteNumber(value: unknown, fallback: number): {
  value: number;
  usedFallback: boolean;
  incompatible: boolean;
} {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, usedFallback: false, incompatible: false };
  }

  return {
    value: fallback,
    usedFallback: true,
    incompatible: hasExplicitValue(value),
  };
}

function resolvePositiveNumber(value: unknown, fallback: number): {
  value: number;
  usedFallback: boolean;
  incompatible: boolean;
} {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return { value, usedFallback: false, incompatible: false };
  }

  return {
    value: fallback,
    usedFallback: true,
    incompatible: hasExplicitValue(value),
  };
}

function resolveNullablePositiveNumber(value: unknown, fallback: number | null): {
  value: number | null;
  usedFallback: boolean;
  incompatible: boolean;
} {
  if (value === null) {
    return { value: null, usedFallback: false, incompatible: false };
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return { value, usedFallback: false, incompatible: false };
  }

  return {
    value: fallback,
    usedFallback: true,
    incompatible: hasExplicitValue(value),
  };
}

function resolveString(
  primary: unknown,
  secondary: unknown,
  fallback: string,
): { value: string; usedFallback: boolean; incompatible: boolean } {
  const primaryValue = normalizeString(primary);
  if (primaryValue) {
    return { value: primaryValue, usedFallback: false, incompatible: false };
  }

  const secondaryValue = normalizeString(secondary);
  if (secondaryValue) {
    return { value: secondaryValue, usedFallback: false, incompatible: false };
  }

  return { value: fallback, usedFallback: true, incompatible: false };
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function hasExplicitValue(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim().length === 0);
}

function isPaperStyle(value: unknown): value is PaperStyle {
  return typeof value === 'string' && PAPER_STYLES.has(value as PaperStyle);
}

function isPaperFormat(value: unknown): value is PaperFormat {
  return typeof value === 'string' && PAPER_FORMATS.has(value as PaperFormat);
}

function isPaperOrientation(value: unknown): value is PaperOrientation {
  return typeof value === 'string' && PAPER_ORIENTATIONS.has(value as PaperOrientation);
}

function resolveBuiltinPreset(input: {
  style: PaperStyle;
  paperFormat: PaperFormat;
  paperOrientation: PaperOrientation;
}): ResolvedBuiltinPaperPreset | null {
  const preset = resolveNotebookPaperPreset({
    style: input.style,
    format: input.paperFormat,
    orientation: input.paperOrientation,
  });
  return preset
    ? BUILTIN_PRESET_BY_KEY.get(
        builtinPresetKey(preset.style, preset.format, preset.orientation),
      ) ?? null
    : null;
}

function buildBuiltinPresetLookup(): Map<string, ResolvedBuiltinPaperPreset> {
  return new Map(
    NOTEBOOK_PAPER_PRESETS.map((preset) => [
      builtinPresetKey(preset.style, preset.format, preset.orientation),
      {
        ...preset,
        supportedFormats: [...(BUILTIN_PRESET_SUPPORT[preset.style]?.formats ?? [])],
        supportedOrientations: [...(BUILTIN_PRESET_SUPPORT[preset.style]?.orientations ?? [])],
      },
    ]),
  );
}

function buildBuiltinPresetIdLookup(): Map<string, ResolvedBuiltinPaperPreset> {
  return new Map(
    [...BUILTIN_PRESET_BY_KEY.values()].map((preset) => [preset.id.toLowerCase(), preset]),
  );
}

function buildBuiltinPresetSupport(): Record<
  ResolvedBuiltinPaperPreset['style'],
  {
    formats: Set<PaperFormat>;
    orientations: Set<PaperOrientation>;
  }
> {
  return NOTEBOOK_PAPER_PRESETS.reduce(
    (support, preset) => {
      support[preset.style].formats.add(preset.format);
      support[preset.style].orientations.add(preset.orientation);
      return support;
    },
    {
      lined: { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      ruled: { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      grid: { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      'dot-grid': { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      cornell: { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
    },
  );
}

function builtinPresetKey(
  style: NotebookPaperPreset['style'],
  format: PaperFormat,
  orientation: PaperOrientation,
): string {
  return `${style}:${format}:${orientation}`;
}

function resolveBuiltinPresetById(value: RawDocumentPaperSettings['paperPresetId']): ResolvedBuiltinPaperPreset | null {
  const preset = resolveNotebookPaperPresetById(value);
  return preset ? BUILTIN_PRESET_BY_ID.get(preset.id.toLowerCase()) ?? null : null;
}

function isCompatibleBuiltinPreset(input: {
  candidatePreset: ResolvedBuiltinPaperPreset | null;
  usedCompatibilityFallback: boolean;
  style: PaperStyle;
  pageWidth: number;
  pageHeight: number;
  paperColor: string;
  lineColor: string;
  margins: ResolvedPaperGeometry['margins'];
  textTop: number;
  textLeft: number;
  lineHeightPx: number;
}): input is {
  candidatePreset: ResolvedBuiltinPaperPreset;
  usedCompatibilityFallback: false;
  style: PaperStyle;
  pageWidth: number;
  pageHeight: number;
  paperColor: string;
  lineColor: string;
  margins: ResolvedPaperGeometry['margins'];
  textTop: number;
  textLeft: number;
  lineHeightPx: number;
} {
  const preset = input.candidatePreset;
  if (!preset || input.usedCompatibilityFallback) {
    return false;
  }

  if (!sameNumber(input.pageWidth, preset.pageSize.width) || !sameNumber(input.pageHeight, preset.pageSize.height)) {
    return false;
  }

  if (
    !sameNumber(input.margins.top, preset.alignment.writingMargins.top)
    || !sameNumber(input.margins.right, preset.alignment.writingMargins.right)
    || !sameNumber(input.margins.bottom, preset.alignment.writingMargins.bottom)
    || !sameNumber(input.margins.left, preset.alignment.writingMargins.left)
  ) {
    return false;
  }

  if (!sameNumber(input.lineHeightPx, preset.alignment.lineSpacing)) {
    return false;
  }

  if (
    !sameString(input.paperColor, DEFAULT_SETTINGS.paperColor)
    || !sameString(input.lineColor, DEFAULT_SETTINGS.lineColor)
  ) {
    return false;
  }

  const expectedTextLeft = input.style === 'ruled'
    ? (preset.alignment.ruledMarginPosition ?? input.margins.left) + RULED_TEXT_INSET_PX
    : input.margins.left;

  return sameNumber(input.textLeft, expectedTextLeft);
}

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= BUILTIN_PRESET_EPSILON;
}

function sameString(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}
