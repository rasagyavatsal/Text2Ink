import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import {
  DESIGN_TOKEN_CONTRACT,
  getDocumentPreviewAppearance,
  resolveChromeTheme,
} from '@/lib/designSystem';

describe('design system token contract', () => {
  it('keeps the gold brand as a primary accent while neutral tokens drive chrome surfaces', () => {
    const light = resolveChromeTheme('light');
    const dark = resolveChromeTheme('dark');

    expect(DESIGN_TOKEN_CONTRACT.color.brand.primary).toBe('#E0A32A');
    expect(light.color.brand.primary).toBe('#E0A32A');
    expect(dark.color.brand.primary).toBe('#E0A32A');
    expect(light.color.surface.app).not.toBe(light.color.brand.primary);
    expect(light.color.state.selectedBackground).not.toBe(light.color.brand.primary);
    expect(light.color.accent.info).toMatch(/^#/);
  });

  it('changes chrome theme tokens without changing the document preview appearance', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      inkColor: '#123456',
      paperColor: '#fff7d6',
      lineColor: '#9cc4e4',
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);

    const lightPreview = getDocumentPreviewAppearance({ settings, pageSettings, chromeTheme: 'light' });
    const darkPreview = getDocumentPreviewAppearance({ settings, pageSettings, chromeTheme: 'dark' });

    expect(lightPreview).toEqual(darkPreview);
    expect(lightPreview).toEqual({
      inkColor: '#123456',
      paperColor: '#fff7d6',
      lineColor: '#9cc4e4',
    });
  });
});
