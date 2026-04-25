import { describe, expect, it } from 'vitest';
import { paginateDom, linesFromPageSlice } from '../domPagination';
import type { PaginationRequest } from '../pagination';

const request = (text: string, overrides: Partial<PaginationRequest> = {}): PaginationRequest => ({
  type: 'paginate',
  requestId: 1,
  text,
  currentPageIndex: 0,
  renderAllPagesForExport: true,
  pageWidth: 200,
  pageHeight: 120,
  hasAnyCustomBackground: false,
  settings: {
    lineHeight: 1,
    paperStyle: 'blank',
    ruledMarginLineOffset: 0,
  },
  pages: [
    {
      marginTop: 10,
      marginRight: 10,
      marginBottom: 10,
      marginLeft: 10,
      fontSize: 10,
    },
  ],
  pageHasBackground: [false],
  fontFamily: 'monospace',
  ...overrides,
});

describe('domPagination', () => {
  it('preserves explicit newline offsets in line data', () => {
    expect(linesFromPageSlice('A\nB\n', { value: 0 })).toEqual([
      { text: 'A', lineIndex: 0, hasNewline: true },
      { text: 'B', lineIndex: 1, hasNewline: true },
    ]);
  });

  it('returns at least one page for empty text', () => {
    const result = paginateDom(request(''));

    expect(result.pages).toEqual([[]]);
    expect(result.totalPages).toBe(1);
    expect(result.isPaginationComplete).toBe(true);
  });

  it('paginates long text into contiguous page slices', () => {
    const result = paginateDom(request('one two three four five six seven eight nine ten', {
      pageHeight: 30,
    }));
    const reconstructed = result.pages
      .flatMap((page) => page.map((line) => line.text + (line.hasNewline ? '\n' : '')))
      .join('');

    expect(result.totalPages).toBeGreaterThan(1);
    expect(reconstructed).toBe('one two three four five six seven eight nine ten');
  });

  it('can limit returned pages while still reporting total pages', () => {
    const result = paginateDom(request('one two three four five six seven eight nine ten', {
      renderAllPagesForExport: false,
      currentPageIndex: 0,
    }));

    expect(result.pages.length).toBeLessThanOrEqual(2);
    expect(result.totalPages).toBeGreaterThanOrEqual(result.pages.length);
  });
});
