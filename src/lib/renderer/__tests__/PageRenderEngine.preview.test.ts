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
import { withTestPaperSelection } from '@/test/paperTestHelpers';
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

const withResolvedPaperPreset = withTestPaperSelection;

const originalDevicePixelRatio = window.devicePixelRatio;

beforeEach(() => {
  vi.stubGlobal('Image', MockImage);
  Object.defineProperty(globalThis, 'devicePixelRatio', {
    configurable: true,
    value: 1,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'devicePixelRatio', {
    configurable: true,
    value: originalDevicePixelRatio,
  });
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CreatePreviewSettingsArgs {
  paperFormat?: 'letter' | 'a4' | 'a3';
  paperOrientation?: 'portrait' | 'landscape';
  overrides?: Record<string, any>;
}

function createPreviewSettings({
  paperFormat = 'letter',
  paperOrientation = 'portrait',
  overrides = {},
}: CreatePreviewSettingsArgs = {}) {
  return withResolvedPaperPreset({
    paperFormat,
    paperOrientation,
    randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    ...overrides,
  });
}

interface RenderPageArgs {
  settings: any;
  pageSettings?: any;
  lines?: any[];
  scale?: number;
}

async function renderPreviewPage({
  settings,
  pageSettings,
  lines = [],
  scale = 1,
}: RenderPageArgs) {
  const finalPageSettings = pageSettings ?? defaultPageSettingsFromHandwritingSettings(settings);
  const engine = new PageRenderEngine();
  const ctx = createMockCtx();
  const canvas = createMockCanvas(ctx);

  const result = await engine.renderPage({
    canvas,
    mode: 'preview',
    pageIndex: 0,
    lines,
    pageSettings: finalPageSettings,
    settings,
    scale,
    fontFamily: 'Caveat, cursive',
  });

  return { result, canvas, ctx };
}

async function renderExportPage({
  settings,
  pageSettings,
  lines = [],
  scale = 1,
}: RenderPageArgs) {
  const finalPageSettings = pageSettings ?? defaultPageSettingsFromHandwritingSettings(settings);
  const engine = new PageRenderEngine();
  const ctx = createMockCtx();
  const canvas = createMockCanvas(ctx);

  const result = await engine.renderPage({
    canvas,
    mode: 'export',
    pageIndex: 0,
    lines,
    pageSettings: finalPageSettings,
    settings,
    scale,
    fontFamily: 'Caveat, cursive',
  });

  return { result, canvas, ctx };
}

function extractFillTextChars(ctx: CanvasRenderingContext2D) {
  const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
  return fillTextCalls.map((c: unknown[]) => c[0] as string);
}

async function renderCharacterPositionHelper({
  settings,
  pageSettings,
  char,
}: {
  settings: any;
  pageSettings?: any;
  char: string;
}) {
  const { result } = await renderPreviewPage({
    settings,
    pageSettings,
    lines: [{ text: char, lineIndex: 0, hasNewline: false }],
  });
  return {
    firstPos: result.characterPositions[0],
    layout: result.layout,
  };
}

// ---------------------------------------------------------------------------
// Page sizing tests using resolved geometry
// ---------------------------------------------------------------------------

describe('PageRenderEngine preview — page sizing uses resolved geometry', () => {
  it.each([
    { format: 'letter' as const, orientation: 'portrait' as const, expectedWidth: 612, expectedHeight: 792, precision: 0, isLandscape: false, assertCanvas: true },
    { format: 'a4' as const, orientation: 'portrait' as const, expectedWidth: 595.28, expectedHeight: 841.89, precision: 1, isLandscape: false, assertCanvas: true },
    { format: 'a4' as const, orientation: 'landscape' as const, expectedWidth: 841.89, expectedHeight: 595.28, precision: 1, isLandscape: true, assertCanvas: true },
    { format: 'a3' as const, orientation: 'portrait' as const, expectedWidth: 841.89, expectedHeight: 1190.55, precision: 1, isLandscape: false, assertCanvas: true },
    { format: 'a3' as const, orientation: 'landscape' as const, expectedWidth: 1190.55, expectedHeight: 841.89, precision: 1, isLandscape: true, assertCanvas: true },
    { format: 'letter' as const, orientation: 'landscape' as const, expectedWidth: 792, expectedHeight: 612, precision: 0, isLandscape: true, assertCanvas: false },
  ])(
    'sets canvas dimensions from resolved $format $orientation page size',
    async ({ format, orientation, expectedWidth, expectedHeight, precision, isLandscape, assertCanvas }) => {
      const settings = createPreviewSettings({ paperFormat: format, paperOrientation: orientation });
      const { result, canvas } = await renderPreviewPage({ settings });

      if (isLandscape) {
        expect(result.layout.page.width).toBeGreaterThan(result.layout.page.height);
      }
      expect(result.layout.page.width).toBeCloseTo(expectedWidth, precision);
      expect(result.layout.page.height).toBeCloseTo(expectedHeight, precision);

      if (assertCanvas) {
        expect(canvas.width).toBe(Math.ceil(result.layout.page.width));
        expect(canvas.height).toBe(Math.ceil(result.layout.page.height));
      }
    }
  );
});

// ---------------------------------------------------------------------------
// Character positions fall within resolved page bounds (interaction geometry)
// ---------------------------------------------------------------------------

describe('PageRenderEngine preview — character positions respect resolved page bounds', () => {
  it('character positions for A4 portrait start at the A4 text bounds left edge, not Letter left edge', async () => {
    const settings = createPreviewSettings({ paperFormat: 'a4' as const, paperOrientation: 'portrait' as const });
    const { firstPos, layout } = await renderCharacterPositionHelper({ settings, char: 'A' });

    const expectedTextLeft = layout.writing.textBounds.left;
    expect(expectedTextLeft).toBe(85);

    expect(firstPos).toBeDefined();
    expect(firstPos.x).toBeCloseTo(expectedTextLeft, 0);
  });

  it('character positions for A4 landscape start at A4 landscape text bounds', async () => {
    const settings = createPreviewSettings({ paperFormat: 'a4' as const, paperOrientation: 'landscape' as const });
    const { firstPos, layout } = await renderCharacterPositionHelper({ settings, char: 'B' });

    expect(layout.page.width).toBeGreaterThan(layout.page.height);

    expect(firstPos).toBeDefined();
    expect(firstPos.x).toBeCloseTo(layout.writing.textBounds.left, 0);
  });

  it('character y position starts at firstLineTop from resolved writing layout, not a fixed offset', async () => {
    const settings = createPreviewSettings({ paperFormat: 'a4' as const, paperOrientation: 'portrait' as const });
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(settings),
      marginTop: 80,
    };
    const { firstPos, layout } = await renderCharacterPositionHelper({ settings, pageSettings, char: 'C' });

    expect(firstPos).toBeDefined();
    expect(firstPos.y).toBeCloseTo(layout.writing.firstLineTop, 0);
  });
});

// ---------------------------------------------------------------------------
// Ruled-margin drag bounds use resolved layout, not fixed geometry assumptions
// ---------------------------------------------------------------------------

describe('resolvePageLayout — ruled-margin interaction bounds come from resolved geometry', () => {
  it('resolved page.width for Letter portrait is 612 (the drag ceiling for margin-line drag)', () => {
    const settings = createPreviewSettings({
      paperFormat: 'letter',
      paperOrientation: 'portrait',
      overrides: { paperStyle: 'ruled' },
    });
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const layout = resolvePageLayout({ pageIndex: 0, settings, pageSettings });

    expect(layout.page.width).toBeCloseTo(612, 0);
    expect(layout.writing.textBounds.left).toBeGreaterThan(0);
    expect(layout.writing.textBounds.left).toBeLessThan(layout.page.width);
  });

  it('marginLineX for A4 portrait ruled paper stays within A4 page bounds', () => {
    const settings = createPreviewSettings({
      paperFormat: 'a4',
      paperOrientation: 'portrait',
      overrides: { paperStyle: 'ruled', ruledMarginLineOffset: -10 },
    });
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const layout = resolvePageLayout({ pageIndex: 0, settings, pageSettings });

    expect(layout.page.width).toBeCloseTo(595.28, 1);

    if (layout.paper.guides.kind === 'ruled') {
      expect(layout.paper.guides.marginLineX).toBeLessThan(layout.page.width);
      expect(layout.paper.guides.marginLineX).toBeGreaterThan(0);
    }
  });

  it('drag-bound clamping uses resolved page width for A3 landscape paper', () => {
    const settings = createPreviewSettings({
      paperFormat: 'a3',
      paperOrientation: 'landscape',
      overrides: { paperStyle: 'ruled' },
    });
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const layout = resolvePageLayout({ pageIndex: 0, settings, pageSettings });

    const maxDragX = layout.page.width;
    expect(maxDragX).toBeCloseTo(1190.55, 1);
    expect(maxDragX).toBeGreaterThan(792);
  });
});

// ---------------------------------------------------------------------------
// Text-field placement works across page sizes and orientations
// ---------------------------------------------------------------------------

describe('PageRenderEngine export — text-field rendering works on non-Letter pages', () => {
  it.each([
    {
      format: 'a4' as const,
      orientation: 'landscape' as const,
      char: 'X',
      fieldId: 'field-a4',
      fieldX: 50,
      fieldY: 50,
      fontSize: 20,
      color: '#111111',
    },
    {
      format: 'a3' as const,
      orientation: 'portrait' as const,
      char: 'Z',
      fieldId: 'field-a3',
      fieldX: 100,
      fieldY: 100,
      fontSize: 18,
      color: '#222222',
    },
  ])(
    'renders a text field on an $format $orientation export page',
    async ({ format, orientation, char, fieldId, fieldX, fieldY, fontSize, color }) => {
      const settings = createPreviewSettings({ paperFormat: format, paperOrientation: orientation });
      const pageSettings = {
        ...defaultPageSettingsFromHandwritingSettings(settings),
        textFields: [
          {
            id: fieldId,
            text: char,
            x: fieldX,
            y: fieldY,
            width: 100,
            height: 30,
            color,
            fontSize,
          },
        ],
      };
      const { ctx } = await renderExportPage({ settings, pageSettings });
      const chars = extractFillTextChars(ctx);
      expect(chars).toContain(char);
    }
  );
});

// ---------------------------------------------------------------------------
// Resolved layout paper variant is consistent with the engine output
// ---------------------------------------------------------------------------

describe('PageRenderEngine — returned layout reflects the paper source variant', () => {
  it('returns a preset variant layout for a standard lined Letter portrait render', async () => {
    const settings = createPreviewSettings({
      paperFormat: 'letter',
      paperOrientation: 'portrait',
      overrides: { paperStyle: 'lined' },
    });
    const { result } = await renderPreviewPage({ settings });

    expect(result.layout.paper.variant).toBe('preset');
    expect(result.layout.paper.presetId).not.toBeNull();
  });

  it('returns an upload variant layout when a custom background image is provided', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      customBackgroundImage: 'data:image/png;base64,abc123',
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const { result } = await renderPreviewPage({ settings });

    expect(result.layout.paper.variant).toBe('upload');
    expect(result.layout.paper.background.kind).toBe('image');
  });
});

// ---------------------------------------------------------------------------
// Scale factor propagates through the engine correctly
// ---------------------------------------------------------------------------

describe('PageRenderEngine — scale factor applied from engine, not from callers', () => {
  it('applies a 2× scale to canvas dimensions without a DPR multiplier in export mode', async () => {
    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: 3 });

    const settings = {
      ...DEFAULT_SETTINGS,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const scale = 2;
    const { result, canvas, ctx } = await renderExportPage({ settings, scale });

    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * scale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * scale));
    expect(ctx.scale).toHaveBeenCalledWith(scale, scale);
  });

  it('applies DPR to canvas dimensions in preview mode', async () => {
    const dpr = 2;
    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: dpr });

    const settings = {
      ...DEFAULT_SETTINGS,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    };
    const scale = 1.5;
    const { result, canvas, ctx } = await renderPreviewPage({ settings, scale });

    const renderScale = scale * dpr;
    expect(canvas.width).toBe(Math.ceil(result.layout.page.width * renderScale));
    expect(canvas.height).toBe(Math.ceil(result.layout.page.height * renderScale));
    expect(ctx.scale).toHaveBeenCalledWith(renderScale, renderScale);
  });
});
