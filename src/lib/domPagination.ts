import {
  createMeasure,
  type PaginationLineData,
  type PaginationRequest,
  type PaginationResponse,
} from './pagination';

type PageStyleInput = PaginationRequest['pages'][number];

export function linesFromPageSlice(
  pageText: string,
  lineCounter: { value: number }
): PaginationLineData[] {
  if (pageText.length === 0) return [];

  const lines: PaginationLineData[] = [];
  let start = 0;

  for (let i = 0; i < pageText.length; i++) {
    if (pageText[i] !== '\n') continue;
    lines.push({
      text: pageText.slice(start, i),
      lineIndex: lineCounter.value++,
      hasNewline: true,
    });
    start = i + 1;
  }

  if (start < pageText.length) {
    lines.push({
      text: pageText.slice(start),
      lineIndex: lineCounter.value++,
      hasNewline: false,
    });
  }

  return lines;
}

function contentBoxFor(req: PaginationRequest, pageIndex: number) {
  const ps = req.pages[pageIndex] ?? req.pages[req.pages.length - 1];
  const pageHasBackground = !!req.pageHasBackground[pageIndex];
  const left = ps.writingBox?.x ?? (
    req.settings.paperStyle === 'ruled' && !pageHasBackground
      ? ps.marginLeft + req.settings.ruledMarginLineOffset + 10
      : ps.marginLeft
  );
  const width = ps.writingBox?.width ?? (req.pageWidth - left - ps.marginRight);
  const height = ps.writingBox?.height ?? (req.pageHeight - ps.marginTop - ps.marginBottom);
  const lineHeight = ps.lineSpacing ?? (pageHasBackground && ps.customLineSpacing
    ? ps.customLineSpacing
    : ps.fontSize * req.settings.lineHeight);

  return { ps, width: Math.max(1, width), height: Math.max(1, height), lineHeight };
}

function fallbackFits(
  text: string,
  fontFamily: string,
  ps: PageStyleInput,
  maxWidth: number,
  maxHeight: number,
  lineHeight: number
) {
  const measure = createMeasure(fontFamily, ps.fontSize);
  const linesPerPage = Math.max(1, Math.floor(maxHeight / lineHeight));
  let visualLines = 1;
  let currentWidth = 0;

  for (const char of text) {
    if (char === '\n') {
      visualLines += 1;
      currentWidth = 0;
      continue;
    }
    const charWidth = measure(char === '\t' ? '    ' : char);
    if (currentWidth > 0 && currentWidth + charWidth > maxWidth) {
      visualLines += 1;
      currentWidth = charWidth;
    } else {
      currentWidth += charWidth;
    }
  }

  return visualLines <= linesPerPage;
}

function createMeasurementElement(req: PaginationRequest, pageIndex: number) {
  if (typeof document === 'undefined') return null;

  const { ps, width, lineHeight } = contentBoxFor(req, pageIndex);
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'break-spaces',
    overflowWrap: 'break-word',
    width: `${width}px`,
    fontFamily: req.fontFamily || 'cursive',
    fontSize: `${ps.fontSize}px`,
    lineHeight: `${lineHeight}px`,
    padding: '0',
    border: '0',
  });
  document.body.appendChild(el);
  return el;
}

function textFitsPage(
  text: string,
  req: PaginationRequest,
  pageIndex: number,
  measurementEl: HTMLDivElement | null
) {
  const { ps, width, height, lineHeight } = contentBoxFor(req, pageIndex);

  if (measurementEl) {
    measurementEl.textContent = text.length > 0 ? text : ' ';
    const measuredHeight = measurementEl.scrollHeight;
    if (measuredHeight > 0) {
      return measuredHeight <= height + 0.5;
    }
  }

  return fallbackFits(text, req.fontFamily, ps, width, height, lineHeight);
}

function preferredBreakEnd(text: string, start: number, fitEnd: number) {
  if (fitEnd >= text.length) return fitEnd;

  const candidate = text.slice(start, fitEnd);
  const lastNewline = candidate.lastIndexOf('\n');
  if (lastNewline >= 0) return start + lastNewline + 1;

  const lastWhitespace = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\t'));
  if (lastWhitespace > 0) return start + lastWhitespace + 1;

  return fitEnd;
}

function findPageEnd(text: string, start: number, req: PaginationRequest, pageIndex: number) {
  const measurementEl = createMeasurementElement(req, pageIndex);
  try {
    let low = start + 1;
    let high = text.length;
    let best = start + 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (textFitsPage(text.slice(start, mid), req, pageIndex, measurementEl)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const preferred = preferredBreakEnd(text, start, best);
    return Math.max(start + 1, preferred);
  } finally {
    measurementEl?.remove();
  }
}

export function paginateDom(req: PaginationRequest): PaginationResponse {
  const pageLimit = req.renderAllPagesForExport
    ? Number.POSITIVE_INFINITY
    : Math.max(1, req.currentPageIndex + 2);

  if (req.text.length === 0) {
    return {
      type: 'pagination-result',
      requestId: req.requestId,
      pages: [[]],
      isPaginationComplete: true,
      totalPages: 1,
    };
  }

  const pages: PaginationLineData[][] = [];
  const lineCounter = { value: 0 };
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < req.text.length) {
    const end = findPageEnd(req.text, cursor, req, pageIndex);
    if (pageIndex < pageLimit) {
      pages.push(linesFromPageSlice(req.text.slice(cursor, end), lineCounter));
    }
    cursor = end;
    pageIndex += 1;
  }

  return {
    type: 'pagination-result',
    requestId: req.requestId,
    pages: pages.length > 0 ? pages : [[]],
    isPaginationComplete: cursor >= req.text.length,
    totalPages: Math.max(1, pageIndex),
  };
}

export const DOM_PAGINATION_PAGE_SIZE = {
  width: 612,
  height: 792,
};
