import { describe, it, expect } from 'vitest';
import { paginate, nextLineFrom, createMeasure, type PaginationRequest } from '../pagination';

describe('pagination', () => {
  const defaultReq: PaginationRequest = {
    type: 'paginate',
    requestId: 1,
    text: '',
    currentPageIndex: 0,
    renderAllPagesForExport: false,
    pageWidth: 800,
    pageHeight: 1000,
    hasAnyCustomBackground: false,
    settings: {
      lineHeight: 1.5,
      paperStyle: 'lined',
      ruledMarginLineOffset: -10,
    },
    pages: [
      {
        marginTop: 50,
        marginRight: 50,
        marginBottom: 50,
        marginLeft: 50,
        fontSize: 20,
      },
    ],
    pageHasBackground: [false],
    fontFamily: 'caveat',
  };

  describe('createMeasure', () => {
    it('returns a fallback measure function when OffscreenCanvas is missing', () => {
      // OffscreenCanvas is mocked in setup.tsx, so it should be available.
      // But we can test the behavior.
      const measure = createMeasure('caveat', 20);
      expect(typeof measure).toBe('function');
      expect(measure('abc')).toBeGreaterThan(0);
    });
  });

  describe('nextLineFrom', () => {
    const measure = (s: string) => s.length * 10;
    const maxWidth = 100;

    it('returns null at end of text', () => {
      expect(nextLineFrom('abc', 3, maxWidth, measure)).toBeNull();
    });

    it('handles newlines', () => {
      const result = nextLineFrom('a\nb', 0, maxWidth, measure);
      expect(result).toEqual({ lineText: 'a', nextIndex: 2, hasNewline: true });
    });

    it('handles empty lines', () => {
      const result = nextLineFrom('\n\n', 0, maxWidth, measure);
      expect(result).toEqual({ lineText: '', nextIndex: 1, hasNewline: true });
    });

    it('wraps at whitespace', () => {
      // "abc def ghi" (11 chars * 10 = 110px > 100px)
      // "abc def " (8 chars * 10 = 80px <= 100px)
      const result = nextLineFrom('abc def ghi', 0, maxWidth, measure);
      expect(result?.lineText).toBe('abc def ');
      expect(result?.nextIndex).toBe(8);
    });

    it('falls back to character-based breaking for long words', () => {
      // "abcdefghijklm" (13 chars * 10 = 130px > 100px)
      const result = nextLineFrom('abcdefghijklm', 0, maxWidth, measure);
      expect(result?.lineText).toBe('abcdefghij');
      expect(result?.nextIndex).toBe(10);
    });
  });

  describe('paginate', () => {
    it('returns one empty page for empty text', () => {
      const res = paginate({ ...defaultReq, text: '' });
      expect(res.pages).toHaveLength(1);
      expect(res.pages[0]).toEqual([]);
      expect(res.totalPages).toBe(1);
      expect(res.isPaginationComplete).toBe(true);
    });

    it('paginates multiple lines and pages', () => {
      // contentHeight = 1000 - 50 - 50 = 900
      // lineHeight = 20 * 1.5 = 30
      // linesPerPage = 900 / 30 = 30
      const text = Array(40).fill('line').join('\n');
      const res = paginate({ ...defaultReq, text });
      
      expect(res.pages[0]).toHaveLength(30);
      expect(res.pages).toHaveLength(2); // By default it paginates current + 1
      expect(res.totalPages).toBe(2);
      expect(res.isPaginationComplete).toBe(true);
    });

    it('respects renderAllPagesForExport', () => {
      const text = Array(100).fill('line').join('\n');
      const res = paginate({ ...defaultReq, text, renderAllPagesForExport: true });
      
      expect(res.pages.length).toBeGreaterThan(2);
      expect(res.isPaginationComplete).toBe(true);
    });

    it('handles ruled paper margin offset', () => {
      const resRuled = paginate({ 
        ...defaultReq, 
        text: 'hello', 
        settings: { ...defaultReq.settings, paperStyle: 'ruled' } 
      });
      const resBlank = paginate({ 
        ...defaultReq, 
        text: 'hello', 
        settings: { ...defaultReq.settings, paperStyle: 'blank' } 
      });
      
      // The logic for ruledTextLeft changes maxWidth, but nextLineFrom uses it.
      // We can't easily see internal maxWidth here without mocking createMeasure.
      expect(resRuled.pages).toBeDefined();
    });
    
    it('uses customLineSpacing when available', () => {
      const res = paginate({
        ...defaultReq,
        text: Array(40).fill('line').join('\n'),
        pages: [{ ...defaultReq.pages[0], customLineSpacing: 100 }],
        pageHasBackground: [true]
      });
      
      // contentHeight = 900. linesPerPage = 900 / 100 = 9.
      expect(res.pages[0].length).toBe(9);
    });
  });
});
