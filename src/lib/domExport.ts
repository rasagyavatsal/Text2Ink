import html2canvas from 'html2canvas';
import type { LineData } from './editorHelpers';
import type { HandwritingSettings, PageSettings } from './types';
import { resolvePageLayout, type ResolvedPageLayout } from './pageLayout';
import { rasterizePaperBackground } from './paperBackgroundRasterizer';

export const DOM_EXPORT_SCALE = 4.1666666667;

export function pageTextFromLines(lines: LineData[]): string {
  return lines.map((line) => line.text + (line.hasNewline ? '\n' : '')).join('');
}

function applyExportStyleReset(element: HTMLElement) {
  Object.assign(element.style, {
    all: 'initial',
    display: 'block',
    boxSizing: 'border-box',
    borderStyle: 'none',
    borderColor: 'transparent',
    outlineStyle: 'none',
    outlineColor: 'transparent',
    boxShadow: 'none',
    textDecorationColor: 'transparent',
  });
}

function appendPaperLayer(page: HTMLElement, layout: ResolvedPageLayout) {
  const layer = document.createElement('div');
  layer.dataset.exportLayer = 'paper';
  applyExportStyleReset(layer);
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
  });
  page.appendChild(layer);

  const template = layout.paperTemplate;
  const rasterizedBackground = rasterizePaperBackground(layout);
  if (!template || !rasterizedBackground) return;

  const img = document.createElement('img');
  img.dataset.exportLayer = 'background-image';
  img.dataset.exportPaperRaster = template.id;
  img.src = rasterizedBackground;
  applyExportStyleReset(img);
  Object.assign(img.style, {
    position: 'absolute',
    inset: '0',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    objectFit: 'fill',
    pointerEvents: 'none',
  });
  layer.appendChild(img);
}

