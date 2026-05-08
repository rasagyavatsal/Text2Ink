import html2canvas from 'html2canvas';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LineData } from './editorHelpers';
import type { HandwritingSettings, PageSettings } from './types';
import { resolvePageLayout } from './pageLayout';
import { PrintablePage, printableResetStyle } from './printablePage';

export const DOM_EXPORT_SCALE = 4.1666666667;

export function pageTextFromLines(lines: LineData[]): string {
  return lines.map((line) => line.text + (line.hasNewline ? '\n' : '')).join('');
}

function applyExportStyleReset(element: HTMLElement) {
  const reset = printableResetStyle();
  Object.assign(element.style, {
    ...reset,
    all: reset.all as string,
  });
}

export function createExportPageElement(opts: {
  pageIndex: number;
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  fontFamily: string;
}): HTMLElement {
  const { pageIndex, pageText, pageSettings, settings, fontFamily } = opts;
  const template = document.createElement('template');
  template.innerHTML = renderToStaticMarkup(React.createElement(PrintablePage, {
    pageIndex,
    pageText,
    pageSettings,
    settings,
    fontFamily,
    mode: 'export',
  }));
  return template.content.firstElementChild as HTMLElement;
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      if (typeof img.decode === 'function') {
        return img.decode().catch(() => undefined);
      }
      return Promise.resolve();
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
