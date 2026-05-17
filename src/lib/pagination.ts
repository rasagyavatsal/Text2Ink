export type PaginationLineData = {
  text: string;
  lineIndex: number;
  hasNewline: boolean;
};

export type PaginationRequest = {
  type: 'paginate';
  requestId: number;
  text: string;
  currentPageIndex: number;
  renderAllPagesForExport: boolean;
  pageWidth: number;
  pageHeight: number;
  settings: {
    lineHeight: number;
    paperStyle: 'blank' | 'lined' | 'ruled' | 'grid';
    ruledMarginLineOffset: number;
  };
  pages: Array<{
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    fontSize: number;
    customLineSpacing?: number;
    writingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    lineSpacing?: number;
  }>;
  pageHasBackground: boolean[];
  defaultPageHasBackground?: boolean;
  fontFamily: string;
};

export type PaginationResponse = {
  type: 'pagination-result';
  requestId: number;
  pages: PaginationLineData[][];
  isPaginationComplete: boolean;
  totalPages: number;
};

const defaultMeasureFactor = 0.6;

export function createMeasure(fontFamily: string, fontSize: number) {
  try {
    const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
    if (!hasOffscreen) {
      return (s: string) => s.length * fontSize * defaultMeasureFactor;
    }

    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return (s: string) => s.length * fontSize * defaultMeasureFactor;
    }

    ctx.font = `400 ${fontSize}px ${fontFamily || 'cursive'}`;
    return (s: string) => ctx.measureText(s).width;
  } catch {
    return (s: string) => s.length * fontSize * defaultMeasureFactor;
  }
}

export function nextLineFrom(
  text: string,
  fromIndex: number,
  maxWidth: number,
  measure: (s: string) => number
): { lineText: string; nextIndex: number; hasNewline: boolean } | null {
  if (fromIndex >= text.length) return null;

  const nlIndex = text.indexOf('\n', fromIndex);
  const rawEnd = nlIndex === -1 ? text.length : nlIndex;
  const segment = text.slice(fromIndex, rawEnd);

  if (segment.length === 0) {
    if (nlIndex !== -1 && nlIndex === fromIndex) {
      return { lineText: '', nextIndex: fromIndex + 1, hasNewline: true };
    }
    return { lineText: '', nextIndex: rawEnd, hasNewline: nlIndex !== -1 };
  }

  if (measure(segment) <= maxWidth) {
    const nextIndex = nlIndex === -1 ? rawEnd : rawEnd + 1;
    return { lineText: segment, nextIndex, hasNewline: nlIndex !== -1 };
  }

  const findMaxFittingIndex = (s: string) => {
    let low = 1;
    let high = s.length;
    let best = 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const w = measure(s.slice(0, mid));
      if (w <= maxWidth) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.max(1, Math.min(best, s.length));
  };

  const fit = findMaxFittingIndex(segment);
  const candidate = segment.slice(0, fit);
  const lastWhitespace = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\t'));
  const breakAt = lastWhitespace > 0 ? lastWhitespace + 1 : fit;

  return {
    lineText: segment.slice(0, breakAt),
    nextIndex: fromIndex + breakAt,
    hasNewline: false,
  };
}

export function paginate(req: PaginationRequest): PaginationResponse {
  const out: PaginationLineData[][] = [];
  const lineCounter = { value: 0 };
  const textLen = req.text.length;
  const pageLimit = req.renderAllPagesForExport
    ? Number.POSITIVE_INFINITY
    : Math.max(1, req.currentPageIndex + 2);

  let cursor = 0;
  let pageIndex = 0;

  if (textLen === 0) {
    out.push([]);
    return {
      type: 'pagination-result',
      requestId: req.requestId,
      pages: out,
      isPaginationComplete: true,
      totalPages: 1,
    };
  }

  while (cursor < textLen) {
    const ps = req.pages[pageIndex] ?? req.pages[req.pages.length - 1];
    const pageHasBackground = req.pageHasBackground[pageIndex] ?? req.defaultPageHasBackground ?? false;

    const contentHeight = ps.writingBox?.height ?? (req.pageHeight - ps.marginTop - ps.marginBottom);
    const ruledTextLeft = ps.writingBox?.x ?? (
      req.settings.paperStyle === 'ruled' && !pageHasBackground
        ? ps.marginLeft + req.settings.ruledMarginLineOffset + 10
        : ps.marginLeft
    );

    const ruledTextWidth = ps.writingBox?.width ?? (req.pageWidth - ruledTextLeft - ps.marginRight);

    const baseLineHeightPx = ps.fontSize * req.settings.lineHeight;
    const lineHeightPx = ps.lineSpacing ?? (pageHasBackground && ps.customLineSpacing ? ps.customLineSpacing : baseLineHeightPx);
    const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeightPx));

    const measure = createMeasure(req.fontFamily, ps.fontSize);
    const maxWidth = ruledTextWidth;

    const pageLines: PaginationLineData[] = [];
    for (let i = 0; i < linesPerPage && cursor < textLen; i++) {
      const next = nextLineFrom(req.text, cursor, maxWidth, measure);
      if (!next) break;
      pageLines.push({
        text: next.lineText,
        lineIndex: lineCounter.value++,
        hasNewline: next.hasNewline,
      });
      cursor = next.nextIndex;
    }

    if (pageIndex < pageLimit) {
      out.push(pageLines);
    }
    pageIndex += 1;

    if (pageLines.length === 0) break;
  }

  const computedPages = out.length > 0 ? out : [[]];
  const isComplete = cursor >= textLen;
  return {
    type: 'pagination-result',
    requestId: req.requestId,
    pages: computedPages,
    isPaginationComplete: isComplete,
    totalPages: Math.max(1, pageIndex),
  };
}
