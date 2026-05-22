import { HandwritingSettings, PageSettings } from './types';
import { LineData } from './editorHelpers';
import { pageRenderEngine } from './renderer/PageRenderEngine';

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
  await pageRenderEngine.renderPage({
    canvas,
    mode: 'export',
    pageIndex,
    lines,
    pageSettings,
    settings,
    scale,
    fontFamily,
  });
}
