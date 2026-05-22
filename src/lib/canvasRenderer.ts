import { HandwritingSettings, PageSettings } from './types';
import { LineData } from './editorHelpers';
import { resolvePageLayout } from './layout/LayoutEngine';
import { UnifiedPagePainter } from './renderer/UnifiedPagePainter';

interface RenderPageOptions {
  canvas: HTMLCanvasElement;
  pageIndex: number;
  lines: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  scale: number;
  fontFamily: string; // The resolved font family string
}

/**
 * Renders a page to an HTMLCanvasElement for export.
 * This is the export entry point — it sets up canvas dimensions, handles
 * background image loading, and then delegates all drawing to UnifiedPagePainter.
 */
export async function renderPageToCanvas({
  canvas,
  pageIndex,
  lines,
  pageSettings,
  settings,
  scale,
  fontFamily,
}: RenderPageOptions): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const resolvedLayout = resolvePageLayout({
    pageIndex,
    settings,
    pageSettings,
  });
  const { width: pageWidth, height: pageHeight } = resolvedLayout.page;

  // 1. Setup Canvas Size
  canvas.width = Math.ceil(pageWidth * scale);
  canvas.height = Math.ceil(pageHeight * scale);
  ctx.scale(scale, scale);

  // 2. Handle custom background image (async)
  if (resolvedLayout.paper.background.kind === 'image') {
    const img = await loadImage(resolvedLayout.paper.background.imageSrc);
    ctx.drawImage(img, 0, 0, pageWidth, pageHeight);
  }

  // 3. Delegate all rendering to UnifiedPagePainter
  UnifiedPagePainter.paintPage({
    ctx,
    pageIndex,
    lines,
    pageSettings,
    settings,
    scaleFactor: scale,
    fontFamily,
    renderTextFields: true,
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
