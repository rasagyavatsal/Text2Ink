import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import { PageRenderEngine } from '../PageRenderEngine';

const originalDevicePixelRatio = window.devicePixelRatio;

class MockImage {
  static instances = 0;

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  #src = '';

  constructor() {
    MockImage.instances += 1;
  }

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this.#src;
  }
}

describe('PageRenderEngine', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    MockImage.instances = 0;
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });

    mockCtx = {
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
        actualBoundingBoxAscent: 15,
        actualBoundingBoxDescent: 5,
      }),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: originalDevicePixelRatio,
    });
    vi.unstubAllGlobals();
  });

  it('renders preview pages immediately and reuses the cached background on the next render', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      randomness: {
        ...DEFAULT_SETTINGS.randomness,
        enabled: false,
      },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();

    const firstRender = await engine.renderPage({
      canvas: mockCanvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [{ text: 'Hi', lineIndex: 0, hasNewline: false }],
      pageSettings,
      settings,
      scale: 1.5,
      fontFamily: 'Caveat, cursive',
    });

    expect(mockCanvas.width).toBe(Math.ceil(612 * 3));
    expect(mockCanvas.height).toBe(Math.ceil(792 * 3));
    expect(mockCtx.scale).toHaveBeenCalledWith(3, 3);
    expect(mockCtx.drawImage).not.toHaveBeenCalled();
    expect(mockCtx.beginPath).not.toHaveBeenCalled();
    expect(firstRender.layout.paper.background.kind).toBe('image');
    expect(firstRender.characterPositions).toHaveLength(2);
    expect(firstRender.pendingBackground).not.toBeNull();

    await firstRender.pendingBackground;

    const secondRender = await engine.renderPage({
      canvas: mockCanvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [{ text: 'Hi', lineIndex: 0, hasNewline: false }],
      pageSettings,
      settings,
      scale: 1.5,
      fontFamily: 'Caveat, cursive',
    });

    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(secondRender.pendingBackground).toBeNull();
  });

  it('renders export pages without preview dpr scaling and includes text fields', async () => {
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: 4,
    });

    const settings = {
      ...DEFAULT_SETTINGS,
      randomness: {
        ...DEFAULT_SETTINGS.randomness,
        enabled: false,
      },
    };
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(settings),
      textFields: [
        {
          id: 'field-1',
          text: 'A',
          x: 10,
          y: 20,
          width: 100,
          height: 30,
          color: '#111111',
          fontSize: 24,
        },
      ],
    };
    const engine = new PageRenderEngine();

    const result = await engine.renderPage({
      canvas: mockCanvas,
      mode: 'export',
      pageIndex: 0,
      lines: [],
      pageSettings,
      settings,
      scale: 2,
      fontFamily: 'Caveat, cursive',
    });

    expect(mockCanvas.width).toBe(Math.ceil(612 * 2));
    expect(mockCanvas.height).toBe(Math.ceil(792 * 2));
    expect(mockCtx.scale).toHaveBeenCalledWith(2, 2);
    expect(mockCtx.fillText).toHaveBeenCalledTimes(1);
    expect(mockCtx.fillText).toHaveBeenCalledWith('A', 0, 0);
    expect(result.pendingBackground).toBeNull();
  });

  it('reuses the same loaded background image across repeated renders', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      randomness: {
        ...DEFAULT_SETTINGS.randomness,
        enabled: false,
      },
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    const engine = new PageRenderEngine();

    const firstRender = await engine.renderPage({
      canvas: mockCanvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [{ text: 'Hi', lineIndex: 0, hasNewline: false }],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });
    await firstRender.pendingBackground;

    await engine.renderPage({
      canvas: mockCanvas,
      mode: 'preview',
      pageIndex: 0,
      lines: [{ text: 'Hi', lineIndex: 0, hasNewline: false }],
      pageSettings,
      settings,
      scale: 1,
      fontFamily: 'Caveat, cursive',
    });

    expect(MockImage.instances).toBe(1);
  });
});
