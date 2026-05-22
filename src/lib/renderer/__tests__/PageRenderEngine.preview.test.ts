/**
 * Tests for issue #176: canvas preview and editor interactions use PageRenderEngine.
 *
 * Acceptance criteria:
 * - Preview drawing uses PageRenderEngine.
 * - On-screen page size reflects resolved paper geometry for Letter, A4, A3
 *   in portrait and landscape.
 * - Text-field placement and scaling logic works across supported sizes and
 *   orientations.
 * - Ruled-margin interaction bounds use resolved layout data, not fixed
 *   assumptions.
 * - No duplicate paper-specific geometry math in the preview/editor path.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import { resolvePageLayout } from '@/lib/layout/LayoutEngine';
import { PageRenderEngine } from '../PageRenderEngine';

// ---------------------------------------------------------------------------
// Shared canvas mock
// ---------------------------------------------------------------------------

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  #src = '';

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this.#src;
  }
}

function createMockCtx() {
  return {
    clearRect: vi.fn(),
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
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function createMockCanvas(ctx: CanvasRenderingContext2D) {
  const canvas = {
    getContext: vi.fn().mockReturnValue(ctx),
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement;
  return canvas;
}

const originalDevicePixelRatio = window.devicePixelRatio;

beforeEach(() => {
  vi.stubGlobal('Image', MockImage as unknown as typeof Image);
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 1,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: originalDevicePixelRatio,
  });
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tracer bullet: Letter portrait — the canonical default
// ---------------------------------------------------------------------------

describe('PageRenderEngine preview — page sizing uses resolved geometry', () => {
  it('sets canvas dimensions from resolved Letter portrait page size (612 × 792)', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'letter' as const,
      paperOrientation: 'portrait' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 1;

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    // Dimensions must come from resolved layout, not hard-coded constants.
    expect(result.layout.page.width).toBeCloseTo(612, 0);
    expect(result.layout.page.height).toBeCloseTo(792, 0);
    // Canvas pixels = page points × scale (DPR is 1 in this test).
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * scale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * scale));
  });

  // -------------------------------------------------------------------------
  // A4 portrait
  // -------------------------------------------------------------------------

  it('sets canvas dimensions from resolved A4 portrait page size (≈595 × 842)', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a4' as const,
      paperOrientation: 'portrait' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 1;

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    expect(result.layout.page.width).toBeCloseTo(595.28, 1);
    expect(result.layout.page.height).toBeCloseTo(841.89, 1);
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * scale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * scale));
  });

  // -------------------------------------------------------------------------
  // A4 landscape — page is rotated relative to portrait
  // -------------------------------------------------------------------------

  it('sets canvas dimensions from resolved A4 landscape page size (≈842 × 595)', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a4' as const,
      paperOrientation: 'landscape' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 1;

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    // Landscape: width > height
    expect(result.layout.page.width).toBeGreaterThan(result.layout.page.height);
    expect(result.layout.page.width).toBeCloseTo(841.89, 1);
    expect(result.layout.page.height).toBeCloseTo(595.28, 1);
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * scale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * scale));
  });

  // -------------------------------------------------------------------------
  // A3 portrait
  // -------------------------------------------------------------------------

  it('sets canvas dimensions from resolved A3 portrait page size (≈842 × 1191)', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a3' as const,
      paperOrientation: 'portrait' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 1;

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    expect(result.layout.page.width).toBeCloseTo(841.89, 1);
    expect(result.layout.page.height).toBeCloseTo(1190.55, 1);
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * scale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * scale));
  });

  // -------------------------------------------------------------------------
  // A3 landscape
  // -------------------------------------------------------------------------

  it('sets canvas dimensions from resolved A3 landscape page size (≈1191 × 842)', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a3' as const,
      paperOrientation: 'landscape' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 1;

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    expect(result.layout.page.width).toBeGreaterThan(result.layout.page.height);
    expect(result.layout.page.width).toBeCloseTo(1190.55, 1);
    expect(result.layout.page.height).toBeCloseTo(841.89, 1);
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * scale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * scale));
  });

  // -------------------------------------------------------------------------
  // Letter landscape
  // -------------------------------------------------------------------------

  it('sets canvas dimensions from resolved Letter landscape page size (≈792 × 612)', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'letter' as const,
      paperOrientation: 'landscape' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 1;

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    expect(result.layout.page.width).toBeGreaterThan(result.layout.page.height);
    expect(result.layout.page.width).toBeCloseTo(792, 0);
    expect(result.layout.page.height).toBeCloseTo(612, 0);
  });
});

// ---------------------------------------------------------------------------
// Character positions fall within resolved page bounds (interaction geometry)
// ---------------------------------------------------------------------------

describe('PageRenderEngine preview — character positions respect resolved page bounds', () => {
  it('character positions for A4 portrait start at the A4 text bounds left edge, not Letter left edge', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a4' as const,
      paperOrientation: 'portrait' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [{ text: 'A', lineIndex: 0, hasNewline: false }],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    // Text bounds left must come from the resolved layout for A4, not a hard-coded Letter value.
    const expectedTextLeft = result.layout.writing.textBounds.left;
    expect(expectedTextLeft).toBe(pageSettings.marginLeft);

    // The first character position must be at that left edge.
    const firstPos = result.characterPositions[0];
    expect(firstPos).toBeDefined();
    expect(firstPos!.x).toBeCloseTo(expectedTextLeft, 0);
  });

  it('character positions for A4 landscape start at A4 landscape text bounds', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a4' as const,
      paperOrientation: 'landscape' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [{ text: 'B', lineIndex: 0, hasNewline: false }],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    // Layout must reflect landscape dimensions.
    expect(result.layout.page.width).toBeGreaterThan(result.layout.page.height);

    const firstPos = result.characterPositions[0];
    expect(firstPos).toBeDefined();
    expect(firstPos!.x).toBeCloseTo(result.layout.writing.textBounds.left, 0);
  });

  it('character y position starts at firstLineTop from resolved writing layout, not a fixed offset', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a4' as const,
      paperOrientation: 'portrait' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(settings),
      marginTop: 80,
    };
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [{ text: 'C', lineIndex: 0, hasNewline: false }],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    // The character y must equal firstLineTop from the resolved layout.
    const firstPos = result.characterPositions[0];
    expect(firstPos).toBeDefined();
    expect(firstPos!.y).toBeCloseTo(result.layout.writing.firstLineTop, 0);
  });
});

// ---------------------------------------------------------------------------
// Ruled-margin drag bounds use resolved layout, not fixed geometry assumptions
// ---------------------------------------------------------------------------

describe('resolvePageLayout — ruled-margin interaction bounds come from resolved geometry', () => {
  /**
   * PaperEngine bakes ruled paper guides into the SVG background image, so
   * paper.guides.kind is always 'none' for built-in ruled presets — the drag
   * affordance in HandwritingEditor is effectively unreachable for those.
   *
   * The important invariant is that the drag-clamp ceiling (page.width) and
   * the marginLeft that HandwritingEditor reads for computing the new offset
   * come from the resolved layout, not from fixed constants.
   */
  it('resolved page.width for Letter portrait is 612 (the drag ceiling for margin-line drag)', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperStyle: 'ruled' as const,
      paperFormat: 'letter' as const,
      paperOrientation: 'portrait' as const,
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const layout = resolvePageLayout({ pageIndex: 0, settings, pageSettings });

    // HandwritingEditor uses layout.page.width as the drag ceiling.
    expect(layout.page.width).toBeCloseTo(612, 0);
    // And writing.textBounds.left as the baseline for offset calculation.
    expect(layout.writing.textBounds.left).toBeGreaterThan(0);
    expect(layout.writing.textBounds.left).toBeLessThan(layout.page.width);
  });

  it('marginLineX for A4 portrait ruled paper stays within A4 page bounds', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperStyle: 'ruled' as const,
      paperFormat: 'a4' as const,
      paperOrientation: 'portrait' as const,
      ruledMarginLineOffset: -10,
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const layout = resolvePageLayout({ pageIndex: 0, settings, pageSettings });

    // For the A4 upload/legacy-fallback case (custom backgrounds), guides are present
    // only when no built-in preset absorbs them.  If the preset resolves, guides.kind
    // is 'none' because the preset SVG carries the margin line.  Either way, the page
    // width should be the A4 width.
    expect(layout.page.width).toBeCloseTo(595.28, 1);

    if (layout.paper.guides.kind === 'ruled') {
      expect(layout.paper.guides.marginLineX).toBeLessThan(layout.page.width);
      expect(layout.paper.guides.marginLineX).toBeGreaterThan(0);
    }
  });

  it('drag-bound clamping uses resolved page width for A3 landscape paper', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperStyle: 'ruled' as const,
      paperFormat: 'a3' as const,
      paperOrientation: 'landscape' as const,
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const layout = resolvePageLayout({ pageIndex: 0, settings, pageSettings });

    // HandwritingEditor uses layout.page.width as the drag ceiling.
    const maxDragX = layout.page.width;
    expect(maxDragX).toBeCloseTo(1190.55, 1);
    // That must be wider than the Letter page width (612).
    expect(maxDragX).toBeGreaterThan(792);
  });
});

