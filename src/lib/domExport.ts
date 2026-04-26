import html2canvas from 'html2canvas';
import type { LineData } from './editorHelpers';
import type { HandwritingSettings, PageSettings } from './types';
import { resolvePageLayout, type ResolvedPageLayout } from './pageLayout';

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
  if (!template || template.kind === 'blank') return;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('data-export-paper-svg', template.id);
  svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute('width', `${layout.width}`);
  svg.setAttribute('height', `${layout.height}`);
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });
  layer.appendChild(svg);

  const addSvgLine = (attrs: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  }) => {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(attrs.x1));
    line.setAttribute('y1', String(attrs.y1));
    line.setAttribute('x2', String(attrs.x2));
    line.setAttribute('y2', String(attrs.y2));
    line.setAttribute('stroke', attrs.stroke ?? template.lineColor ?? '#a8d4f0');
    line.setAttribute('stroke-width', String(attrs.strokeWidth ?? 1));
    if (attrs.opacity !== undefined) line.setAttribute('opacity', String(attrs.opacity));
    svg.appendChild(line);
  };

  const visualRuleBox = layout.visualRuleBox;
  const contentWidth = visualRuleBox.width;
  const contentHeight = visualRuleBox.height;
  const lineHeight = layout.lineSpacing;
  const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeight));

  if (template.kind === 'ruled' || template.kind === 'graph') {
    for (let i = 0; i <= linesPerPage; i++) {
      const y = visualRuleBox.y + i * lineHeight;
      if (y > visualRuleBox.y + visualRuleBox.height + lineHeight) continue;
      addSvgLine({
        x1: visualRuleBox.x,
        y1: y,
        x2: visualRuleBox.x + contentWidth,
        y2: y,
        opacity: template.kind === 'graph' ? 0.5 : 1,
      });
    }
  }

  if (template.kind === 'graph') {
    const cols = Math.floor(contentWidth / lineHeight);
    for (let i = 0; i <= cols; i++) {
      const x = visualRuleBox.x + i * lineHeight;
      addSvgLine({
        x1: x,
        y1: visualRuleBox.y,
        x2: x,
        y2: visualRuleBox.y + contentHeight,
        opacity: 0.5,
      });
    }
  }

  if (template.kind === 'dot-grid') {
    for (let y = visualRuleBox.y; y <= visualRuleBox.y + contentHeight; y += lineHeight) {
      for (let x = visualRuleBox.x; x <= visualRuleBox.x + contentWidth; x += lineHeight) {
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', String(x));
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', '1.2');
        circle.setAttribute('fill', template.lineColor ?? '#9aa7b0');
        circle.setAttribute('opacity', '0.55');
        svg.appendChild(circle);
      }
    }
  }

  if (template.accentColor && layout.accentLine) {
    addSvgLine({
      x1: layout.accentLine.x,
      y1: layout.accentLine.y1,
      x2: layout.accentLine.x,
      y2: layout.accentLine.y2,
      stroke: template.accentColor,
      strokeWidth: 2,
    });
  }
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
    await document.fonts?.ready;
    await document.fonts?.load(`${opts.pageSettings.fontSize}px ${opts.fontFamily}`);
    await waitForImages(page);
    return await html2canvas(page, {
      scale: opts.scale ?? DOM_EXPORT_SCALE,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      width: layout.width,
      height: layout.height,
      windowWidth: layout.width,
      windowHeight: layout.height,
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
