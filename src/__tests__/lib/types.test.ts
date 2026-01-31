import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

describe('types', () => {
  it('defaultPageSettingsFromHandwritingSettings maps global settings to page settings', () => {
    const page = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

    expect(page.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(page.lineTilt).toBe(DEFAULT_SETTINGS.lineTilt);
    expect(page.marginTop).toBe(DEFAULT_SETTINGS.marginTop);
    expect(page.marginBottom).toBe(DEFAULT_SETTINGS.marginBottom);
    expect(page.marginLeft).toBe(DEFAULT_SETTINGS.marginLeft);
    expect(page.marginRight).toBe(DEFAULT_SETTINGS.marginRight);
    expect(page.paperColor).toBe(DEFAULT_SETTINGS.paperColor);
    expect(page.customBackgroundImage).toBe(DEFAULT_SETTINGS.customBackgroundImage);
    expect(page.customLineOffset).toBe(DEFAULT_SETTINGS.customLineOffset);
    expect(page.customLineSpacing).toBe(DEFAULT_SETTINGS.customLineSpacing);
    expect(page.inkColor).toBe(DEFAULT_SETTINGS.inkColor);
    expect(page.lineColor).toBe(DEFAULT_SETTINGS.lineColor);
    expect(page.paperStyle).toBe(DEFAULT_SETTINGS.paperStyle);
  });

  it('returns new object (not aliased)', () => {
    const page = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const page2 = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

    expect(page).not.toBe(page2);
  });
});
