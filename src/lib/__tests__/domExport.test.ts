import { describe, expect, it, vi } from 'vitest';

vi.mock('html2canvas', () => ({
  default: vi.fn(async (element: HTMLElement, options?: { onclone?: (document: Document, element: HTMLElement) => void }) => {
    const clonedDocument = document.implementation.createHTMLDocument('export-clone');
    
    // Copy styles from main document if any
    const styleTags = document.head.querySelectorAll('style');
    for (const styleTag of styleTags) {
      clonedDocument.head.appendChild(styleTag.cloneNode(true));
    }
    
    clonedDocument.documentElement.style.backgroundColor = document.documentElement.style.backgroundColor;
    clonedDocument.body.style.backgroundColor = document.body.style.backgroundColor;
    clonedDocument.body.style.color = document.body.style.color;

    const appShell = clonedDocument.createElement('div');
    appShell.style.color = 'oklab(0.4 0 0)';
    appShell.style.borderColor = 'lab(29.2345% 39.3825 20.0664)';

    const clonedElement = element.cloneNode(true) as HTMLElement;
    const clonedImage = clonedElement.querySelector('img');
    if (clonedImage instanceof HTMLElement) {
      clonedImage.style.color = 'oklab(0.4 0 0)';
      clonedImage.style.borderTopColor = 'lab(29.2345% 39.3825 20.0664)';
      clonedImage.style.outlineColor = 'oklch(0.145 0 0)';
    }
    appShell.appendChild(clonedElement);
    clonedDocument.body.appendChild(appShell);

    options?.onclone?.(clonedDocument, clonedElement);

    const hasUnsupportedColorFunction = (value: string) =>
      value.includes('lab(') || value.includes('oklab(') || value.includes('oklch(');

    const ancestorChain = [clonedDocument.documentElement, clonedDocument.body];
    let current: HTMLElement | null = clonedElement;
    while (current) {
      ancestorChain.push(current);
      current = current.parentElement;
    }

    const subtreeNodes = Array.from(clonedElement.querySelectorAll<HTMLElement>('*'));
    const win = clonedDocument.defaultView ?? window;

    for (const node of [...ancestorChain, ...subtreeNodes]) {
      const computed = win.getComputedStyle(node);
      if (
        hasUnsupportedColorFunction(computed.backgroundColor) ||
        hasUnsupportedColorFunction(computed.color) ||
        hasUnsupportedColorFunction(computed.borderColor) ||
        hasUnsupportedColorFunction(computed.borderTopColor) ||
        hasUnsupportedColorFunction(computed.outlineColor)
      ) {
        throw new Error('Attempting to parse an unsupported color function "lab"');
      }
    }

    return document.createElement('canvas');
  }),
}));

import { capturePageElementToCanvas, pageTextFromLines, settlePageElementForCapture } from '../domExport';

describe('domExport', () => {
  it('reconstructs page text from line data', () => {
    expect(pageTextFromLines([
      { text: 'A', lineIndex: 0, hasNewline: true },
      { text: 'B', lineIndex: 1, hasNewline: false },
    ])).toBe('A\nB');
  });

  it('renders successfully when the app theme uses modern CSS color functions in inline styles', async () => {
    document.documentElement.style.backgroundColor = 'oklch(0.145 0 0)';
    document.body.style.backgroundColor = 'lab(29.2345% 39.3825 20.0664)';
    document.body.style.color = 'oklab(0.4 0 0)';
    const page = document.createElement('div');
    page.appendChild(document.createElement('img'));

    await expect(capturePageElementToCanvas({
      page,
      width: 612,
      height: 792,
      scale: 1,
    })).resolves.toBeInstanceOf(HTMLCanvasElement);

    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  });

  it('renders successfully when modern CSS color functions are applied via CSS classes', async () => {
    const style = document.createElement('style');
    style.textContent = `
      .bg-lab { background-color: lab(29.2345% 39.3825 20.0664); }
      .text-oklch { color: oklch(0.145 0 0); }
    `;
    document.head.appendChild(style);

    const page = document.createElement('div');
    page.className = 'bg-lab';
    
    const textNode = document.createElement('span');
    textNode.className = 'text-oklch';
    page.appendChild(textNode);
    
    document.body.appendChild(page);

    await expect(capturePageElementToCanvas({
      page,
      width: 612,
      height: 792,
      scale: 1,
    })).resolves.toBeInstanceOf(HTMLCanvasElement);

    document.body.removeChild(page);
    document.head.removeChild(style);
  });

  it('fails export settling when a page image is broken', async () => {
    const page = document.createElement('div');
    const brokenImage = document.createElement('img');
    page.appendChild(brokenImage);

    Object.defineProperty(brokenImage, 'complete', { configurable: true, get: () => true });
    Object.defineProperty(brokenImage, 'naturalWidth', { configurable: true, get: () => 0 });

    await expect(settlePageElementForCapture(page)).rejects.toThrow(/image/i);
  });
});
