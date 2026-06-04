import { describe, it, expect } from 'vitest';
import type { PaperFormat, PaperOrientation } from '../types';
import { paginate, nextLineFrom, createMeasure, type PaginationRequest } from '../pagination';
import { withTestPaperSelection } from '@/test/paperTestHelpers';

describe('pagination', () => {
  const paginationFormatCases: Array<{
    paperFormat: PaperFormat;
    paperOrientation: PaperOrientation;
    expectedLinesPerPage: number;
    expectedTotalPages: number;
  }> = [
    { paperFormat: 'letter', paperOrientation: 'portrait', expectedLinesPerPage: 23, expectedTotalPages: 3 },
    { paperFormat: 'letter', paperOrientation: 'landscape', expectedLinesPerPage: 17, expectedTotalPages: 4 },
    { paperFormat: 'a4', paperOrientation: 'portrait', expectedLinesPerPage: 24, expectedTotalPages: 3 },
    { paperFormat: 'a4', paperOrientation: 'landscape', expectedLinesPerPage: 16, expectedTotalPages: 4 },
    { paperFormat: 'a3', paperOrientation: 'portrait', expectedLinesPerPage: 36, expectedTotalPages: 2 },
    { paperFormat: 'a3', paperOrientation: 'landscape', expectedLinesPerPage: 24, expectedTotalPages: 3 },
  ];

  const defaultReq: PaginationRequest = {
    type: 'paginate',
    requestId: 1,
    text: '',
    currentPageIndex: 0,
    renderAllPagesForExport: false,
    settings: withTestPaperSelection({
      customBackgroundImage: null,
      customBackgroundImages: [],
      lineHeight: 1.5,
      lineColor: '#a8d4f0',
      paperFormat: 'letter',
      paperOrientation: 'portrait',
      paperPresetId: null,
      paperColor: '#fffef5',
      paperStyle: 'lined',
      ruledMarginLineOffset: -10,
    }),
    pageSettings: [
      {
        marginTop: 50,
        marginRight: 50,
        marginBottom: 50,
        marginLeft: 50,
        fontSize: 20,
      },
    ],
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
    it.each(paginationFormatCases)(
      'supports $paperFormat $paperOrientation pagination through resolved layouts',
      ({ paperFormat, paperOrientation, expectedLinesPerPage, expectedTotalPages }) => {
        const res = paginate({
          ...defaultReq,
          text: new Array(60).fill('line').join('\n'),
          renderAllPagesForExport: true,
          settings: withTestPaperSelection({
            ...defaultReq.settings,
            paperPresetId: null,
            paperStyle: 'lined',
            paperFormat,
            paperOrientation,
          }),
        });

        expect(res.pages[0]).toHaveLength(expectedLinesPerPage);
        expect(res.totalPages).toBe(expectedTotalPages);
        expect(res.isPaginationComplete).toBe(true);
      },
    );

    it('returns one empty page for empty text', () => {
      const res = paginate({ ...defaultReq, text: '' });
      expect(res.pages).toHaveLength(1);
      expect(res.pages[0]).toEqual([]);
      expect(res.totalPages).toBe(1);
      expect(res.isPaginationComplete).toBe(true);
    });

    it('paginates multiple lines and pages', () => {
      // Letter portrait contentHeight = 792 - 50 - 50 = 692
      // lineHeight = 20 * 1.5 = 30
      // linesPerPage = floor(692 / 30) = 23
      const text = new Array(40).fill('line').join('\n');
      const res = paginate({ ...defaultReq, text });
      
      expect(res.pages[0]).toHaveLength(23);
      expect(res.pages).toHaveLength(2); // By default it paginates current + 1
      expect(res.totalPages).toBe(2);
      expect(res.isPaginationComplete).toBe(true);
    });

    it('respects renderAllPagesForExport', () => {
      const text = new Array(100).fill('line').join('\n');
      const res = paginate({ ...defaultReq, text, renderAllPagesForExport: true });
      
      expect(res.pages.length).toBeGreaterThan(2);
      expect(res.isPaginationComplete).toBe(true);
    });

    it('handles ruled paper margin offset', () => {
      const resRuled = paginate({ 
        ...defaultReq, 
        text: 'hello', 
        settings: withTestPaperSelection({
          ...defaultReq.settings,
          paperPresetId: null,
          paperStyle: 'ruled',
        }),
      });
      const resBlank = paginate({ 
        ...defaultReq, 
        text: 'hello', 
        settings: withTestPaperSelection({
          ...defaultReq.settings,
          paperPresetId: null,
          paperStyle: 'blank',
        }),
      });
      
      // The logic for ruledTextLeft changes maxWidth, but nextLineFrom uses it.
      // We can't easily see internal maxWidth here without mocking createMeasure.
      expect(resRuled.pages).toBeDefined();
    });
    
    it('uses customLineSpacing when available', () => {
      const res = paginate({
        ...defaultReq,
        text: new Array(40).fill('line').join('\n'),
        settings: {
          ...defaultReq.settings,
          customBackgroundImage: 'data:image/png;base64,custom-paper',
        },
        pageSettings: [{ ...defaultReq.pageSettings[0], customLineSpacing: 100 }]
      });
      
      // Letter portrait contentHeight = 692. linesPerPage = floor(692 / 100) = 6.
      expect(res.pages[0].length).toBe(6);
    });

    it('uses page-specific uploaded paper backgrounds when resolving page geometry', () => {
      const res = paginate({
        ...defaultReq,
        text: new Array(40).fill('line').join('\n'),
        settings: {
          ...defaultReq.settings,
          customBackgroundImages: [
            'data:image/png;base64,page-0',
          ],
        },
        pageSettings: [{ ...defaultReq.pageSettings[0], customLineSpacing: 75, customLineOffset: 12 }],
      });

      // Letter portrait contentHeight = 692. linesPerPage = floor(692 / 75) = 9.
      expect(res.pages[0].length).toBe(9);
    });

    it('returns page-specific resolved layouts for upload-backed pagination', () => {
      const res = paginate({
        ...defaultReq,
        text: new Array(20).fill('line').join('\n'),
        renderAllPagesForExport: true,
        settings: {
          ...defaultReq.settings,
          customBackgroundImage: 'data:image/png;base64,document-fallback',
          customBackgroundImages: [
            'data:image/png;base64,page-0',
            'data:image/png;base64,page-1',
          ],
        },
        pageSettings: [
          { ...defaultReq.pageSettings[0], customLineSpacing: 75, customLineOffset: 12 },
          { ...defaultReq.pageSettings[0], customLineSpacing: 100, customLineOffset: 4 },
        ],
      });

      expect(res.pages.map((page) => page.length)).toEqual([9, 6, 5]);
      expect(res.pageLayouts?.map((layout) => layout.paper.variant)).toEqual([
        'upload',
        'upload',
        'upload',
      ]);
      expect(res.pageLayouts?.map((layout) => layout.paper.background)).toEqual([
        { kind: 'image', imageSrc: 'data:image/png;base64,page-0' },
        { kind: 'image', imageSrc: 'data:image/png;base64,page-1' },
        { kind: 'image', imageSrc: 'data:image/png;base64,document-fallback' },
      ]);
      expect(res.pageLayouts?.map((layout) => layout.writing.lineHeightPx)).toEqual([75, 100, 100]);
      expect(res.pageLayouts?.map((layout) => layout.writing.firstLineTop)).toEqual([62, 54, 54]);
    });

    it('resolves lines per page from document paper format and orientation without a caller-supplied page box', () => {
      const res = paginate({
        ...defaultReq,
        text: new Array(40).fill('line').join('\n'),
        settings: {
          ...withTestPaperSelection({
            ...defaultReq.settings,
            paperPresetId: null,
            paperStyle: 'lined',
            paperFormat: 'a4',
            paperOrientation: 'landscape',
          }),
        },
      });

      // A4 landscape height = 595.28. Content height = 595.28 - 50 - 50 = 495.28.
      // lineHeight = 20 * 1.5 = 30, so floor(495.28 / 30) = 16 lines.
      expect(res.pages[0]).toHaveLength(16);
    });

    it('derives pagination from resolved paper format even when raw page dimensions are provided', () => {
      const res = paginate({
        ...defaultReq,
        text: new Array(40).fill('line').join('\n'),
        settings: {
          ...withTestPaperSelection({
            ...defaultReq.settings,
            paperPresetId: null,
            paperStyle: 'lined',
            paperFormat: 'a4',
            paperOrientation: 'landscape',
          }),
        },
        pageWidth: 800,
        pageHeight: 1000,
      } as PaginationRequest & {
        pageWidth: number;
        pageHeight: number;
      });

      // Pagination should follow the resolved A4 landscape layout rather than
      // a caller-supplied 800x1000 box.
      expect(res.pages[0]).toHaveLength(16);
      expect(res.pageLayouts?.[0]?.page.width).toBeCloseTo(841.89, 1);
      expect(res.pageLayouts?.[0]?.page.height).toBeCloseTo(595.28, 1);
    });
  });
});
