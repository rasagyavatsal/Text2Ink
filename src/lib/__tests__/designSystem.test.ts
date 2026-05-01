import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import {
  DESIGN_TOKEN_CONTRACT,
  getDocumentPreviewAppearance,
  resolveChromeTheme,
} from '@/lib/designSystem';

describe('design system token contract', () => {
  it('keeps brand accents while neutral minimal tokens drive chrome surfaces', () => {
    const light = resolveChromeTheme('light');
    const dark = resolveChromeTheme('dark');

    expect(DESIGN_TOKEN_CONTRACT.color.brand.primary).toBe('#E0A32A');
    expect(light.color.brand.primary).toBe('#E0A32A');
    expect(dark.color.brand.primary).toBe('#E0A32A');
    expect(light.color.accent.info).toBe('#4F46E5');
    expect(dark.color.accent.info).toBe('#818CF8');
    expect(light.color.surface.app).not.toBe(light.color.brand.primary);
    expect(light.color.state.selectedBackground).not.toBe(light.color.brand.primary);
  });

  it('uses true-black dark chrome with restrained neutral layering', () => {
    const dark = resolveChromeTheme('dark');

    expect(dark.color.surface.app).toBe('#000000');
    expect(dark.color.surface.header).toBe('rgba(0, 0, 0, 0.86)');
    expect(dark.color.surface.panel).toBe('#090909');
    expect(dark.color.surface.panelMuted).toBe('#0F0F10');
    expect(dark.color.surface.card).toBe('#111111');
    expect(dark.elevation.medium).not.toContain('15, 23, 42');
  });

  it('keeps editor surface layers ordered and theme-independent', () => {
    const light = resolveChromeTheme('light');
    const dark = resolveChromeTheme('dark');

    expect(light.layer.controlSheet).toBeLessThan(light.layer.floatingSurface);
    expect(light.layer.floatingSurface).toBeLessThan(light.layer.modalDialog);
    expect(dark.layer).toEqual(light.layer);
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
