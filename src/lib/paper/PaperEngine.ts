import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import {
  DEFAULT_SETTINGS,
  type HandwritingSettings,
  type PaperFormat,
  type PaperOrientation,
  type PageSettings,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';

type PaperStyle = HandwritingSettings['paperStyle'];

type RawDocumentPaperSettings = Partial<
  Pick<
    HandwritingSettings,
    | 'customBackgroundImage'
    | 'customBackgroundImages'
    | 'lineColor'
    | 'lineHeight'
    | 'paperColor'
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
}

const DEFAULT_PAGE_SETTINGS = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
const PAPER_STYLES = new Set<PaperStyle>(['blank', 'lined', 'ruled', 'grid']);
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
const RULED_MARGIN_LINE_COLOR = '#ffb3b3';
const RULED_MARGIN_LINE_WIDTH = 2;
const GRID_GUIDE_ALPHA = 0.5;

export function resolvePagePaper(input: ResolvePagePaperInput): ResolvedPaper {
  const settings = input.settings ?? {};
  const pageSettings = input.pageSettings ?? {};

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
  const fontSizeResolution = resolvePositiveNumber(pageSettings.fontSize, DEFAULT_PAGE_SETTINGS.fontSize);
  const marginTopResolution = resolveFiniteNumber(pageSettings.marginTop, DEFAULT_PAGE_SETTINGS.marginTop);
  const marginRightResolution = resolveFiniteNumber(pageSettings.marginRight, DEFAULT_PAGE_SETTINGS.marginRight);
  const marginBottomResolution = resolveFiniteNumber(pageSettings.marginBottom, DEFAULT_PAGE_SETTINGS.marginBottom);
  const marginLeftResolution = resolveFiniteNumber(pageSettings.marginLeft, DEFAULT_PAGE_SETTINGS.marginLeft);
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
  const customLineOffsetResolution = resolveFiniteNumber(
    pageSettings.customLineOffset,
    DEFAULT_PAGE_SETTINGS.customLineOffset,
  );
  const customLineSpacingResolution = resolveNullablePositiveNumber(
    pageSettings.customLineSpacing,
    DEFAULT_PAGE_SETTINGS.customLineSpacing,
  );

  const backgroundImage = resolveBackgroundImage({
    pageIndex: input.pageIndex,
    settings,
    pageSettings,
  });
  const hasUploadBackground = backgroundImage !== null;

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
    paperFormatResolution.usedFallback
    || paperOrientationResolution.usedFallback
    styleResolution.usedFallback
    || lineHeightResolution.usedFallback
    || ruledMarginLineOffsetResolution.usedFallback
    || fontSizeResolution.usedFallback
    || marginTopResolution.usedFallback
    || marginRightResolution.usedFallback
    || marginBottomResolution.usedFallback
    || marginLeftResolution.usedFallback
    || paperColorResolution.usedFallback
    || lineColorResolution.usedFallback
    || customLineOffsetResolution.usedFallback
    || customLineSpacingResolution.usedFallback;

  return {
    variant: hasUploadBackground
      ? 'upload'
      : usedCompatibilityFallback
        ? 'legacy-fallback'
        : 'preset',
    style,
    background: hasUploadBackground
      ? {
          kind: 'image',
          imageSrc: backgroundImage,
        }
      : {
          kind: 'solid-color',
          color: paperColorResolution.value,
        },
    guides: resolveGuides({
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
  };
}

function resolvePaperFormat(
  value: RawDocumentPaperSettings['paperFormat'],
  fallback: PaperFormat,
): { value: PaperFormat; usedFallback: boolean } {
  if (isPaperFormat(value)) {
    return { value, usedFallback: false };
  }

  return { value: fallback, usedFallback: true };
}

function resolvePaperOrientation(
  value: RawDocumentPaperSettings['paperOrientation'],
  fallback: PaperOrientation,
): { value: PaperOrientation; usedFallback: boolean } {
  if (isPaperOrientation(value)) {
    return { value, usedFallback: false };
  }

  return { value: fallback, usedFallback: true };
}

function resolvePaperStyle(
  documentStyle: RawDocumentPaperSettings['paperStyle'],
  pageStyle: RawPagePaperSettings['paperStyle'],
): { value: PaperStyle; usedFallback: boolean } {
  if (isPaperStyle(documentStyle)) {
    return { value: documentStyle, usedFallback: false };
  }

  if (isPaperStyle(pageStyle)) {
    return { value: pageStyle, usedFallback: true };
  }

  return {
    value: DEFAULT_SETTINGS.paperStyle,
    usedFallback: true,
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

  return {
    kind: 'grid',
    lineColor: input.lineColor,
    alpha: GRID_GUIDE_ALPHA,
  };
}

function resolveFiniteNumber(value: unknown, fallback: number): {
  value: number;
  usedFallback: boolean;
} {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, usedFallback: false };
  }

  return { value: fallback, usedFallback: true };
}

function resolvePositiveNumber(value: unknown, fallback: number): {
  value: number;
  usedFallback: boolean;
} {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return { value, usedFallback: false };
  }

  return { value: fallback, usedFallback: true };
}

function resolveNullablePositiveNumber(value: unknown, fallback: number | null): {
  value: number | null;
  usedFallback: boolean;
} {
  if (value === null) {
    return { value: null, usedFallback: false };
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return { value, usedFallback: false };
  }

  return { value: fallback, usedFallback: true };
}

function resolveString(
  primary: unknown,
  secondary: unknown,
  fallback: string,
): { value: string; usedFallback: boolean } {
  const primaryValue = normalizeString(primary);
  if (primaryValue) {
    return { value: primaryValue, usedFallback: false };
  }

  const secondaryValue = normalizeString(secondary);
  if (secondaryValue) {
    return { value: secondaryValue, usedFallback: false };
  }

  return { value: fallback, usedFallback: true };
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
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
