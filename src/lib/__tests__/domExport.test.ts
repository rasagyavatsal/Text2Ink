import { describe, expect, it } from 'vitest';
import { createExportPageElement, pageTextFromLines } from '../domExport';
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
});
