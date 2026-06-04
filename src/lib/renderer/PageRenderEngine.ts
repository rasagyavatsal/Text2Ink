import { resolvePageLayout, type ResolvedPageLayout } from '@/lib/layout/LayoutEngine';
import type { LineData, HandwritingSettings, PageSettings } from '@/lib/types';
import { UnifiedPagePainter, type CharacterPosition } from './UnifiedPagePainter';

export type PageRenderMode = 'preview' | 'export';

export interface RenderPageInput {
  canvas: HTMLCanvasElement;
  mode: PageRenderMode;
  pageIndex: number;
  lines: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  scale: number;
  fontFamily: string;
  signal?: AbortSignal;
}

export interface RenderPageResult {
  layout: ResolvedPageLayout;
  characterPositions: CharacterPosition[];
  pendingBackground: Promise<void> | null;
}

/**
 * PageRenderEngine is the public rendering boundary for page preview and export.
 * Callers provide page data plus a render mode; the engine hides page sizing,
 * background loading, paint order, and mode-specific rendering differences.
 */
export class PageRenderEngine {
  readonly #imageCache = new Map<
    string,
    {
      image: HTMLImageElement | null;
      promise: Promise<HTMLImageElement>;
    }
  >();

  async renderPage(input: RenderPageInput): Promise<RenderPageResult> {
    const ctx = input.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    this.#throwIfAborted(input.signal);

    const layout = resolvePageLayout({
      pageIndex: input.pageIndex,
      settings: input.settings,
      pageSettings: input.pageSettings,
    });
    const renderScale = input.scale * this.#resolveDevicePixelRatio(input.mode);

    input.canvas.width = Math.ceil(layout.page.width * renderScale);
    input.canvas.height = Math.ceil(layout.page.height * renderScale);
    ctx.scale(renderScale, renderScale);

    let pendingBackground: Promise<void> | null = null;
    if (layout.paper.background.kind === 'image') {
      const backgroundImage = this.#resolveBackgroundImage(layout.paper.background.imageSrc);

      if (input.mode === 'export') {
        const image = await backgroundImage.promise;
        this.#throwIfAborted(input.signal);
        ctx.drawImage(image, 0, 0, layout.page.width, layout.page.height);
      } else if (backgroundImage.image) {
        ctx.drawImage(backgroundImage.image, 0, 0, layout.page.width, layout.page.height);
      } else {
        pendingBackground = backgroundImage.promise.then(() => undefined);
      }
    }

    this.#throwIfAborted(input.signal);
    UnifiedPagePainter.paintPage({
      ctx,
      pageIndex: input.pageIndex,
      lines: input.lines,
      pageSettings: input.pageSettings,
      settings: input.settings,
      scaleFactor: input.scale,
      fontFamily: input.fontFamily,
      renderTextFields: input.mode === 'export',
    });

    this.#throwIfAborted(input.signal);
    const { mainPositions } = UnifiedPagePainter.computeCharacterPositions({
      ctx,
      lines: input.lines,
      pageSettings: input.pageSettings,
      settings: input.settings,
      pageIndex: input.pageIndex,
      fontFamily: input.fontFamily,
    });

    return {
      layout,
      characterPositions: mainPositions,
      pendingBackground,
    };
  }

  #resolveDevicePixelRatio(mode: PageRenderMode) {
    if (mode !== 'preview') {
      return 1;
    }

    if (typeof globalThis.window === 'undefined') {
      return 1;
    }

    return window.devicePixelRatio || 1;
  }

  #resolveBackgroundImage(src: string) {
    const cached = this.#imageCache.get(src);
    if (cached) {
      return cached;
    }

    let resolveImage: ((image: HTMLImageElement) => void) | null = null;
    let rejectImage: ((error: Error) => void) | null = null;

    const entry: {
      image: HTMLImageElement | null;
      promise: Promise<HTMLImageElement>;
    } = {
      image: null,
      promise: new Promise<HTMLImageElement>((resolve, reject) => {
        resolveImage = resolve;
        rejectImage = reject;
      }),
    };

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      entry.image = image;
      resolveImage?.(image);
    };
    image.onerror = () => {
      this.#imageCache.delete(src);
      rejectImage?.(new Error(`Failed to load page background image: ${src}`));
    };
    image.src = src;

    this.#imageCache.set(src, entry);
    return entry;
  }

  #throwIfAborted(signal?: AbortSignal) {
    if (!signal?.aborted) {
      return;
    }

    const abortError = new Error('Page render aborted');
    abortError.name = 'AbortError';
    throw abortError;
  }
}

export const pageRenderEngine = new PageRenderEngine();
