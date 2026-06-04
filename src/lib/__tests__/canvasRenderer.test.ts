import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderPageToCanvas } from '../canvasRenderer';
import {
  type HandwritingSettings,
  type PageSettings,
  type LineData,
  defaultPageSettingsFromHandwritingSettings,
} from '../types';
import { withTestPaperSelection } from '@/test/paperTestHelpers';

// Mock the global Image for background loading
globalThis.Image = class {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  src: string = '';
  crossOrigin: string = '';
  constructor() {
    setTimeout(() => this.onload(), 0);
  }
} as any;

describe('canvasRenderer', () => {
  let mockCanvas: any;
  let mockCtx: any;

  const mockSettings: HandwritingSettings = withTestPaperSelection({
    lineHeight: 1.5,
    lineColor: '#000000',
    paperColor: '#ffffff',
    inkColor: '#111111',
    randomness: { enabled: true, spacing: 1, baseline: 1, rotation: 1 },
    marginLeft: 50,
    marginRight: 50,
    marginTop: 50,
    marginBottom: 50,
    ruledMarginLineOffset: 0,
    customBackgroundImage: null,
    customBackgroundImages: [],
    customLineOffset: 0,
    customLineSpacing: null,
    lineTilt: 0,
    customFont: null,
  });

  const mockPageSettings: PageSettings = {
    ...defaultPageSettingsFromHandwritingSettings(mockSettings),
    marginTop: 50,
    marginBottom: 50,
    marginLeft: 50,
    marginRight: 50,
    paperColor: '#ffffff',
    inkColor: '#111111',
    lineColor: '#000000',
    customBackgroundImage: null,
    customLineOffset: 0,
    customLineSpacing: null,
    lineTilt: 0,
  };

  const mockLines: LineData[] = [
    { text: 'Hello World', lineIndex: 0, hasNewline: true },
  ];

  beforeEach(() => {
    mockCtx = {
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
      textBaseline: '',
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      width: 0,
      height: 0,
    };
  });

  it('sets correct canvas dimensions based on scale', async () => {
    const scale = 2;
    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: mockSettings,
      scale,
      fontFamily: 'Caveat',
    });

    expect(mockCanvas.width).toBe(612 * scale); // 612 is PAGE_WIDTH
    expect(mockCanvas.height).toBe(792 * scale); // 792 is PAGE_HEIGHT
    expect(mockCtx.scale).toHaveBeenCalledWith(scale, scale);
  });

  it('sizes the canvas from the resolved paper format and orientation', async () => {
    const scale = 2;
    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: {
        ...withTestPaperSelection({
          ...mockSettings,
          paperFormat: 'a4',
          paperOrientation: 'landscape',
        }),
      },
      scale,
      fontFamily: 'Caveat',
    });

    expect(mockCanvas.width).toBe(Math.ceil(841.89 * scale));
    expect(mockCanvas.height).toBe(Math.ceil(595.28 * scale));
  });

  it('applies correct vertical centering offset', async () => {
    const settingsNoRandom = { 
      ...mockSettings, 
      randomness: { ...mockSettings.randomness, enabled: false } 
    };

    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: settingsNoRandom,
      scale: 1,
      fontFamily: 'Caveat',
    });

    expect(mockCtx.textBaseline).toBe('alphabetic');

    // Canonical lined paper now uses preset-authored baseline geometry.
    const translateCalls = mockCtx.translate.mock.calls;
    const yValue = translateCalls[0][1];
    expect(yValue).toBe(103.125);
  });

  it('renders built-in lined paper from the SVG background instead of synthetic guides', async () => {
    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: mockSettings,
      scale: 1,
      fontFamily: 'Caveat',
    });

    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(mockCtx.beginPath).not.toHaveBeenCalled();
    expect(mockCtx.stroke).not.toHaveBeenCalled();
  });

  it('skips background fill if custom background is provided', async () => {
    const settingsWithBg = { 
      ...mockSettings, 
      customBackgroundImage: 'data:image/png;base64,xxx' 
    };

    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: settingsWithBg,
      scale: 1,
      fontFamily: 'Caveat',
    });

    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });
});
