import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedPagePainter, PaintPageOptions } from '../UnifiedPagePainter';
import { HandwritingSettings, PageSettings, DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../../types';

function createMockCtx() {
  return {
    scale: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({
      width: 10,
      fontBoundingBoxAscent: 20,
      fontBoundingBoxDescent: 5,
      actualBoundingBoxAscent: 18,
      actualBoundingBoxDescent: 4,
    }),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textBaseline: '' as CanvasTextBaseline,
    globalAlpha: 1,
    canvas: { width: 0, height: 0 },
  } as unknown as CanvasRenderingContext2D;
}

function defaultPaintOptions(overrides?: Partial<PaintPageOptions>): PaintPageOptions {
  const settings: HandwritingSettings = { ...DEFAULT_SETTINGS };
  const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
  return {
    ctx: createMockCtx(),
    pageIndex: 0,
    lines: [{ text: 'Hello', lineIndex: 0, hasNewline: false }],
    pageSettings,
    settings,
    scaleFactor: 1,
    fontFamily: 'Caveat, cursive',
    ...overrides,
  };
}

describe('UnifiedPagePainter', () => {
  describe('paintPage - background rendering', () => {
    it('fills the entire canvas area with the paper color when no custom background', () => {
      const ctx = createMockCtx();
      const opts = defaultPaintOptions({ ctx });

      UnifiedPagePainter.paintPage(opts);

      // fillRect should be called at least once for the background
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 612, 792);
    });

    it('does not fill with paper color when custom background image is provided', () => {
      const ctx = createMockCtx();
      const opts = defaultPaintOptions({
        ctx,
        settings: { ...DEFAULT_SETTINGS, customBackgroundImage: 'data:image/png;base64,abc' },
      });

      // paintPage with background just skips fill (background image is drawn separately via drawBackgroundImage)
      UnifiedPagePainter.paintPage(opts);

      // fillRect should not be called for the background
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('paintPage - paper lines', () => {
    it('draws horizontal lines for lined paper style', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS, paperStyle: 'lined' as const };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const opts = defaultPaintOptions({ ctx, settings, pageSettings });

      UnifiedPagePainter.paintPage(opts);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.strokeStyle).toBe('#9ec7e9');
    });

    it('does not draw paper lines for blank paper style', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS, paperStyle: 'blank' as const };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const opts = defaultPaintOptions({ ctx, settings, pageSettings });

      UnifiedPagePainter.paintPage(opts);

      expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('draws both horizontal and vertical lines for grid style', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS, paperStyle: 'grid' as const };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const opts = defaultPaintOptions({ ctx, settings, pageSettings });

      UnifiedPagePainter.paintPage(opts);

      // Grid draws both horizontal and vertical lines → multiple beginPath calls
      const strokeCount = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(strokeCount).toBeGreaterThan(1);
    });

    it('draws a vertical red margin line for ruled style', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS, paperStyle: 'ruled' as const };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const opts = defaultPaintOptions({ ctx, settings, pageSettings });

      UnifiedPagePainter.paintPage(opts);

      // Ruled style sets strokeStyle to '#ffb3b3' for the margin line
      const strokeStyleSets = (ctx as any).__proto__; // can't easily track property sets, but we check moveTo calls
      // The margin line is drawn vertically
      const moveToCalls = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
      const lineToCalls = (ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls;
      // There should be at least one vertical line (same x for moveTo and lineTo)
      const verticalLines = moveToCalls.filter((call: number[], idx: number) => {
        const lineToCall = lineToCalls[idx];
        return lineToCall && call[0] === lineToCall[0]; // same x = vertical
      });
      expect(verticalLines.length).toBeGreaterThan(0);
    });
  });

  describe('paintPage - text rendering', () => {
    it('renders each non-space character via fillText', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const opts = defaultPaintOptions({
        ctx,
        settings,
        pageSettings,
        lines: [{ text: 'Hi', lineIndex: 0, hasNewline: false }],
      });

      UnifiedPagePainter.paintPage(opts);

      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const chars = fillTextCalls.map((c: any[]) => c[0]);
      expect(chars).toContain('H');
      expect(chars).toContain('i');
    });

    it('skips spaces when rendering characters', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const opts = defaultPaintOptions({
        ctx,
        settings,
        pageSettings,
        lines: [{ text: 'A B', lineIndex: 0, hasNewline: false }],
      });

      UnifiedPagePainter.paintPage(opts);

      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const chars = fillTextCalls.map((c: any[]) => c[0]);
      expect(chars).toContain('A');
      expect(chars).toContain('B');
      expect(chars).not.toContain(' ');
    });

    it('sets the font correctly based on pageSettings and fontFamily', () => {
      const ctx = createMockCtx();
      const pageSettings = { ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS), fontSize: 32 };
      const opts = defaultPaintOptions({ ctx, pageSettings, fontFamily: 'TestFont' });

      UnifiedPagePainter.paintPage(opts);

      expect(ctx.font).toBe('32px TestFont');
    });

    it('uses ink color from page settings', () => {
      const ctx = createMockCtx();
      const pageSettings = { ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS), inkColor: '#ff0000' };
      const opts = defaultPaintOptions({
        ctx,
        pageSettings,
        lines: [{ text: 'X', lineIndex: 0, hasNewline: false }],
        settings: { ...DEFAULT_SETTINGS },
      });

      UnifiedPagePainter.paintPage(opts);

      // fillStyle should be set to ink color before drawing text
      // After paper lines, it's set to ink color
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillTextCalls.length).toBeGreaterThan(0);
      // The last fillStyle set before fillText should be the ink color
      expect(ctx.fillStyle).toBe('#ff0000');
    });
  });

  describe('paintPage - scale factor', () => {
    it('uses the same drawing logic regardless of scale factor', () => {
      // Render at scale 1 and scale 4, both should draw text at the same logical coords
      const ctx1 = createMockCtx();
      const ctx2 = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const lines = [{ text: 'A', lineIndex: 0, hasNewline: false }];

      UnifiedPagePainter.paintPage(defaultPaintOptions({ ctx: ctx1, settings, pageSettings, lines, scaleFactor: 1 }));
      UnifiedPagePainter.paintPage(defaultPaintOptions({ ctx: ctx2, settings, pageSettings, lines, scaleFactor: 4 }));

      // The fill text calls should be at the same logical coordinates
      // (scale is handled by ctx.scale, not by changing coords)
      const calls1 = (ctx1.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const calls2 = (ctx2.fillText as ReturnType<typeof vi.fn>).mock.calls;
      // fillText is called at (0, 0) after translate - verify same call count
      expect(calls1.length).toBe(calls2.length);
    });
  });

  describe('paintPage - line tilt', () => {
    it('applies line tilt rotation once at the start of text block, not per character', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = { ...defaultPageSettingsFromHandwritingSettings(settings), lineTilt: 5 };
      const opts = defaultPaintOptions({
        ctx,
        settings,
        pageSettings,
        lines: [{ text: 'AB', lineIndex: 0, hasNewline: false }],
      });

      UnifiedPagePainter.paintPage(opts);

      // Should be called once for the entire text block, not twice for 'AB'
      expect(ctx.rotate).toHaveBeenCalledTimes(1);
      expect(ctx.rotate).toHaveBeenCalledWith((5 * Math.PI) / 180);
    });
  });

  describe('computeCharacterPositions', () => {
    it('returns position data for each character in all lines', () => {
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const ctx = createMockCtx();
      const lines = [
        { text: 'AB', lineIndex: 0, hasNewline: true },
        { text: 'C', lineIndex: 1, hasNewline: false },
      ];

      const positions = UnifiedPagePainter.computeCharacterPositions({
        ctx,
        lines,
        pageSettings,
        settings,
        fontFamily: 'Caveat',
      });

      expect(positions.mainPositions.length).toBe(4); // A, B, newline, C
      // Each position should have x, y, width
      for (const pos of positions.mainPositions) {
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(pos).toHaveProperty('width');
        expect(pos).toHaveProperty('height');
        expect(pos).toHaveProperty('lineIndex');
        expect(pos).toHaveProperty('charIndex');
      }
    });

    it('includes explicit newline positions so caret indices stay aligned with textarea text', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
      };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const ctx = createMockCtx();
      const lines = [
        { text: 'A', lineIndex: 0, hasNewline: true },
        { text: 'B', lineIndex: 1, hasNewline: false },
      ];

      const positions = UnifiedPagePainter.computeCharacterPositions({
        ctx,
        lines,
        pageSettings,
        settings,
        fontFamily: 'Caveat',
      });

      expect(positions.mainPositions).toHaveLength(3);
      expect(positions.mainPositions[0]).toMatchObject({ width: 10, lineIndex: 0, charIndex: 0 });
      expect(positions.mainPositions[1]).toMatchObject({ width: 0, lineIndex: 0, charIndex: 1 });
      expect(positions.mainPositions[2]).toMatchObject({ x: pageSettings.marginLeft, lineIndex: 1, charIndex: 0 });
       expect(positions.mainPositions[2]!.y).toBe(pageSettings.marginTop + (pageSettings.fontSize * settings.lineHeight));
    });

    it('returns a single anchor position for empty lines to support cursor rendering', () => {
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
      const ctx = createMockCtx();

      const positions = UnifiedPagePainter.computeCharacterPositions({
        ctx,
        lines: [],
        pageSettings,
        settings,
        fontFamily: 'Caveat',
      });

      expect(positions.mainPositions).toHaveLength(1);
      expect(positions.mainPositions[0].charIndex).toBe(0);
      expect(positions.mainPositions[0].width).toBe(0);
    });

  });

  describe('paintCursorOverlay', () => {
    it('draws a cursor line at the specified character position', () => {
      const ctx = createMockCtx();
      const charPositions = [
        { x: 60, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 0 },
        { x: 70, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 1 },
      ];

      UnifiedPagePainter.paintCursorOverlay(ctx, charPositions, 1, '#1a365d');

      // Should draw a cursor (fillRect for the cursor line)
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('does NOT stretch the caret when customLineSpacing is large', () => {
      const ctx = createMockCtx();
      const settings: HandwritingSettings = { 
          ...DEFAULT_SETTINGS,
          customBackgroundImage: 'data:image/png;base64,abc' // Enable customLineSpacing
      };
      const pageSettings = {
          ...defaultPageSettingsFromHandwritingSettings(settings),
          fontSize: 20,
          customLineSpacing: 100 // Large line spacing
      };

      const lines = [{ text: 'A', lineIndex: 0, hasNewline: false }];
      
      const { mainPositions } = UnifiedPagePainter.computeCharacterPositions({
        ctx,
        lines,
        pageSettings,
        settings,
        fontFamily: 'Arial',
      });

      // Check the height of the first character position (hit area) still covers the line height
      expect(mainPositions[0].height).toBe(100);
      // The caret height should be the font's height (20 + 5 = 25 in our mock)
      expect(mainPositions[0].cursorHeight).toBe(25);

      // Paint the cursor at index 0
      UnifiedPagePainter.paintCursorOverlay(ctx, mainPositions, 0, '#000000');

      // The cursor should be painted with height 25 (fontAscent + fontDescent)
      const lastCall = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.find((call: any[]) => call[2] === 2); // width is 2
      expect(lastCall).toBeDefined();
      if (lastCall) {
          expect(lastCall[3]).toBe(25);
      }
    });

    it('applies line tilt rotation to cursor overlay', () => {
      const ctx = createMockCtx();
      const charPositions = [
        { x: 60, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 0 },
      ];

      UnifiedPagePainter.paintCursorOverlay(ctx, charPositions, 0, '#1a365d', 5);

      expect(ctx.rotate).toHaveBeenCalledWith((5 * Math.PI) / 180);
    });
  });

  describe('paintSelectionOverlay', () => {
    it('draws selection rectangles for selected character range', () => {
      const ctx = createMockCtx();
      const charPositions = [
        { x: 60, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 0 },
        { x: 70, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 1 },
        { x: 80, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 2 },
      ];

      UnifiedPagePainter.paintSelectionOverlay(ctx, charPositions, 0, 2, '#1a365d');

      // Should draw selection rectangles with the native blue color
      expect(ctx.fillStyle).toBe('rgba(0, 122, 255, 0.35)');
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('applies line tilt rotation to selection overlay', () => {
      const ctx = createMockCtx();
      const charPositions = [
        { x: 60, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 0 },
      ];

      UnifiedPagePainter.paintSelectionOverlay(ctx, charPositions, 0, 1, '#1a365d', 5);

      expect(ctx.rotate).toHaveBeenCalledWith((5 * Math.PI) / 180);
    });

    it('does not draw when selection range is empty', () => {
      const ctx = createMockCtx();
      const charPositions = [
        { x: 60, y: 60, width: 10, height: 24, lineIndex: 0, charIndex: 0 },
      ];

      UnifiedPagePainter.paintSelectionOverlay(ctx, charPositions, 0, 0, '#1a365d');

      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

     it('aligns the selection highlight with the caret height and position', () => {
       const ctx = createMockCtx();
       const settings = {
         ...DEFAULT_SETTINGS,
       };
       const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
       const positions = UnifiedPagePainter.computeCharacterPositions({
         ctx,
         lines: [{ text: 'A', lineIndex: 0, hasNewline: false }],
         pageSettings,
         settings,
         fontFamily: 'Caveat',
       });

       UnifiedPagePainter.paintSelectionOverlay(ctx, positions.mainPositions, 0, 1, '#1a365d');

       const [x, y, width, height] = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0];
       expect(x).toBe(pageSettings.marginLeft);
       // halfLeading = (43.2 - 24) / 2 = 9.6
       // selectionY = marginTop + halfLeading = marginTop + 9.6
       expect(y).toBeCloseTo(pageSettings.marginTop + 9.6, 1);
       expect(width).toBe(10);
       // selectionHeight = fontAscent + fontDescent = 20 + 5 = 25
       expect(height).toBeCloseTo(25, 1);
     });

     it('computes contiguous selectionX values', () => {
       const ctx = createMockCtx();
       const settings = {
         ...DEFAULT_SETTINGS,
       };
       const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
       const positions = UnifiedPagePainter.computeCharacterPositions({
         ctx,
         lines: [{ text: 'AB', lineIndex: 0, hasNewline: false }],
         pageSettings,
         settings,
         fontFamily: 'Caveat',
       });

       // First character should have selectionX = marginLeft
       const first = positions.mainPositions[0]!;
       const second = positions.mainPositions[1]!;
       expect(first.selectionX).toBe(pageSettings.marginLeft);
       // Second character should have selectionX = end of first char (contiguous)
       expect(second.selectionX).toBe(first.selectionX! + first.selectionWidth!);
     });

     it('computes selectionWidth for contiguous highlight rects', () => {
       const ctx = createMockCtx();
       const settings = {
         ...DEFAULT_SETTINGS,
       };
       const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
       const positions = UnifiedPagePainter.computeCharacterPositions({
         ctx,
         lines: [{ text: 'A', lineIndex: 0, hasNewline: false }],
         pageSettings,
         settings,
         fontFamily: 'Caveat',
       });

       // selectionWidth should equal the character width
       expect(positions.mainPositions[0].selectionWidth).toBe(10);
     });

     it('aligns selection highlight correctly at low line spacing', () => {
       const ctx = createMockCtx();
       const settings = {
         ...DEFAULT_SETTINGS,
         customBackgroundImage: 'data:image/png;base64,abc', // Enable customLineSpacing
       };
       const pageSettings = {
         ...defaultPageSettingsFromHandwritingSettings(settings),
         customLineSpacing: 24, // Same as fontSize, minimal line spacing
         fontSize: 24,
       };
       const positions = UnifiedPagePainter.computeCharacterPositions({
         ctx,
         lines: [{ text: 'A', lineIndex: 0, hasNewline: false }],
         pageSettings,
         settings,
         fontFamily: 'Caveat',
       });

       UnifiedPagePainter.paintSelectionOverlay(ctx, positions.mainPositions, 0, 1, '#1a365d');

       const [x, y, width, height] = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0];
       // halfLeading = (24 - 24) / 2 = 0
       // selectionY = marginTop + 0 = marginTop
       expect(y).toBeCloseTo(pageSettings.marginTop, 1);
       expect(height).toBeCloseTo(25, 1); // fontAscent + fontDescent = 20 + 5 = 25
     });
   });

   describe('paintPage - text field rendering', () => {
    it('renders text fields when renderTextFields is true', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = {
        ...defaultPageSettingsFromHandwritingSettings(settings),
        textFields: [{
          id: '1',
          text: 'Hi',
          x: 100,
          y: 100,
          width: 50,
          height: 30,
          color: '#000000',
          fontSize: 16
        }]
      };
      const opts = defaultPaintOptions({ ctx, settings, pageSettings, renderTextFields: true });

      UnifiedPagePainter.paintPage(opts);

      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const chars = fillTextCalls.map((c: any[]) => c[0]);
      expect(chars).toContain('Hi');
      
      expect((ctx as any).font).toContain('16px');
    });

    it('skips text fields when renderTextFields is false', () => {
      const ctx = createMockCtx();
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = {
        ...defaultPageSettingsFromHandwritingSettings(settings),
        textFields: [{
          id: '1',
          text: 'Field',
          x: 100,
          y: 100,
          width: 50,
          height: 30,
          color: '#000000',
          fontSize: 16
        }]
      };
      const opts = defaultPaintOptions({ ctx, settings, pageSettings, renderTextFields: false, lines: [] });

      UnifiedPagePainter.paintPage(opts);

      expect(ctx.fillText).not.toHaveBeenCalled();
    });
  });
});
