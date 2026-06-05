import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  defaultPageSettingsFromHandwritingSettings,
  type HandwritingSettings,
  type PageSettings,
} from '@/lib/types';
import { withTestPaperSelection } from '@/test/paperTestHelpers';
import { createMockCanvasContext } from '@/test/canvasTestHelpers';
import { ExportEngine } from '../ExportEngine';

function createDocument(overrides?: Partial<{
  text: string;
  settings: HandwritingSettings;
  pageSettingsByPage: PageSettings[];
}>) {
  const settings = overrides?.settings ?? {
    ...DEFAULT_SETTINGS,
    randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
  };

  return {
    text: overrides?.text ?? 'First page',
    settings,
    pageSettingsByPage: overrides?.pageSettingsByPage ?? [
      defaultPageSettingsFromHandwritingSettings(settings),
    ],
  };
}

const withResolvedPaperPreset = withTestPaperSelection;

function createMockRenderContext() {
  return createMockCanvasContext({
    measureText: vi.fn().mockReturnValue({
      width: 10,
      actualBoundingBoxAscent: 15,
      actualBoundingBoxDescent: 5,
    }),
  });
}

describe('ExportEngine', () => {
  it('exports a single-page PNG document through one public export call', async () => {
    const delivered: Array<{ fileName: string; mimeType: string }> = [];
    const renderPage = vi.fn().mockResolvedValue(undefined);
    const canvasBlob = new Blob(['png-page'], { type: 'image/png' });
    const canvas = {
      toBlob: (callback: BlobCallback, mimeType?: string) => {
        callback(new Blob([canvasBlob], { type: mimeType }));
      },
    } as HTMLCanvasElement;

    const engine = new ExportEngine({
      createCanvas: () => canvas,
      renderPageToCanvas: renderPage,
      ensureFontsReady: vi.fn().mockResolvedValue(undefined),
      resolveFontFamily: vi.fn().mockReturnValue('Caveat, cursive'),
      deliverArtifact: vi.fn(async (artifact) => {
        delivered.push({ fileName: artifact.fileName, mimeType: artifact.blob.type });
      }),
    });

    const result = await engine.exportDocument({
      format: 'png',
      document: createDocument(),
    });

    expect(result).toEqual({
      status: 'success',
      format: 'png',
      pageCount: 1,
      files: [
        {
          fileName: 'handwritten-page-1.png',
          mimeType: 'image/png',
        },
      ],
    });
    expect(renderPage).toHaveBeenCalledTimes(1);
    expect(renderPage).toHaveBeenCalledWith(expect.objectContaining({
      canvas,
      pageIndex: 0,
      lines: expect.arrayContaining([
        expect.objectContaining({ text: 'First page' }),
      ]),
    }));
    expect(delivered).toEqual([
      {
        fileName: 'handwritten-page-1.png',
        mimeType: 'image/png',
      },
    ]);
  });

  it('exports PDF pages using geometry from the resolved page layout', async () => {
    const addPage = vi.fn().mockResolvedValue(undefined);
    const generate = vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    const renderPage = vi.fn().mockResolvedValue(undefined);
    const deliverArtifact = vi.fn().mockResolvedValue(undefined);
    const canvas = {
      toBlob: (callback: BlobCallback) => {
        callback(new Blob(['png-page'], { type: 'image/png' }));
      },
    } as HTMLCanvasElement;

    const engine = new ExportEngine({
      createCanvas: () => canvas,
      renderPageToCanvas: renderPage,
      ensureFontsReady: vi.fn().mockResolvedValue(undefined),
      resolveFontFamily: vi.fn().mockReturnValue('Caveat, cursive'),
      deliverArtifact,
      createPdfSession: vi.fn().mockReturnValue({
        addPage,
        generate,
        dispose: vi.fn(),
      }),
    });

    await engine.exportDocument({
      format: 'pdf',
      document: createDocument({
        settings: withResolvedPaperPreset({
          paperPresetId: 'lined-a4-landscape',
          randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
        }),
      }),
    });

    expect(renderPage).toHaveBeenCalledTimes(1);
    expect(addPage).toHaveBeenCalledWith(expect.objectContaining({
      width: expect.closeTo(841.89, 1),
      height: expect.closeTo(595.28, 1),
      orientation: 'landscape',
    }));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(deliverArtifact).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'handwritten-document.pdf',
      blob: expect.any(Blob),
    }));
  });

  it('exports upload-backed paper pages through the real renderer', async () => {
    const ctx = createMockRenderContext();
    const canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      width: 0,
      height: 0,
      toBlob: (callback: BlobCallback, mimeType?: string) => {
        callback(new Blob(['png-page'], { type: mimeType }));
      },
    } as unknown as HTMLCanvasElement;

    const settings = withResolvedPaperPreset({
      customBackgroundImages: [
        'data:image/png;base64,page-0',
        'data:image/png;base64,page-1',
      ],
      paperStyle: 'ruled' as const,
      randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
    });

    const result = await new ExportEngine({
      createCanvas: () => canvas,
      ensureFontsReady: vi.fn().mockResolvedValue(undefined),
      resolveFontFamily: vi.fn().mockReturnValue('Caveat, cursive'),
      deliverArtifact: vi.fn().mockResolvedValue(undefined),
    }).exportDocument({
      format: 'png',
      document: createDocument({
        text: new Array(40).fill('line').join('\n'),
        settings,
        pageSettingsByPage: [
          defaultPageSettingsFromHandwritingSettings(settings),
          {
            ...defaultPageSettingsFromHandwritingSettings(settings),
            customLineOffset: 7,
            customLineSpacing: 44,
          },
        ],
      }),
    });

    expect(result.pageCount).toBeGreaterThan(1);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('exports JPG pages through the same engine boundary with JPEG artifacts', async () => {
    const deliverArtifact = vi.fn().mockResolvedValue(undefined);
    const canvas = {
      toBlob: (callback: BlobCallback, mimeType?: string) => {
        callback(new Blob(['jpg-page'], { type: mimeType }));
      },
    } as HTMLCanvasElement;

    const engine = new ExportEngine({
      createCanvas: () => canvas,
      renderPageToCanvas: vi.fn().mockResolvedValue(undefined),
      ensureFontsReady: vi.fn().mockResolvedValue(undefined),
      resolveFontFamily: vi.fn().mockReturnValue('Caveat, cursive'),
      deliverArtifact,
    });

    const result = await engine.exportDocument({
      format: 'jpg',
      document: createDocument(),
    });

    expect(result).toEqual({
      status: 'success',
      format: 'jpg',
      pageCount: 1,
      files: [
        {
          fileName: 'handwritten-page-1.jpg',
          mimeType: 'image/jpeg',
        },
      ],
    });
    expect(deliverArtifact).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'handwritten-page-1.jpg',
      blob: expect.objectContaining({ type: 'image/jpeg' }),
    }));
  });

  it.each([
    ['letter', 'portrait', 612, 792],
    ['letter', 'landscape', 792, 612],
    ['a4', 'portrait', 595.28, 841.89],
    ['a4', 'landscape', 841.89, 595.28],
    ['a3', 'portrait', 841.89, 1190.55],
    ['a3', 'landscape', 1190.55, 841.89],
  ] as const)(
    'exports %s %s PDF pages with resolved geometry',
    async (paperFormat, paperOrientation, expectedWidth, expectedHeight) => {
      const createPdfSession = vi.fn().mockReturnValue({
        addPage: vi.fn().mockResolvedValue(undefined),
        generate: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
        dispose: vi.fn(),
      });
      const canvas = {
        toBlob: (callback: BlobCallback) => {
          callback(new Blob(['png-page'], { type: 'image/png' }));
        },
      } as HTMLCanvasElement;

      const engine = new ExportEngine({
        createCanvas: () => canvas,
        renderPageToCanvas: vi.fn().mockResolvedValue(undefined),
        ensureFontsReady: vi.fn().mockResolvedValue(undefined),
        resolveFontFamily: vi.fn().mockReturnValue('Caveat, cursive'),
        deliverArtifact: vi.fn().mockResolvedValue(undefined),
        createPdfSession,
      });

      await engine.exportDocument({
        format: 'pdf',
        document: createDocument({
          settings: withResolvedPaperPreset({
            paperFormat,
            paperOrientation,
            randomness: { ...DEFAULT_SETTINGS.randomness, enabled: false },
          }),
        }),
      });

      expect(createPdfSession).toHaveBeenCalledWith({
        width: expectedWidth,
        height: expectedHeight,
        orientation: paperOrientation,
      });
    },
  );

  it('returns a cancelled result when the caller aborts during export', async () => {
    const controller = new AbortController();
    const deliverArtifact = vi.fn().mockResolvedValue(undefined);
    const canvas = {
      toBlob: (callback: BlobCallback, mimeType?: string) => {
        callback(new Blob(['png-page'], { type: mimeType }));
      },
    } as HTMLCanvasElement;

    const engine = new ExportEngine({
      createCanvas: () => canvas,
      renderPageToCanvas: vi.fn().mockImplementation(async () => {
        controller.abort();
      }),
      ensureFontsReady: vi.fn().mockResolvedValue(undefined),
      resolveFontFamily: vi.fn().mockReturnValue('Caveat, cursive'),
      deliverArtifact,
    });

    const result = await engine.exportDocument({
      format: 'png',
      document: createDocument(),
      signal: controller.signal,
    });

    expect(result).toEqual({
      status: 'cancelled',
      format: 'png',
      pageCount: 1,
      files: [],
    });
    expect(deliverArtifact).not.toHaveBeenCalled();
  });
});
