import { describe, expect, it } from 'vitest';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import {
  DEFAULT_SETTINGS,
  type PageSettings,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { resolvePagePaper } from '../PaperEngine';

describe('PaperEngine', () => {
  it('resolves supported paper formats and orientations into concrete page geometry', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperFormat: 'a4',
      paperOrientation: 'landscape',
    } as typeof DEFAULT_SETTINGS & {
      paperFormat: 'a4';
      paperOrientation: 'landscape';
    };

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.geometry.pageWidth).toBeCloseTo(841.89, 1);
    expect(resolved.geometry.pageHeight).toBeCloseTo(595.28, 1);
    expect(resolved.geometry.aspectRatio).toBeCloseTo(
      resolved.geometry.pageWidth / resolved.geometry.pageHeight,
      5,
    );
    expect(resolved.geometry.contentBounds).toMatchObject({
      left: pageSettings.marginLeft,
      top: pageSettings.marginTop,
    });
    expect(resolved.geometry.contentBounds.right).toBeCloseTo(
      resolved.geometry.pageWidth - pageSettings.marginRight,
      5,
    );
    expect(resolved.geometry.contentBounds.bottom).toBeCloseTo(
      resolved.geometry.pageHeight - pageSettings.marginBottom,
      5,
    );
    expect(resolved.geometry.contentBounds.width).toBeCloseTo(
      resolved.geometry.pageWidth - pageSettings.marginLeft - pageSettings.marginRight,
      5,
    );
    expect(resolved.geometry.contentBounds.height).toBeCloseTo(
      resolved.geometry.pageHeight - pageSettings.marginTop - pageSettings.marginBottom,
      5,
    );
  });

  it('resolves a built-in preset into a renderable paper model', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings: DEFAULT_SETTINGS,
      pageSettings,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.style).toBe('lined');
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected built-in lined paper to resolve to an SVG image background.');
    }
    expect(resolved.background.imageSrc).toMatch(/^data:image\/svg\+xml/);
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.geometry).toMatchObject({
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      textTop: pageSettings.marginTop,
      textLeft: pageSettings.marginLeft,
      lineOffset: 0,
      lineHeightPx: pageSettings.fontSize * DEFAULT_SETTINGS.lineHeight,
      textWidth: PAGE_WIDTH - pageSettings.marginLeft - pageSettings.marginRight,
    });
  });

  it('resolves uploaded backgrounds without exposing paper-line branching to callers', () => {
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      customLineOffset: 7,
      customLineSpacing: 44,
    };
    const settings = {
      ...DEFAULT_SETTINGS,
      customBackgroundImage: 'data:image/png;base64,document-fallback',
      customBackgroundImages: [
        'data:image/png;base64,page-0',
        'data:image/png;base64,page-1',
      ],
    };

    const resolved = resolvePagePaper({
      pageIndex: 1,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('upload');
    expect(resolved.background).toEqual({
      kind: 'image',
      imageSrc: 'data:image/png;base64,page-1',
    });
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.geometry.lineOffset).toBe(7);
    expect(resolved.geometry.lineHeightPx).toBe(44);
  });

  it('resolves ruled presets to notebook artwork while preserving the ruled text inset', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperStyle: 'ruled',
      ruledMarginLineOffset: -14,
    } as typeof DEFAULT_SETTINGS & {
      paperStyle: 'ruled';
      ruledMarginLineOffset: number;
    };

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.style).toBe('ruled');
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected built-in ruled paper to resolve to an SVG image background.');
    }
    expect(decodeURIComponent(resolved.background.imageSrc)).toContain('#e6a1a8');
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.geometry.textLeft).toBe(pageSettings.marginLeft - 14 + 10);
  });

  it('resolves grid presets to graph-paper artwork instead of synthetic guides', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperStyle: 'grid',
    } as typeof DEFAULT_SETTINGS & {
      paperStyle: 'grid';
    };

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.style).toBe('grid');
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected built-in grid paper to resolve to an SVG image background.');
    }
    expect(decodeURIComponent(resolved.background.imageSrc)).toContain('major-grid');
    expect(resolved.guides).toEqual({ kind: 'none' });
  });

  it('falls back for legacy paper settings while preserving page geometry', () => {
    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings: {
        lineHeight: DEFAULT_SETTINGS.lineHeight,
      },
      pageSettings: {
        fontSize: DEFAULT_SETTINGS.fontSize,
        marginTop: 72,
      } as Partial<PageSettings>,
    });

    expect(resolved.variant).toBe('legacy-fallback');
    expect(resolved.style).toBe(DEFAULT_SETTINGS.paperStyle);
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected legacy built-in paper fallback to resolve to an SVG image background.');
    }
    expect(resolved.background.imageSrc).toMatch(/^data:image\/svg\+xml/);
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.geometry.textTop).toBe(72);
    expect(resolved.geometry.textLeft).toBe(DEFAULT_SETTINGS.marginLeft);
  });
});
