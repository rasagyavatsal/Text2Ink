import { describe, it, expect } from 'vitest';
import { defaultPageSettingsFromHandwritingSettings, DEFAULT_SETTINGS, PAPER_STYLES, HANDWRITING_FONTS } from '../types';

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
    expect(pageSettings.paperStyle).toBe(DEFAULT_SETTINGS.paperStyle);
  });

  it('DEFAULT_SETTINGS and constants remain internally consistent', () => {
    expect(DEFAULT_SETTINGS).toBeDefined();
    expect(PAPER_STYLES).toContainEqual({ name: 'Lined', value: 'lined' });
  });

  it('includes all newly added local fonts in HANDWRITING_FONTS', () => {
    const fontValues = HANDWRITING_FONTS.map(f => f.value);
    expect(fontValues).toContain('beth-ellen');
    expect(fontValues).toContain('cedarville-cursive');
    expect(fontValues).toContain('dirty-enough');
    expect(fontValues).toContain('kalam');
    expect(fontValues).toContain('kristi');
    expect(fontValues).toContain('rudiment');
    expect(fontValues).toContain('singlong');
    expect(fontValues).toContain('strings-free');
  });
});
