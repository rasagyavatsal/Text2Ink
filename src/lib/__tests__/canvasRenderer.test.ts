import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderPageToCanvas } from '../canvasRenderer';
import { HandwritingSettings, PageSettings, LineData } from '../types';

// Mock the global Image for background loading
global.Image = class {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  src: string = '';
  crossOrigin: string = '';
  constructor() {
    setTimeout(() => this.onload(), 0);
  }
} as unknown as typeof Image;

describe('canvasRenderer', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  const mockSettings: HandwritingSettings = {
    fontFamily: 'caveat',
    fontSize: 24,
    lineHeight: 1.5,
    paperStyle: 'lined',
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
  };

  const mockPageSettings: PageSettings = {
    fontSize: 24,
    marginTop: 50,
    marginBottom: 50,
    marginLeft: 50,
    marginRight: 50,
    paperColor: '#ffffff',
    inkColor: '#111111',
    lineColor: '#000000',
    paperStyle: 'lined',
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
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;
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
    expect(vi.mocked(mockCtx.scale)).toHaveBeenCalledWith(scale, scale);
  });

  it('applies correct vertical centering offset', async () => {
    // Mock metrics: 
    // ascent = 15, descent = 5
    // fontSize = 24
    // Line height: 24 (fontSize) * 1.5 (lineHeight) = 36px
    // halfLeading: (36 - 24) / 2 = 6px
    // fontAscent: 15 (from mock actualBoundingBoxAscent)
    // Offset (baseline): 6 (halfLeading) + 15 (fontAscent) = 21px
    
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
    
    // The first line starts at marginTop (50) + offset (21) = 71
    const translateCalls = vi.mocked(mockCtx.translate).mock.calls;
    const yValue = translateCalls[0][1];
    expect(yValue).toBe(71);
  });

  it('draws paper lines when style is lined', async () => {
    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: mockSettings,
      scale: 1,
      fontFamily: 'Caveat',
    });

    expect(vi.mocked(mockCtx.beginPath)).toHaveBeenCalled();
    expect(vi.mocked(mockCtx.stroke)).toHaveBeenCalled();
    expect(mockCtx.strokeStyle).toBe(mockSettings.lineColor);
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

    expect(vi.mocked(mockCtx.drawImage)).toHaveBeenCalled();
    expect(vi.mocked(mockCtx.fillRect)).not.toHaveBeenCalled();
  });
});
