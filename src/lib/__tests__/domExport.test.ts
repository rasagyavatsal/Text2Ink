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

import { createExportPageElement, pageTextFromLines, renderDomPageToCanvas } from '../domExport';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../types';

describe('domExport', () => {
  it('reconstructs page text from line data', () => {
    expect(pageTextFromLines([
      { text: 'A', lineIndex: 0, hasNewline: true },
      { text: 'B', lineIndex: 1, hasNewline: false },
    ])).toBe('A\nB');
  });

  it('creates a DOM page containing paper, body text, and text fields', () => {
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      textFields: [{
        id: 'field-1',
        text: 'Box text',
        x: 20,
        y: 30,
        width: 100,
        height: 50,
        color: '#123456',
        fontSize: 16,
      }],
    };

    const page = createExportPageElement({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings,
      settings: DEFAULT_SETTINGS,
      fontFamily: 'Caveat',
    });

    expect(page.textContent).toContain('Body text');
    expect(page.textContent).toContain('Box text');
    expect(page.querySelector('[data-export-layer="paper"]')).not.toBeNull();
    expect(page.querySelector('[data-export-layer="body"]')).not.toBeNull();
    expect(page.querySelector('[data-export-layer="text-fields"]')).not.toBeNull();
    expect(page.dataset.printableMode).toBe('export');
  });

  it('exports the shared printable body node without editor-only affordances', () => {
    const page = createExportPageElement({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      settings: DEFAULT_SETTINGS,
      fontFamily: 'Caveat',
    });

    const body = page.querySelector<HTMLElement>('[data-printable-layer="body"]');
    expect(body?.dataset.exportLayer).toBe('body');
    expect(body?.hasAttribute('contenteditable')).toBe(false);
    expect(body?.hasAttribute('role')).toBe(false);
    expect(body?.style.caretColor).toBe('');
  });

  it('marks the export subtree as isolated from app theme styles', () => {
    const page = createExportPageElement({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      settings: DEFAULT_SETTINGS,
      fontFamily: 'Caveat',
    });

    expect(page.style.all).toBe('initial');
    expect(page.style.borderColor).toBe('transparent');
    expect(page.style.outlineColor).toBe('transparent');

    const body = page.querySelector<HTMLElement>('[data-export-layer="body"]');
    expect(body?.style.borderColor).toBe('transparent');
    expect(body?.style.outlineColor).toBe('transparent');
  });

  it('keeps the isolated export page as a concrete block-level capture target', () => {
    const page = createExportPageElement({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      settings: DEFAULT_SETTINGS,
      fontFamily: 'Caveat',
    });

    expect(page.style.display).toBe('block');
    expect(page.style.width).toBe('612px');
    expect(page.style.height).toBe('792px');
  });

  it('uses selected page dimensions and rasterizes built-in paper templates into a background image', () => {
    const page = createExportPageElement({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      settings: {
        ...DEFAULT_SETTINGS,
        pageFormatId: 'a4',
        pageOrientation: 'landscape',
        paperTemplateId: 'dot-grid',
        paperStyle: 'grid',
      },
      fontFamily: 'Caveat',
    });

    expect(page.style.width).toBe('841.89px');
    expect(page.style.height).toBe('595.28px');
    expect(page.querySelector('[data-export-paper-svg]')).toBeNull();

    const background = page.querySelector<HTMLImageElement>('[data-export-paper-raster="dot-grid"]');
    expect(background).not.toBeNull();
    expect(background?.dataset.exportLayer).toBe('background-image');
    expect(background?.src.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
  });

  it('exports accent ruled templates with full-width rules and a full-height red margin line', () => {
    const page = createExportPageElement({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      settings: { ...DEFAULT_SETTINGS, paperTemplateId: 'margin-ruled', paperStyle: 'ruled' },
      fontFamily: 'Caveat',
    });

    const background = page.querySelector<HTMLImageElement>('[data-export-paper-raster="margin-ruled"]');
    const svg = decodeURIComponent(background?.src.split(',')[1] ?? '');

    expect(svg).toContain('x1="0" y1="60" x2="612" y2="60"');
    expect(svg).toContain('x1="79" y1="0" x2="79" y2="792" stroke="#ffb3b3" stroke-width="2"');
  });

  it('keeps custom uploaded backgrounds on the existing export image path', () => {
    const customBackgroundImage = 'data:image/png;base64,custom-background';
    const page = createExportPageElement({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings: {
        ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
        customBackgroundImage,
      },
      settings: {
        ...DEFAULT_SETTINGS,
        customBackgroundImage,
      },
      fontFamily: 'Caveat',
    });

    expect(page.querySelector('[data-export-paper-raster]')).toBeNull();

    const background = page.querySelector<HTMLImageElement>('[data-export-layer="background-image"]');
    expect(background?.src).toContain(customBackgroundImage);
  });

  it('renders successfully when the app theme uses modern CSS color functions', async () => {
    document.documentElement.style.backgroundColor = 'oklch(0.145 0 0)';
    document.body.style.backgroundColor = 'lab(29.2345% 39.3825 20.0664)';

    await expect(renderDomPageToCanvas({
      pageIndex: 0,
      pageText: 'Body text',
      pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      settings: DEFAULT_SETTINGS,
      fontFamily: 'Caveat',
      scale: 1,
    })).resolves.toBeInstanceOf(HTMLCanvasElement);

    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
  });
});
