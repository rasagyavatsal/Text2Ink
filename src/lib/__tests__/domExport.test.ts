import { describe, expect, it, vi } from 'vitest';

vi.mock('html2canvas', () => ({
  default: vi.fn(async (_element: HTMLElement, options?: { onclone?: (document: Document) => void }) => {
    const clonedDocument = document.implementation.createHTMLDocument('export-clone');
    clonedDocument.documentElement.style.backgroundColor = document.documentElement.style.backgroundColor;
    clonedDocument.body.style.backgroundColor = document.body.style.backgroundColor;

    options?.onclone?.(clonedDocument);

    const htmlBackground = clonedDocument.documentElement.style.backgroundColor;
    const bodyBackground = clonedDocument.body.style.backgroundColor;
    if (
      htmlBackground.includes('lab(') ||
      htmlBackground.includes('oklab(') ||
      htmlBackground.includes('oklch(') ||
      bodyBackground.includes('lab(') ||
      bodyBackground.includes('oklab(') ||
      bodyBackground.includes('oklch(')
    ) {
      throw new Error('Attempting to parse an unsupported color function "lab"');
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

  it('renders successfully when the app theme uses modern CSS color functions', async () => {
    document.documentElement.style.backgroundColor = 'oklch(0.145 0 0)';
    document.body.style.backgroundColor = 'lab(29.2345% 39.3825 20.0664)';
    const page = document.createElement('div');

    await expect(capturePageElementToCanvas({
      page,
      width: 612,
      height: 792,
      scale: 1,
    })).resolves.toBeInstanceOf(HTMLCanvasElement);

    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
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