function appendBodyLayer(opts: {
  page: HTMLElement;
  pageText: string;
  pageSettings: PageSettings;
  fontFamily: string;
  layout: ResolvedPageLayout;
}) {
  const { page, pageText, pageSettings, fontFamily, layout } = opts;
  const lineHeight = layout.lineSpacing;
  const left = layout.writingBox.x;

  const body = document.createElement('div');
  body.dataset.exportLayer = 'body';
  body.textContent = pageText;
  applyExportStyleReset(body);
  Object.assign(body.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${layout.writingBox.y}px`,
    width: `${layout.writingBox.width}px`,
    height: `${layout.writingBox.height}px`,
    fontFamily,
    fontSize: `${pageSettings.fontSize}px`,
    lineHeight: `${lineHeight}px`,
    color: pageSettings.inkColor,
    whiteSpace: 'break-spaces',
    overflowWrap: 'break-word',
    transform: pageSettings.lineTilt ? `rotate(${pageSettings.lineTilt}deg)` : '',
    transformOrigin: 'top left',
  });
  page.appendChild(body);
}

function appendTextFields(page: HTMLElement, pageSettings: PageSettings, fontFamily: string) {
  const layer = document.createElement('div');
  layer.dataset.exportLayer = 'text-fields';
  applyExportStyleReset(layer);
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
  });
  page.appendChild(layer);

  for (const field of pageSettings.textFields ?? []) {
    const node = document.createElement('div');
    node.textContent = field.text;
    applyExportStyleReset(node);
    Object.assign(node.style, {
      position: 'absolute',
      left: `${field.x}px`,
      top: `${field.y}px`,
      width: `${field.width}px`,
      minHeight: `${field.height}px`,
      fontFamily,
      fontSize: `${field.fontSize}px`,
      lineHeight: '1.2',
      color: field.color,
      whiteSpace: 'pre-wrap',
      overflowWrap: 'break-word',
    });
    layer.appendChild(node);
  }
}

function appendBackgroundImage(page: HTMLElement, src: string, layout: ResolvedPageLayout) {
  const img = document.createElement('img');
  img.dataset.exportLayer = 'background-image';
  img.src = src;
  img.crossOrigin = 'anonymous';
  applyExportStyleReset(img);
  Object.assign(img.style, {
    position: 'absolute',
    inset: '0',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    objectFit: 'fill',
  });
  page.appendChild(img);
}

export function createExportPageElement(opts: {
  pageIndex: number;
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  fontFamily: string;
}): HTMLElement {
  const { pageIndex, pageText, pageSettings, settings, fontFamily } = opts;
  const page = document.createElement('div');
  page.dataset.exportPage = String(pageIndex);
  const layout = resolvePageLayout({ settings, pageSettings, pageIndex });
  const backgroundImage = layout.customBackgroundImage;

  applyExportStyleReset(page);
  Object.assign(page.style, {
    position: 'relative',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    overflow: 'hidden',
    backgroundColor: backgroundImage ? 'transparent' : (layout.paperTemplate?.tone ?? pageSettings.paperColor),
    boxSizing: 'border-box',
  });

  if (backgroundImage) {
    appendBackgroundImage(page, backgroundImage, layout);
  } else {
    appendPaperLayer(page, layout);
  }

  appendBodyLayer({
    page,
    pageText,
    pageSettings,
    fontFamily,
    layout,
  });
  appendTextFields(page, pageSettings, fontFamily);

  return page;
}

function imageLoadError(img: HTMLImageElement) {
  const imageType = img.dataset.exportLayer === 'background-image' ? 'background image' : 'image';
  return new Error(`The export ${imageType} could not be loaded.`);
}

async function waitForImage(img: HTMLImageElement) {
  if (img.complete) {
    if (img.naturalWidth === 0) {
      throw imageLoadError(img);
    }
    return;
  }

  if (img.dataset.exportPaperRaster) {
    return;
  }

  if (typeof img.decode === 'function') {
    try {
      await img.decode();
    } catch {
      throw imageLoadError(img);
    }

    if (img.naturalWidth === 0) {
      throw imageLoadError(img);
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      cleanup();
      if (img.naturalWidth === 0) {
        reject(imageLoadError(img));
        return;
      }
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(imageLoadError(img));
    };
    const cleanup = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };

    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
  });
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map((img) => waitForImage(img)));
}

export async function settlePageElementForCapture(
  page: HTMLElement,
  opts: {
    fontFamily?: string;
    fontSize?: number;
  } = {},
) {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (fonts) {
    await fonts.ready;
    if (opts.fontFamily && opts.fontSize) {
      const loadedFonts = await fonts.load(`${opts.fontSize}px ${opts.fontFamily}`);
      if (loadedFonts.length === 0) {
        throw new Error(`The export font "${opts.fontFamily}" could not be loaded.`);
      }
    }
  }

  await waitForImages(page);
}

export async function capturePageElementToCanvas(opts: {
  page: HTMLElement;
  width: number;
  height: number;
  scale?: number;
}): Promise<HTMLCanvasElement> {
  const { page, width, height } = opts;
  return await html2canvas(page, {
    scale: opts.scale ?? DOM_EXPORT_SCALE,
    backgroundColor: null,
    useCORS: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    onclone: (clonedDocument) => {
      for (const node of [clonedDocument.documentElement, clonedDocument.body]) {
        node.style.backgroundColor = 'transparent';
        node.style.backgroundImage = 'none';
      }
    },
  });
}

export async function renderDomPageToCanvas(opts: {
  pageIndex: number;
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  fontFamily: string;
  scale?: number;
}): Promise<HTMLCanvasElement> {
  const page = createExportPageElement(opts);
  const layout = resolvePageLayout({
    settings: opts.settings,
    pageSettings: opts.pageSettings,
    pageIndex: opts.pageIndex,
  });
  const host = document.createElement('div');
  applyExportStyleReset(host);
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    overflow: 'hidden',
  });
  host.appendChild(page);
  document.body.appendChild(host);

  try {
    await settlePageElementForCapture(page, {
      fontFamily: opts.fontFamily,
      fontSize: opts.pageSettings.fontSize,
    });
    return await capturePageElementToCanvas({
      page,
      width: layout.width,
      height: layout.height,
      scale: opts.scale,
    });
  } finally {
    host.remove();
  }
}
