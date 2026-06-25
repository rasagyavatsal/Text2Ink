import { resolvePagePaper } from '@/lib/paper/PaperEngine';
import type {
  HandwritingSettings,
  PageSettings,
  PaperFormat,
  PaperOrientation,
  PaperStyle,
} from '@/lib/types';
import { createMeasure, nextLineFrom } from './textWrap';

export type PaginationLineData = {
  text: string;
  lineIndex: number;
  hasNewline: boolean;
};

type DocumentLayoutSettings = Partial<
  Pick<
    HandwritingSettings,
    | 'customBackgroundImage'
    | 'customBackgroundImages'
    | 'lineHeight'
    | 'paperColor'
    | 'paper'
    | 'randomness'
    | 'ruledMarginLineOffset'
    | 'textHorizontalOffset'
  >
> & {
  paperPresetId?: string | null;
  paperStyle?: PaperStyle;
  paperFormat?: PaperFormat;
  paperOrientation?: PaperOrientation;
};

type PageLayoutSettings = Partial<
  Pick<
    PageSettings,
    | 'customBackgroundImage'
    | 'customLineOffset'
    | 'customLineSpacing'
    | 'fontSize'
    | 'marginTop'
    | 'marginRight'
    | 'marginBottom'
    | 'marginLeft'
    | 'paperColor'
    | 'textHorizontalOffset'
  >
> & {
  paperStyle?: PaperStyle;
};

export interface ResolvePageLayoutInput {
  pageIndex: number;
  settings?: DocumentLayoutSettings;
  pageSettings?: PageLayoutSettings;
  pageSize?: {
    width?: number;
    height?: number;
  };
}

export interface ResolvedPageLayout {
  page: {
    index: number;
    width: number;
    height: number;
    aspectRatio: number;
  };
  paper: {
    variant: 'preset' | 'upload' | 'legacy-fallback';
    sourceKind: ReturnType<typeof resolvePagePaper>['source']['kind'];
    style: PaperStyle;
    background: ReturnType<typeof resolvePagePaper>['background'];
    guides: ReturnType<typeof resolvePagePaper>['guides'];
    presetId: string | null;
    capabilities: ReturnType<typeof resolvePagePaper>['capabilities'];
  };
  writing: {
    fontSize: number;
    lineHeightPx: number;
    lineOffset: number;
    linesPerPage: number;
    firstLineTop: number;
    contentBounds: ReturnType<typeof resolvePagePaper>['geometry']['contentBounds'];
    textBounds: {
      top: number;
      right: number;
      bottom: number;
      left: number;
      width: number;
      height: number;
    };
  };
}

export interface PaginateDocumentInput {
  text: string;
  currentPageIndex: number;
  renderAllPagesForExport: boolean;
  settings: DocumentLayoutSettings;
  pageSettings: PageLayoutSettings[];
  fontFamily: string;
}

export interface PaginateDocumentResult {
  pages: PaginationLineData[][];
  pageLayouts: ResolvedPageLayout[];
  isPaginationComplete: boolean;
  totalPages: number;
}

/**
 * LayoutEngine is the public layout boundary for document writing layout.
 * Callers ask for resolved layout and pagination rather than rebuilding paper
 * offsets, line spacing, or writing bounds from raw settings.
 */
export function resolvePageLayout(input: ResolvePageLayoutInput): ResolvedPageLayout {
  const resolvedPaper = resolvePagePaper(input);
  const { geometry } = resolvedPaper;
  const linesPerPage = Math.max(1, Math.floor(geometry.contentHeight / geometry.lineHeightPx));
  const textBoundsBottom = geometry.contentBounds.bottom;

  return {
    page: {
      index: input.pageIndex,
      width: geometry.pageWidth,
      height: geometry.pageHeight,
      aspectRatio: geometry.aspectRatio,
    },
    paper: {
      variant: resolvedPaper.variant,
      sourceKind: resolvedPaper.source.kind,
      style: resolvedPaper.style,
      background: resolvedPaper.background,
      guides: resolvedPaper.guides,
      presetId: resolvedPaper.preset?.id ?? null,
      capabilities: resolvedPaper.capabilities,
    },
    writing: {
      fontSize: geometry.fontSize,
      lineHeightPx: geometry.lineHeightPx,
      lineOffset: geometry.lineOffset,
      linesPerPage,
      firstLineTop: geometry.textTop,
      contentBounds: geometry.contentBounds,
      textBounds: {
        top: geometry.textTop,
        right: geometry.textLeft + geometry.textWidth,
        bottom: textBoundsBottom,
        left: geometry.textLeft,
        width: geometry.textWidth,
        height: Math.max(0, textBoundsBottom - geometry.textTop),
      },
    },
  };
}

export function paginateDocument(input: PaginateDocumentInput): PaginateDocumentResult {
  const pages: PaginationLineData[][] = [];
  const pageLayouts: ResolvedPageLayout[] = [];
  const lineCounter = { value: 0 };
  const textLength = input.text.length;
  const pageLimit = input.renderAllPagesForExport
    ? Number.POSITIVE_INFINITY
    : Math.max(1, input.currentPageIndex + 2);

  let cursor = 0;
  let pageIndex = 0;

  if (textLength === 0) {
    const layout = resolvePageLayout({
      pageIndex: 0,
      settings: input.settings,
      pageSettings: input.pageSettings[0],
    });

    return {
      pages: [[]],
      pageLayouts: [layout],
      isPaginationComplete: true,
      totalPages: 1,
    };
  }

  while (cursor < textLength) {
    const pageSettings = input.pageSettings[pageIndex] ?? input.pageSettings.at(-1);
    const layout = resolvePageLayout({
      pageIndex,
      settings: input.settings,
      pageSettings,
    });

    const pageLines: PaginationLineData[] = [];
    for (let i = 0; i < layout.writing.linesPerPage && cursor < textLength; i++) {
      const lineIndex = lineCounter.value;
      const measure = createMeasure(input.fontFamily, layout.writing.fontSize, {
        randomness: input.settings.randomness,
        lineIndex,
      });
      const next = nextLineFrom(input.text, cursor, layout.writing.textBounds.width, measure);
      if (!next) break;
      pageLines.push({
        text: next.lineText,
        lineIndex: lineCounter.value++,
        hasNewline: next.hasNewline,
      });
      cursor = next.nextIndex;
    }

    if (pageIndex < pageLimit) {
      pages.push(pageLines);
      pageLayouts.push(layout);
    }
    pageIndex += 1;

    if (pageLines.length === 0) break;
  }

  return {
    pages: pages.length > 0 ? pages : [[]],
    pageLayouts,
    isPaginationComplete: cursor >= textLength,
    totalPages: Math.max(1, pageIndex),
  };
}
