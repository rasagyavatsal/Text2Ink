import { describe, it, expect } from 'vitest';
import { defaultPageSettingsFromHandwritingSettings, DEFAULT_SETTINGS, PAPER_STYLES } from '../types';

describe('types helpers', () => {
  it('defaultPageSettingsFromHandwritingSettings maps all expected fields', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    
    expect(pageSettings.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(pageSettings.lineTilt).toBe(DEFAULT_SETTINGS.lineTilt);
    expect(pageSettings.marginTop).toBe(DEFAULT_SETTINGS.marginTop);
    expect(pageSettings.marginBottom).toBe(DEFAULT_SETTINGS.marginBottom);
    expect(pageSettings.marginLeft).toBe(DEFAULT_SETTINGS.marginLeft);
    expect(pageSettings.marginRight).toBe(DEFAULT_SETTINGS.marginRight);
    expect(pageSettings.paperColor).toBe(DEFAULT_SETTINGS.paperColor);
    expect(pageSettings.customBackgroundImage).toBe(DEFAULT_SETTINGS.customBackgroundImage);
    expect(pageSettings.customLineOffset).toBe(DEFAULT_SETTINGS.customLineOffset);
    expect(pageSettings.customLineSpacing).toBe(DEFAULT_SETTINGS.customLineSpacing);
    expect(pageSettings.inkColor).toBe(DEFAULT_SETTINGS.inkColor);
    expect(pageSettings.lineColor).toBe(DEFAULT_SETTINGS.lineColor);
    expect(pageSettings.paper).toEqual({ kind: 'inherit' });
  });

  it('DEFAULT_SETTINGS and constants remain internally consistent', () => {
    expect(DEFAULT_SETTINGS).toBeDefined();
    expect(DEFAULT_SETTINGS.paper).toEqual({
      kind: 'preset',
      presetId: 'lined-letter-portrait',
    });
    expect(PAPER_STYLES).toContainEqual({ name: 'Lined (Medium)', value: 'lined' });
  });
});
