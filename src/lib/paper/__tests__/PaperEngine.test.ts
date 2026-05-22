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
      paperPresetId: 'lined-a4-landscape',
      paperFormat: 'a4',
      paperOrientation: 'landscape',
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: string;
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
    expect(resolved.background.imageSrc).toBe('/paper-presets/lined-letter-portrait.svg');
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.preset).toMatchObject({
      id: 'lined-letter-portrait',
      assetPath: '/paper-presets/lined-letter-portrait.svg',
      supportedFormats: ['letter', 'a4', 'a3'],
      supportedOrientations: ['portrait', 'landscape'],
      alignment: {
        writingMargins: {
          top: 60,
          right: 60,
          bottom: 60,
          left: 60,
        },
        firstBaselineOffset: 60,
        lineSpacing: 43.2,
        gridSpacing: null,
        ruledMarginPosition: null,
      },
    });
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

  it('resolves an explicit preset identifier ahead of legacy paper settings', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: 'grid-a4-landscape',
      paperStyle: 'blank',
      paperFormat: 'letter',
      paperOrientation: 'portrait',
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: string;
      paperStyle: 'blank';
      paperFormat: 'letter';
      paperOrientation: 'portrait';
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
      throw new Error('Expected explicit built-in preset ids to resolve to an image background.');
    }
    expect(resolved.background.imageSrc).toBe('/paper-presets/grid-a4-landscape.svg');
    expect(resolved.preset?.id).toBe('grid-a4-landscape');
    expect(resolved.geometry.pageWidth).toBeCloseTo(841.89, 1);
    expect(resolved.geometry.pageHeight).toBeCloseTo(595.28, 1);
  });

  it('treats explicit preset identifiers as the built-in source of truth for background and alignment', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: 'grid-letter-portrait',
      paperStyle: 'ruled',
      lineHeight: 2.4,
      paperColor: '#ffffff',
      lineColor: '#4f8ad9',
      ruledMarginLineOffset: -40,
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: string;
      paperStyle: 'ruled';
    };
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(settings),
      marginTop: 90,
      marginRight: 72,
      marginBottom: 84,
      marginLeft: 88,
      paperColor: '#f8f7ef',
      lineColor: '#cc8899',
    };

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.style).toBe('grid');
    expect(resolved.background).toEqual({
      kind: 'image',
      imageSrc: '/paper-presets/grid-letter-portrait.svg',
    });
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.preset?.id).toBe('grid-letter-portrait');
    expect(resolved.geometry).toMatchObject({
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      margins: {
        top: 60,
        right: 60,
        bottom: 60,
        left: 60,
      },
      contentBounds: {
        top: 60,
        right: 552,
        bottom: 732,
        left: 60,
        width: 492,
        height: 672,
      },
      textTop: 75.12,
      textLeft: 60,
      textWidth: 492,
      lineHeightPx: 43.2,
    });
    expect(resolved.geometry.lineOffset).toBeCloseTo(15.12, 5);
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

  it('resolves ruled presets from the registered notebook asset metadata', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: 'ruled-letter-portrait',
      paperStyle: 'ruled',
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: string;
      paperStyle: 'ruled';
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
    expect(resolved.background.imageSrc).toBe('/paper-presets/ruled-letter-portrait.svg');
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.preset?.alignment.ruledMarginPosition).toBe(50);
    expect(resolved.geometry.textLeft).toBe(pageSettings.marginLeft);
  });

  it('resolves grid presets from the registered graph-paper asset metadata', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: 'grid-letter-portrait',
      paperStyle: 'grid',
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: string;
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
    expect(resolved.background.imageSrc).toBe('/paper-presets/grid-letter-portrait.svg');
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.preset?.alignment.gridSpacing).toBe(21.6);
    expect(resolved.preset?.alignment.firstBaselineOffset).toBe(75.12);
  });

  it('falls back for customized ruled offsets that no longer match the authored preset metadata', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: null,
      paperStyle: 'ruled',
      ruledMarginLineOffset: -14,
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: null;
      paperStyle: 'ruled';
      ruledMarginLineOffset: number;
    };

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('legacy-fallback');
    expect(resolved.preset).toBeNull();
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected customized ruled paper to fall back to generated SVG artwork.');
    }
    expect(resolved.background.imageSrc).toMatch(/^data:image\/svg\+xml/);
    expect(resolved.geometry.textLeft).toBe(pageSettings.marginLeft - 14 + 10);
  });

  it('falls back for custom paper colors that cannot be expressed by the authored preset assets', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: null,
      paperColor: '#ffffff',
      lineColor: '#4f8ad9',
    } as typeof DEFAULT_SETTINGS;
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('legacy-fallback');
    expect(resolved.preset).toBeNull();
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected custom colored paper to fall back to generated SVG artwork.');
    }
    expect(resolved.background.imageSrc).toMatch(/^data:image\/svg\+xml/);
  });

  it('falls back explicitly when a built-in preset request uses an unsupported paper format', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: null,
      paperFormat: 'legal',
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: null;
      paperFormat: 'legal';
    };

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('legacy-fallback');
    expect(resolved.preset).toBeNull();
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected unsupported built-in paper requests to fall back explicitly.');
    }
    expect(resolved.background.imageSrc).toMatch(/^data:image\/svg\+xml/);
  });

  it('maps documents without a preset identifier onto the default built-in preset', () => {
    const resolved = resolvePagePaper({
      pageIndex: 0,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.style).toBe(DEFAULT_SETTINGS.paperStyle);
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected default legacy documents to resolve to the registered default preset.');
    }
    expect(resolved.background.imageSrc).toBe('/paper-presets/lined-letter-portrait.svg');
    expect(resolved.preset?.id).toBe('lined-letter-portrait');
  });

  it('falls back from an unknown preset identifier to deterministic legacy mapping', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = {
      ...DEFAULT_SETTINGS,
      paperPresetId: 'missing-preset-id',
      paperStyle: 'grid',
      paperFormat: 'a4',
      paperOrientation: 'landscape',
    } as typeof DEFAULT_SETTINGS & {
      paperPresetId: string;
      paperStyle: 'grid';
      paperFormat: 'a4';
      paperOrientation: 'landscape';
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
      throw new Error('Expected legacy mapping to recover a registered built-in preset.');
    }
    expect(resolved.background.imageSrc).toBe('/paper-presets/grid-a4-landscape.svg');
    expect(resolved.preset?.id).toBe('grid-a4-landscape');
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
    expect(resolved.preset).toBeNull();
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