// ---------------------------------------------------------------------------
// Text-field placement works across page sizes and orientations
// ---------------------------------------------------------------------------

describe('PageRenderEngine export — text-field rendering works on non-Letter pages', () => {
  it('renders a text field on an A4 landscape export page', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a4' as const,
      paperOrientation: 'landscape' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(settings),
      textFields: [
        {
          id: 'field-a4',
          text: 'X',
          x: 50,
          y: 50,
          width: 100,
          height: 30,
          color: '#111111',
          fontSize: 20,
        },
      ],
    };
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);

    await engine.renderPage({
      canvas,
      mode: 'export',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    // The text field character 'X' must be rendered.
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const chars = fillTextCalls.map((c: unknown[]) => c[0]);
    expect(chars).toContain('X');
  });

  it('renders a text field on an A3 portrait export page', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a3' as const,
      paperOrientation: 'portrait' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(settings),
      textFields: [
        {
          id: 'field-a3',
          text: 'Z',
          x: 100,
          y: 100,
          width: 100,
          height: 30,
          color: '#222222',
          fontSize: 18,
        },
      ],
    };
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);

    await engine.renderPage({
      canvas,
      mode: 'export',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const chars = fillTextCalls.map((c: unknown[]) => c[0]);
    expect(chars).toContain('Z');
  });
});

