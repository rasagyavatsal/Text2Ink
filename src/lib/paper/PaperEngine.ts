import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import {
  DEFAULT_SETTINGS,
  type HandwritingSettings,
  type PaperFormat,
  type PaperOrientation,
  type PaperStyle,
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
import {
  DEFAULT_GENERATED_PAPER_SELECTION,
  normalizeDocumentPaperSelection,
  resolveDocumentPaperFormat,
  resolveDocumentPaperOrientation,
  resolveDocumentPaperPresetId,
  resolveDocumentPaperStyle,
} from './paperSelection';

type RawDocumentPaperSettings = Partial<
  Pick<
    HandwritingSettings,
    | 'customBackgroundImage'
    | 'customBackgroundImages'
    | 'lineColor'
    | 'lineHeight'
    | 'paperColor'
    | 'paper'
    | 'ruledMarginLineOffset'
  >
> & {
  paperPresetId?: string | null;
  paperStyle?: PaperStyle;
  paperFormat?: PaperFormat;
  paperOrientation?: PaperOrientation;
};

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
  >
> & {
  paperStyle?: PaperStyle;
};

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

export type ResolvedPaperSourceKind = 'preset-built-in' | 'upload-backed' | 'generated-fallback';

export interface ResolvedPaperSource {
  kind: ResolvedPaperSourceKind;
  presetId: string | null;
}

export interface ResolvedPaperCapabilities {
  alignmentMode: 'fixed' | 'user-calibrated';
  lineSpacingOwner: 'preset' | 'upload' | 'document';
  supportsLineHeightControl: boolean;
  supportsManualAlignment: boolean;
  supportsManualLineSpacing: boolean;
  supportsMarginControls: boolean;
  supportsMarginLineOffset: boolean;
}

/**
 * ResolvedPaper is the single paper model callers consume.
 * It hides legacy settings fallback, uploaded background precedence, and
 * writing-area geometry behind one stable contract.
 */
export interface ResolvedPaper {
  variant: 'preset' | 'upload' | 'legacy-fallback';
  source: ResolvedPaperSource;
  style: PaperStyle;
  background: ResolvedPaperBackground;
  guides: ResolvedPaperGuides;
  geometry: ResolvedPaperGeometry;
  preset: ResolvedBuiltinPaperPreset | null;
  capabilities: ResolvedPaperCapabilities;
}

export interface ResolvedBuiltinPaperPreset {
  id: string;
  style: NotebookPaperPreset['style'];
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
  return resolvePaperDefinition(input);
}

interface PaperDefinition {
  variant: ResolvedPaper['variant'];
  source: ResolvedPaperSource;
  style: PaperStyle;
  background: ResolvedPaperBackground;
  guides: ResolvedPaperGuides;
  geometry: ResolvedPaperGeometry;
  preset: ResolvedBuiltinPaperPreset | null;
  capabilities: ResolvedPaperCapabilities;
}


function resolvePaperSelectionNormalization(
  settings: RawDocumentPaperSettings,
  pageSettings: RawPagePaperSettings
) {
  const selectionResolution = normalizeDocumentPaperSelection({
    paper: settings.paper,
    paperPresetId: settings.paperPresetId,
    paperStyle: settings.paperStyle,
    paperFormat: settings.paperFormat,
    paperOrientation: settings.paperOrientation,
    pagePaperStyle: pageSettings.paperStyle,
    defaultWhenMissing: DEFAULT_GENERATED_PAPER_SELECTION,
  });
  const paperFormat = resolveDocumentPaperFormat(selectionResolution.selection);
  const paperOrientation = resolveDocumentPaperOrientation(selectionResolution.selection);
  const style = resolveDocumentPaperStyle(selectionResolution.selection);
  return { selectionResolution, paperFormat, paperOrientation, style };
}

function resolvePaperPresetResolution(
  hasUploadBackground: boolean,
  selectionResolution: ReturnType<typeof normalizeDocumentPaperSelection>,
  style: PaperStyle,
  paperFormat: PaperFormat,
  paperOrientation: PaperOrientation
) {
  let explicitBuiltinPreset = hasUploadBackground
    ? null
    : resolveBuiltinPresetById(resolveDocumentPaperPresetId(selectionResolution.selection));

  if (!explicitBuiltinPreset && !hasUploadBackground) {
    if (style === 'wide-lined' || style === 'wide-ruled' || style === 'narrow-lined' || style === 'narrow-ruled') {
      explicitBuiltinPreset = resolveBuiltinPreset({
        style,
        paperFormat,
        paperOrientation,
      });
    }
  }
  return explicitBuiltinPreset;
}

function resolvePaperMeasurementAndGeometry(
  input: ResolvePagePaperInput,
  settings: RawDocumentPaperSettings,
  pageSettings: RawPagePaperSettings,
  paperFormat: PaperFormat,
  paperOrientation: PaperOrientation,
  style: PaperStyle,
  hasUploadBackground: boolean,
  fontSizeResolution: { value: number; usedFallback: boolean; incompatible: boolean }
) {
  const resolvedPageSize = resolvePaperPageSize(paperFormat, paperOrientation);
  const pageWidth = resolvePositiveNumber(input.pageSize?.width, resolvedPageSize.width).value;
  const pageHeight = resolvePositiveNumber(input.pageSize?.height, resolvedPageSize.height).value;
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
  let lineHeightPx =
    hasUploadBackground && customLineSpacingResolution.value !== null
      ? customLineSpacingResolution.value
      : fontSizeResolution.value * lineHeightResolution.value;

  if (style === 'wide-lined' || style === 'wide-ruled') {
    lineHeightPx *= 1.5;
  } else if (style === 'narrow-lined' || style === 'narrow-ruled') {
    lineHeightPx *= 0.8;
  }
  const lineOffset = hasUploadBackground ? customLineOffsetResolution.value : 0;
  const textLeft =
    (style === 'ruled' || style === 'wide-ruled' || style === 'narrow-ruled') && !hasUploadBackground
      ? margins.left + ruledMarginLineOffsetResolution.value + RULED_TEXT_INSET_PX
      : margins.left;
  const textTop = margins.top + lineOffset;
  const textWidth = Math.max(0, pageWidth - textLeft - margins.right);

  const resolutions = {
    lineHeightResolution,
    ruledMarginLineOffsetResolution,
    marginTopResolution,
    marginRightResolution,
    marginBottomResolution,
    marginLeftResolution,
    customLineOffsetResolution,
    customLineSpacingResolution,
  };

  const geometry = {
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
  };

  return { geometry, resolutions };
}

function resolvePaperGuideAndBackground(
  hasUploadBackground: boolean,
  builtinPreset: ResolvedBuiltinPaperPreset | null,
  style: PaperStyle,
  geometry: ResolvedPaperGeometry,
  paperColor: string,
  lineColor: string,
  ruledMarginLineOffset: number,
  backgroundImage: string | null
) {
  const presetBackground = hasUploadBackground
    ? null
    : resolveBuiltinPresetBackground({
        builtinPreset,
        style,
        pageWidth: geometry.pageWidth,
        pageHeight: geometry.pageHeight,
        paperColor,
        lineColor,
        margins: geometry.margins,
        textTop: geometry.textTop,
        lineHeightPx: geometry.lineHeightPx,
        ruledMarginLineOffset,
      });

  const background: ResolvedPaperBackground = hasUploadBackground
    ? {
        kind: 'image',
        imageSrc: backgroundImage!,
      }
    : presetBackground ?? {
        kind: 'solid-color',
        color: paperColor,
      };

  const guides: ResolvedPaperGuides = presetBackground
    ? { kind: 'none' }
    : resolveGuides({
        hasUploadBackground,
        style,
        lineColor,
        marginLeft: geometry.margins.left,
        ruledMarginLineOffset,
      });

  return { background, guides, presetBackground };
}

function resolvePaperVariantAndSource(
  hasUploadBackground: boolean,
  builtinPreset: ResolvedBuiltinPaperPreset | null,
  style: PaperStyle,
  usedCompatibilityFallback: boolean
) {
  const getVariant = (): ResolvedPaper['variant'] => {
    if (hasUploadBackground) return 'upload';
    if (builtinPreset || (style === 'blank' && !usedCompatibilityFallback)) return 'preset';
    if (usedCompatibilityFallback || style !== 'blank') return 'legacy-fallback';
    return 'preset';
  };
  const variant: ResolvedPaper['variant'] = getVariant();
  const source = resolvePaperSource({
    hasUploadBackground,
    builtinPreset,
  });

  return { variant, source };
}

function resolvePaperDefinition(input: ResolvePagePaperInput): PaperDefinition {
  const settings = input.settings ?? {};
  const pageSettings = input.pageSettings ?? {};
  
  const { selectionResolution, paperFormat, paperOrientation, style } = resolvePaperSelectionNormalization(settings, pageSettings);
  
  const backgroundImage = resolveBackgroundImage({
    pageIndex: input.pageIndex,
    settings,
    pageSettings,
  });
  const hasUploadBackground = backgroundImage !== null;

  const explicitBuiltinPreset = resolvePaperPresetResolution(
    hasUploadBackground,
    selectionResolution,
    style,
    paperFormat,
    paperOrientation
  );

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

  const { geometry, resolutions } = resolvePaperMeasurementAndGeometry(
    input,
    settings,
    pageSettings,
    paperFormat,
    paperOrientation,
    style,
    hasUploadBackground,
    fontSizeResolution
  );

  const usedCompatibilityFallback =
    selectionResolution.incompatible
    || resolutions.lineHeightResolution.incompatible
    || resolutions.ruledMarginLineOffsetResolution.incompatible
    || fontSizeResolution.incompatible
    || resolutions.marginTopResolution.incompatible
    || resolutions.marginRightResolution.incompatible
    || resolutions.marginBottomResolution.incompatible
    || resolutions.marginLeftResolution.incompatible
    || paperColorResolution.incompatible
    || lineColorResolution.incompatible
    || resolutions.customLineOffsetResolution.incompatible
    || resolutions.customLineSpacingResolution.incompatible;

  const candidateBuiltinPreset = hasUploadBackground
    ? null
    : (explicitBuiltinPreset ?? resolveBuiltinPreset({
        style,
        paperFormat,
        paperOrientation,
      }));

  const builtinPreset = isCompatibleBuiltinPreset({
    candidatePreset: candidateBuiltinPreset,
    usedCompatibilityFallback,
    style,
    pageWidth: geometry.pageWidth,
    pageHeight: geometry.pageHeight,
    paperColor: paperColorResolution.value,
    lineColor: lineColorResolution.value,
    margins: geometry.margins,
    textTop: geometry.textTop,
    textLeft: geometry.textLeft,
    lineHeightPx: geometry.lineHeightPx,
  })
    ? candidateBuiltinPreset
    : null;

  const { background, guides } = resolvePaperGuideAndBackground(
    hasUploadBackground,
    builtinPreset,
    style,
    geometry,
    paperColorResolution.value,
    lineColorResolution.value,
    resolutions.ruledMarginLineOffsetResolution.value,
    backgroundImage
  );

  const { variant, source } = resolvePaperVariantAndSource(
    hasUploadBackground,
    builtinPreset,
    style,
    usedCompatibilityFallback
  );

  return {
    variant,
    source,
    style,
    background,
    guides,
    geometry,
    preset: builtinPreset,
    capabilities: resolvePaperCapabilities({
      source,
      style,
    }),
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
  const source = resolvePaperSource({
    hasUploadBackground: false,
    builtinPreset: input.preset,
  });

  return {
    variant: 'preset',
    source,
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
    capabilities: resolvePaperCapabilities({
      source,
      style: input.preset.style,
    }),
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
  if (input.style !== 'lined' && input.style !== 'wide-lined' && input.style !== 'narrow-lined' && input.style !== 'ruled' && input.style !== 'wide-ruled' && input.style !== 'narrow-ruled' && input.style !== 'grid' && input.style !== 'dot-grid' && input.style !== 'cornell') {
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
        input.style === 'ruled' || input.style === 'wide-ruled' || input.style === 'narrow-ruled'
          ? input.margins.left + input.ruledMarginLineOffset
          : undefined,
    }),
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

import { getUploadCalibrationState } from '../uploadCalibration';

function resolveBackgroundImage(input: {
  pageIndex: number;
  settings: RawDocumentPaperSettings;
  pageSettings: RawPagePaperSettings;
}): string | null {
  return getUploadCalibrationState({
    pageIndex: input.pageIndex,
    settings: input.settings,
    pageSettings: input.pageSettings,
  }).currentBackground;
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

  if (input.style === 'lined' || input.style === 'wide-lined' || input.style === 'narrow-lined') {
    return {
      kind: 'lined',
      lineColor: input.lineColor,
    };
  }

  if (input.style === 'ruled' || input.style === 'wide-ruled' || input.style === 'narrow-ruled') {
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
      'wide-lined': { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      'narrow-lined': { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      ruled: { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      'wide-ruled': { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
      'narrow-ruled': { formats: new Set<PaperFormat>(), orientations: new Set<PaperOrientation>() },
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

function resolvePaperSource(input: {
  hasUploadBackground: boolean;
  builtinPreset: ResolvedBuiltinPaperPreset | null;
}): ResolvedPaperSource {
  if (input.hasUploadBackground) {
    return {
      kind: 'upload-backed',
      presetId: null,
    };
  }

  if (input.builtinPreset) {
    return {
      kind: 'preset-built-in',
      presetId: input.builtinPreset.id,
    };
  }

  return {
    kind: 'generated-fallback',
    presetId: null,
  };
}

function resolvePaperCapabilities(input: {
  source: ResolvedPaperSource;
  style: PaperStyle;
}): ResolvedPaperCapabilities {
  const supportsMarginLineOffset =
    input.source.kind === 'generated-fallback'
    && (input.style === 'ruled' || input.style === 'wide-ruled' || input.style === 'narrow-ruled');

  const getLineSpacingOwner = () => {
    if (input.source.kind === 'preset-built-in') return 'preset';
    if (input.source.kind === 'upload-backed') return 'upload';
    return 'document';
  };

  return {
    alignmentMode: input.source.kind === 'upload-backed' ? 'user-calibrated' : 'fixed',
    lineSpacingOwner: getLineSpacingOwner(),
    supportsLineHeightControl:
      input.source.kind === 'generated-fallback' && input.style === 'blank',
    supportsManualAlignment: input.source.kind === 'upload-backed',
    supportsManualLineSpacing: input.source.kind === 'upload-backed',
    supportsMarginControls: input.source.kind === 'upload-backed',
    supportsMarginLineOffset,
  };
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

  const expectedTextLeft = input.style === 'ruled' || input.style === 'wide-ruled' || input.style === 'narrow-ruled'
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
