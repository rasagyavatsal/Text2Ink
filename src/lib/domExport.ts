import html2canvas from 'html2canvas';
import { PAGE_HEIGHT, PAGE_WIDTH } from './pageConstants';
import type { LineData } from './editorHelpers';
import type { HandwritingSettings, PageSettings } from './types';

export const DOM_EXPORT_SCALE = 4.1666666667;

export function pageTextFromLines(lines: LineData[]): string {
  return lines.map((line) => line.text + (line.hasNewline ? '\n' : '')).join('');
}

function applyExportStyleReset(element: HTMLElement) {
  Object.assign(element.style, {
    all: 'initial',
    boxSizing: 'border-box',
    borderStyle: 'none',
    borderColor: 'transparent',
    outlineStyle: 'none',
    outlineColor: 'transparent',
    boxShadow: 'none',
    textDecorationColor: 'transparent',
  });
}

function appendPaperLayer(page: HTMLElement, pageSettings: PageSettings, settings: HandwritingSettings) {
  const layer = document.createElement('div');
  layer.dataset.exportLayer = 'paper';
  applyExportStyleReset(layer);
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
  });
  page.appendChild(layer);

  if (settings.paperStyle === 'blank') return;

  const contentWidth = PAGE_WIDTH - pageSettings.marginLeft - pageSettings.marginRight;
  const contentHeight = PAGE_HEIGHT - pageSettings.marginTop - pageSettings.marginBottom;
  const lineHeight = pageSettings.customLineSpacing ?? pageSettings.fontSize * settings.lineHeight;
  const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeight));

  const addLine = (style: Partial<CSSStyleDeclaration>) => {
    const line = document.createElement('div');
    applyExportStyleReset(line);
    Object.assign(line.style, {
      position: 'absolute',
      backgroundColor: pageSettings.lineColor,
      pointerEvents: 'none',
      ...style,
    });
    layer.appendChild(line);
  };

  if (settings.paperStyle === 'lined' || settings.paperStyle === 'ruled' || settings.paperStyle === 'grid') {
    for (let i = 0; i <= linesPerPage; i++) {
      const y = pageSettings.marginTop + i * lineHeight;
      if (y > PAGE_HEIGHT - pageSettings.marginBottom + lineHeight) continue;
      addLine({
        left: `${pageSettings.marginLeft}px`,
        top: `${y}px`,
        width: `${contentWidth}px`,
        height: '1px',
        opacity: settings.paperStyle === 'grid' ? '0.5' : '1',
      });
    }
  }

  if (settings.paperStyle === 'grid') {
    const cols = Math.floor(contentWidth / lineHeight);
    for (let i = 0; i <= cols; i++) {
      const x = pageSettings.marginLeft + i * lineHeight;
      addLine({
        left: `${x}px`,
        top: `${pageSettings.marginTop}px`,
        width: '1px',
        height: `${contentHeight}px`,
        opacity: '0.5',
      });
    }
  }

  if (settings.paperStyle === 'ruled') {
    addLine({
      left: `${pageSettings.marginLeft + settings.ruledMarginLineOffset}px`,
      top: `${pageSettings.marginTop}px`,
      width: '2px',
      height: `${contentHeight}px`,
      backgroundColor: '#ffb3b3',
    });
  }
}

function appendBodyLayer(opts: {
  page: HTMLElement;
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  fontFamily: string;
  hasCustomBackground: boolean;
}) {
  const { page, pageText, pageSettings, settings, fontFamily, hasCustomBackground } = opts;
  const lineHeight = hasCustomBackground && pageSettings.customLineSpacing
    ? pageSettings.customLineSpacing
    : pageSettings.fontSize * settings.lineHeight;
  const lineOffset = hasCustomBackground ? (pageSettings.customLineOffset ?? 0) : 0;
  const left = settings.paperStyle === 'ruled' && !hasCustomBackground
    ? pageSettings.marginLeft + settings.ruledMarginLineOffset + 10
    : pageSettings.marginLeft;

  const body = document.createElement('div');
  body.dataset.exportLayer = 'body';
  body.textContent = pageText;
  applyExportStyleReset(body);
  Object.assign(body.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${pageSettings.marginTop + lineOffset}px`,
    width: `${PAGE_WIDTH - left - pageSettings.marginRight}px`,
    height: `${PAGE_HEIGHT - pageSettings.marginTop - pageSettings.marginBottom}px`,
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

function appendBackgroundImage(page: HTMLElement, src: string) {
  const img = document.createElement('img');
  img.dataset.exportLayer = 'background-image';
  img.src = src;
  img.crossOrigin = 'anonymous';
  applyExportStyleReset(img);
  Object.assign(img.style, {
    position: 'absolute',
    inset: '0',
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
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
  const backgroundImage = settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage;

  applyExportStyleReset(page);
  Object.assign(page.style, {
    position: 'relative',
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
    overflow: 'hidden',
    backgroundColor: backgroundImage ? 'transparent' : pageSettings.paperColor,
    boxSizing: 'border-box',
  });

  if (backgroundImage) {
    appendBackgroundImage(page, backgroundImage);
  } else {
    appendPaperLayer(page, pageSettings, settings);
  }

  appendBodyLayer({
    page,
    pageText,
    pageSettings,
    settings,
    fontFamily,
    hasCustomBackground: !!backgroundImage,
  });
  appendTextFields(page, pageSettings, fontFamily);

  return page;
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return img.decode().catch(() => undefined);
    })
  );
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
  const host = document.createElement('div');
  applyExportStyleReset(host);
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
    overflow: 'hidden',
  });
  host.appendChild(page);
  document.body.appendChild(host);

  try {
    await document.fonts?.ready;
    await document.fonts?.load(`${opts.pageSettings.fontSize}px ${opts.fontFamily}`);
    await waitForImages(page);
    return await html2canvas(page, {
      scale: opts.scale ?? DOM_EXPORT_SCALE,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      windowWidth: PAGE_WIDTH,
      windowHeight: PAGE_HEIGHT,
      onclone: (clonedDocument) => {
        for (const node of [clonedDocument.documentElement, clonedDocument.body]) {
          node.style.backgroundColor = 'transparent';
          node.style.backgroundImage = 'none';
        }
      },
    });
  } finally {
    host.remove();
  }
}