// ---------------------------------------------------------------------------
// Resolved layout paper variant is consistent with the engine output
// ---------------------------------------------------------------------------

describe('PageRenderEngine — returned layout reflects the paper source variant', () => {
  it('returns a preset variant layout for a standard lined Letter portrait render', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'letter' as const,
      paperOrientation: 'portrait' as const,
      paperStyle: 'lined' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    expect(result.layout.paper.variant).toBe('preset');
    expect(result.layout.paper.presetId).not.toBeNull();
  });

  it('returns an upload variant layout when a custom background image is provided', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      customBackgroundImage: 'data:image/png;base64,abc123',
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    expect(result.layout.paper.variant).toBe('upload');
    expect(result.layout.paper.background.kind).toBe('image');
  });
});

// ---------------------------------------------------------------------------
// Scale factor propagates through the engine correctly
// ---------------------------------------------------------------------------

describe('PageRenderEngine — scale factor applied from engine, not from callers', () => {
  it('applies a 2× scale to canvas dimensions without a DPR multiplier in export mode', async () => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 });

    const settings = {
      ...DEFAULT_SETTINGS,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 2;

    const result = await engine.renderPage({
      canvas,
      mode: 'export',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    // Export mode must NOT apply DPR — canvas = pageWidth × scale only.
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * scale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * scale));
    expect(ctx.scale).toHaveBeenCalledWith(scale, scale);
  });

  it('applies DPR to canvas dimensions in preview mode', async () => {
    const dpr = 2;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: dpr });

    const settings = {
      ...DEFAULT_SETTINGS,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx);
    const scale = 1.5;

    const result = await engine.renderPage({
      canvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale,
      fontFamily: 'Caveat, cursive',
    });

    const renderScale = scale * dpr;
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * renderScale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * renderScale));
    expect(ctx.scale).toHaveBeenCalledWith(renderScale, renderScale);
  });
});
