import { paginateDocument } from '@/lib/layout/LayoutEngine';
import { renderPageToCanvas as defaultRenderPageToCanvas } from '@/lib/canvasRenderer';
import {
  defaultPageSettingsFromHandwritingSettings,
  HANDWRITING_FONTS,
  type HandwritingSettings,
  type LineData,
  type PageSettings,
} from '@/lib/types';

export type ExportFormat = 'pdf' | 'png' | 'jpg';

export interface ExportDocumentSnapshot {
  text: string;
  settings: HandwritingSettings;
  pageSettingsByPage: PageSettings[];
}

export interface ExportRequest {
  format: ExportFormat;
  document: ExportDocumentSnapshot;
  onProgress?: (progress: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface ExportProgress {
  format: ExportFormat;
  phase: 'rendering-page' | 'finalizing';
  currentPage: number;
  totalPages: number;
}

export interface ExportedFile {
  fileName: string;
  mimeType: string;
}

export type ExportResult =
  | {
      status: 'success';
      format: ExportFormat;
      pageCount: number;
      files: ExportedFile[];
    }
  | {
      status: 'cancelled';
      format: ExportFormat;
      pageCount: number;
      files: ExportedFile[];
    };

export interface ExportArtifact {
  fileName: string;
  blob: Blob;
}

export interface PdfExportPage {
  imageData: ArrayBuffer;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export interface PdfExportSession {
  addPage: (page: PdfExportPage) => Promise<void>;
  generate: () => Promise<Blob>;
  dispose: () => void;
}

interface ExportEngineDependencies {
  createCanvas?: () => HTMLCanvasElement;
  renderPageToCanvas?: typeof defaultRenderPageToCanvas;
  resolveFontFamily?: (settings: HandwritingSettings) => string;
  ensureFontsReady?: (settings: HandwritingSettings, fontFamily: string) => Promise<void>;
  deliverArtifact?: (artifact: ExportArtifact) => Promise<void> | void;
  createPdfSession?: (firstPage: Omit<PdfExportPage, 'imageData'>) => PdfExportSession;
}

const EXPORT_SCALE = 4.1666666667;

export class ExportEngine {
  readonly #createCanvas: NonNullable<ExportEngineDependencies['createCanvas']>;
  readonly #renderPageToCanvas: NonNullable<ExportEngineDependencies['renderPageToCanvas']>;
  readonly #resolveFontFamily: NonNullable<ExportEngineDependencies['resolveFontFamily']>;
  readonly #ensureFontsReady: NonNullable<ExportEngineDependencies['ensureFontsReady']>;
  readonly #deliverArtifact: NonNullable<ExportEngineDependencies['deliverArtifact']>;
  readonly #createPdfSession: NonNullable<ExportEngineDependencies['createPdfSession']>;

  constructor(dependencies: ExportEngineDependencies = {}) {
    this.#createCanvas = dependencies.createCanvas ?? (() => document.createElement('canvas'));
    this.#renderPageToCanvas = dependencies.renderPageToCanvas ?? defaultRenderPageToCanvas;
    this.#resolveFontFamily = dependencies.resolveFontFamily ?? resolveHandwritingFontFamily;
    this.#ensureFontsReady = dependencies.ensureFontsReady ?? ensureExportFontsReady;
    this.#deliverArtifact = dependencies.deliverArtifact ?? deliverArtifactToBrowser;
    this.#createPdfSession = dependencies.createPdfSession ?? createPdfWorkerSession;
  }

  async exportDocument(request: ExportRequest): Promise<ExportResult> {
    const normalizedPageSettings = request.document.pageSettingsByPage.length > 0
      ? request.document.pageSettingsByPage
      : [defaultPageSettingsFromHandwritingSettings(request.document.settings)];
    const fontFamily = this.#resolveFontFamily(request.document.settings);

    await this.#ensureFontsReady(request.document.settings, fontFamily);
    this.#throwIfAborted(request.signal);

    const pagination = paginateDocument({
      text: request.document.text,
      currentPageIndex: 0,
      renderAllPagesForExport: true,
      settings: {
        customBackgroundImage: request.document.settings.customBackgroundImage,
        customBackgroundImages: request.document.settings.customBackgroundImages,
        lineHeight: request.document.settings.lineHeight,
        lineColor: request.document.settings.lineColor,
        paperColor: request.document.settings.paperColor,
        paper: request.document.settings.paper,
        ruledMarginLineOffset: request.document.settings.ruledMarginLineOffset,
      },
      pageSettings: normalizedPageSettings.map((pageSettings) => ({
        customBackgroundImage: pageSettings.customBackgroundImage,
        customLineOffset: pageSettings.customLineOffset,
        customLineSpacing: pageSettings.customLineSpacing ?? undefined,
        fontSize: pageSettings.fontSize,
        lineColor: pageSettings.lineColor,
        marginTop: pageSettings.marginTop,
        marginRight: pageSettings.marginRight,
        marginBottom: pageSettings.marginBottom,
        marginLeft: pageSettings.marginLeft,
        paperColor: pageSettings.paperColor,
      })),
      fontFamily,
    });

    const canvas = this.#createCanvas();
    const files: ExportedFile[] = [];
    const totalPages = pagination.pages.length;

    try {
      if (request.format === 'pdf') {
        return await this.#exportPdfDocument({
          request: request as ExportRequest & { format: 'pdf' },
          canvas,
          fontFamily,
          normalizedPageSettings,
          paginatedPages: pagination.pages as LineData[][],
          pageLayouts: pagination.pageLayouts,
        });
      }

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        this.#throwIfAborted(request.signal);

        request.onProgress?.({
          format: request.format,
          phase: 'rendering-page',
          currentPage: pageIndex + 1,
          totalPages,
        });

        const pageSettings = normalizedPageSettings[pageIndex] ?? normalizedPageSettings[normalizedPageSettings.length - 1];
        const lines = pagination.pages[pageIndex] ?? [];

        await this.#renderPageToCanvas({
          canvas,
          pageIndex,
          lines: lines as LineData[],
          pageSettings,
          settings: request.document.settings,
          scale: EXPORT_SCALE,
          fontFamily,
        });
        this.#throwIfAborted(request.signal);

        const artifact = await this.#createImageArtifact({
          canvas,
          format: request.format,
          pageIndex,
        });
        this.#throwIfAborted(request.signal);
        await this.#deliverArtifact(artifact);
        files.push({
          fileName: artifact.fileName,
          mimeType: artifact.blob.type,
        });
      }

      return {
        status: 'success',
        format: request.format,
        pageCount: totalPages,
        files,
      };
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }

      return {
        status: 'cancelled',
        format: request.format,
        pageCount: totalPages,
        files,
      };
    }
  }

  async #createImageArtifact(input: {
    canvas: HTMLCanvasElement;
    format: Extract<ExportFormat, 'png' | 'jpg'>;
    pageIndex: number;
  }) {
    const mimeType = input.format === 'jpg' ? 'image/jpeg' : 'image/png';
    const blob = await canvasToBlob(input.canvas, mimeType);

    return {
      fileName: `handwritten-page-${input.pageIndex + 1}.${input.format}`,
      blob,
    };
  }

  async #exportPdfDocument(input: {
    request: ExportRequest & { format: 'pdf' };
    canvas: HTMLCanvasElement;
    fontFamily: string;
    normalizedPageSettings: PageSettings[];
    paginatedPages: LineData[][];
    pageLayouts: NonNullable<ReturnType<typeof paginateDocument>['pageLayouts']>;
  }): Promise<ExportResult> {
    const totalPages = input.paginatedPages.length;
    const firstLayout = input.pageLayouts[0];
    if (!firstLayout) {
      throw new Error('Could not resolve export page layout');
    }

    const pdfSession = this.#createPdfSession({
      width: firstLayout.page.width,
      height: firstLayout.page.height,
      orientation: getPageOrientation(firstLayout.page.width, firstLayout.page.height),
    });
    const files: ExportedFile[] = [];

    try {
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        this.#throwIfAborted(input.request.signal);
        input.request.onProgress?.({
          format: 'pdf',
          phase: 'rendering-page',
          currentPage: pageIndex + 1,
          totalPages,
        });

        const pageSettings = input.normalizedPageSettings[pageIndex]
          ?? input.normalizedPageSettings[input.normalizedPageSettings.length - 1];
        const lines = input.paginatedPages[pageIndex] ?? [];
        const layout = input.pageLayouts[pageIndex] ?? firstLayout;

        await this.#renderPageToCanvas({
          canvas: input.canvas,
          pageIndex,
          lines,
          pageSettings,
          settings: input.request.document.settings,
          scale: EXPORT_SCALE,
          fontFamily: input.fontFamily,
        });
        this.#throwIfAborted(input.request.signal);

        const pageBlob = await canvasToBlob(input.canvas, 'image/png');
        this.#throwIfAborted(input.request.signal);
        const pageBuffer = await pageBlob.arrayBuffer();

        await pdfSession.addPage({
          imageData: pageBuffer,
          width: layout.page.width,
          height: layout.page.height,
          orientation: getPageOrientation(layout.page.width, layout.page.height),
        });
        this.#throwIfAborted(input.request.signal);
      }

      this.#throwIfAborted(input.request.signal);
      input.request.onProgress?.({
        format: 'pdf',
        phase: 'finalizing',
        currentPage: totalPages,
        totalPages,
      });

      const pdfBlob = await pdfSession.generate();
      const artifact = {
        fileName: 'handwritten-document.pdf',
        blob: pdfBlob,
      };
      await this.#deliverArtifact(artifact);
      files.push({
        fileName: artifact.fileName,
        mimeType: artifact.blob.type,
      });

      return {
        status: 'success',
        format: 'pdf',
        pageCount: totalPages,
        files,
      };
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }

      return {
        status: 'cancelled',
        format: 'pdf',
        pageCount: totalPages,
        files,
      };
    } finally {
      pdfSession.dispose();
    }
  }

  #throwIfAborted(signal?: AbortSignal) {
    if (!signal?.aborted) {
      return;
    }

    const error = new Error('Export cancelled');
    error.name = 'AbortError';
    throw error;
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType);
  });

  if (!blob) {
    throw new Error('Failed to create export image');
  }

  return blob;
}

