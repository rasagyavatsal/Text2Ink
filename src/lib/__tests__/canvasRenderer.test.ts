import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderPageToCanvas } from '../canvasRenderer';
import { HandwritingSettings, PageSettings, LineData, TextField } from '../types';

// Mock the global Image for background loading
global.Image = class {
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
      textFields: [],
      scale,
      fontFamily: 'Caveat',
    });

    expect(mockCanvas.width).toBe(612 * scale); // 612 is PAGE_WIDTH
    expect(mockCanvas.height).toBe(792 * scale); // 792 is PAGE_HEIGHT
    expect(mockCtx.scale).toHaveBeenCalledWith(scale, scale);
  });

  it('applies correct vertical centering offset', async () => {
    // Mock metrics: height = 15 (ascent) + 5 (descent) = 20px
    // Line height: 24 (fontSize) * 1.5 (lineHeight) = 36px
    // Offset: (36 - 20) / 2 = 8px
    
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
      textFields: [],
      scale: 1,
      fontFamily: 'Caveat',
    });

    expect(mockCtx.textBaseline).toBe('top');
    
    // The first line starts at marginTop (50) + offset (8) = 58
    const translateCalls = mockCtx.translate.mock.calls;
    const yValue = translateCalls[0][1];
    expect(yValue).toBe(58);
  });

  it('draws paper lines when style is lined', async () => {
    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: mockSettings,
      textFields: [],
      scale: 1,
      fontFamily: 'Caveat',
    });

    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.strokeStyle).toBe(mockSettings.lineColor);
  });

  it('renders text fields on the correct page', async () => {
    const textFields: TextField[] = [
      { id: '1', x: 100, y: 100, text: 'Field 1', pageIndex: 0 },
      { id: '2', x: 200, y: 200, text: 'Field 2', pageIndex: 1 },
    ];

    await renderPageToCanvas({
      canvas: mockCanvas,
      pageIndex: 0,
      lines: mockLines,
      pageSettings: mockPageSettings,
      settings: mockSettings,
      textFields,
      scale: 1,
      fontFamily: 'Caveat',
    });

    // Should only render characters from "Field 1"
    const fillTextCalls = mockCtx.fillText.mock.calls.map((call: any[]) => call[0]);
    expect(fillTextCalls).toContain('F');
    expect(fillTextCalls).toContain('1');
    expect(fillTextCalls).not.toContain('2');
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
      textFields: [],
      scale: 1,
      fontFamily: 'Caveat',
    });

    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });
});