function getPageOrientation(width: number, height: number): 'portrait' | 'landscape' {
  return width > height ? 'landscape' : 'portrait';
}

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

export function resolveHandwritingFontFamily(settings: HandwritingSettings) {
  if (settings.fontFamily === 'custom' && settings.customFont) {
    return `"${settings.customFont.family}", cursive`;
  }

  const font = HANDWRITING_FONTS.find((candidate) => candidate.value === settings.fontFamily);
  if (!font) {
    return 'cursive';
  }

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'cursive';
  }

  const variableName = font.className.match(/var\((--[^)]+)\)/)?.[1];
  if (!variableName) {
    return 'cursive';
  }

  const scope = document.body ?? document.documentElement;
  const value = window.getComputedStyle(scope).getPropertyValue(variableName).trim();
  return value || 'cursive';
}

async function ensureExportFontsReady(settings: HandwritingSettings, fontFamily: string) {
  if (typeof document === 'undefined' || !document.fonts) {
    return;
  }

  try {
    await document.fonts.ready;
    await document.fonts.load(`${settings.fontSize}px ${fontFamily}`);
  } catch {
    // Export can continue with browser fallback fonts when readiness probing fails.
  }
}

async function deliverArtifactToBrowser(artifact: ExportArtifact) {
  const url = URL.createObjectURL(artifact.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = artifact.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function createPdfWorkerSession(firstPage: Omit<PdfExportPage, 'imageData'>): PdfExportSession {
  const worker = new Worker(new URL('../../workers/pdfWorker.ts', import.meta.url), {
    type: 'module',
  });

  const sendAndWaitFor = (expectedType: string, send: () => void) =>
    new Promise<unknown>((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === expectedType) {
          worker.removeEventListener('message', handleMessage);
          resolve(event.data.payload);
          return;
        }

        if (event.data?.type === 'error') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(event.data.payload));
        }
      };

      worker.addEventListener('message', handleMessage);
      send();
    });

  let initialized = false;
  let pageCount = 0;

  return {
    async addPage(page) {
      if (!initialized) {
        await sendAndWaitFor('initialized', () => {
          worker.postMessage({
            type: 'init',
            payload: {
              width: firstPage.width,
              height: firstPage.height,
              orientation: firstPage.orientation,
            },
          });
        });
        initialized = true;
      }

      await sendAndWaitFor('pageAdded', () => {
        worker.postMessage({
          type: 'addPage',
          payload: {
            imgData: page.imageData,
            width: page.width,
            height: page.height,
            orientation: page.orientation,
            isFirstPage: pageCount === 0,
          },
        }, [page.imageData]);
      });
      pageCount += 1;
    },
    async generate() {
      if (!initialized) {
        await sendAndWaitFor('initialized', () => {
          worker.postMessage({
            type: 'init',
            payload: {
              width: firstPage.width,
              height: firstPage.height,
              orientation: firstPage.orientation,
            },
          });
        });
        initialized = true;
      }

      const output = await sendAndWaitFor('generated', () => {
        worker.postMessage({ type: 'generate' });
      });
      return new Blob([output as ArrayBuffer], { type: 'application/pdf' });
    },
    dispose() {
      worker.postMessage({ type: 'cleanup' });
      worker.terminate();
    },
  };
}

export const exportEngine = new ExportEngine();
