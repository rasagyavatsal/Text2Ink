import { describe, expect, it } from 'vitest';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import {
  DEFAULT_SETTINGS,
  type PageSettings,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { withTestPaperSelection } from '@/test/paperTestHelpers';
import { resolvePagePaper } from '../PaperEngine';

describe('PaperEngine', () => {
  it('resolves supported paper formats and orientations into concrete page geometry', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = withTestPaperSelection({
      paperPresetId: 'lined-a4-landscape',
    });

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
      left: 43,
      top: 85,
    });
    expect(resolved.geometry.contentBounds.right).toBeCloseTo(
      resolved.geometry.pageWidth - 43,
      5,
    );
    expect(resolved.geometry.contentBounds.bottom).toBeCloseTo(
      resolved.geometry.pageHeight - 43,
      5,
    );
    expect(resolved.geometry.contentBounds.width).toBeCloseTo(
      resolved.geometry.pageWidth - 43 - 43,
      5,
    );
    expect(resolved.geometry.contentBounds.height).toBeCloseTo(
      resolved.geometry.pageHeight - 85 - 43,
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
          top: 90,
          right: 36,
          bottom: 36,
          left: 90,
        },
        firstBaselineOffset: 90,
        lineSpacing: 20.25,
        gridSpacing: null,
        ruledMarginPosition: null,
      },
    });
    expect(resolved.geometry).toMatchObject({
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      textTop: 90,
      textLeft: 90,
      lineOffset: 0,
      lineHeightPx: 20.25,
      textWidth: 486,
    });
  });

  it('reports preset-backed paper through a normalized source and capability contract', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings: DEFAULT_SETTINGS,
      pageSettings,
    });

    expect(resolved.source).toEqual({
      kind: 'preset-built-in',
      presetId: 'lined-letter-portrait',
    });
    expect(resolved.capabilities).toEqual({
      alignmentMode: 'fixed',
      lineSpacingOwner: 'preset',
      supportsLineHeightControl: false,
      supportsManualAlignment: false,
      supportsManualLineSpacing: false,
      supportsMarginControls: false,
      supportsMarginLineOffset: false,
    });
  });

  it('classifies blank generated paper separately from preset-backed paper', () => {
    const settings = withTestPaperSelection({
      paperPresetId: null,
      paperStyle: 'blank',
    });
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.source).toEqual({
      kind: 'generated-fallback',
      presetId: null,
    });
    expect(resolved.background).toEqual({
      kind: 'solid-color',
      color: settings.paperColor,
    });
    expect(resolved.capabilities).toEqual({
      alignmentMode: 'fixed',
      lineSpacingOwner: 'document',
      supportsLineHeightControl: true,
      supportsManualAlignment: false,
      supportsManualLineSpacing: false,
      supportsMarginControls: false,
      supportsMarginLineOffset: false,
    });
  });

  it('resolves an explicit preset identifier ahead of legacy paper settings', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = withTestPaperSelection({
      paperPresetId: 'grid-a4-landscape',
      paperStyle: 'blank',
      paperFormat: 'letter',
      paperOrientation: 'portrait',
    });

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

  it('treats explicit preset identifiers as the built-in source of truth for geometry while honoring page-level colors', () => {
    const settings = withTestPaperSelection({
      paperPresetId: 'grid-letter-portrait',
      lineHeight: 2.4,
      paperColor: '#ffffff',
      lineColor: '#4f8ad9',
      ruledMarginLineOffset: -40,
    });
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
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected explicit built-in preset ids to remain image-backed.');
    }
    expect(resolved.background.imageSrc).toMatch(/^data:image\/svg\+xml/);
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.preset?.id).toBe('grid-letter-portrait');
    expect(resolved.geometry).toMatchObject({
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      margins: {
        top: 90,
        right: 36,
        bottom: 36,
        left: 90,
      },
      contentBounds: {
        top: 90,
        right: 576,
        bottom: 756,
        left: 90,
        width: 486,
        height: 666,
      },
      textTop: 104.4,
      textLeft: 90,
      textWidth: 486,
      lineHeightPx: 28.8,
    });
    expect(resolved.geometry.lineOffset).toBeCloseTo(14.4, 1);
  });

  it('keeps explicit preset geometry while honoring customized paper colors', () => {
    const settings = withTestPaperSelection({
      paperPresetId: 'lined-letter-portrait',
      paperColor: '#f5f0e1',
    });
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings,
      pageSettings,
    });

    expect(resolved.variant).toBe('preset');
    expect(resolved.preset?.id).toBe('lined-letter-portrait');
    expect(resolved.background.kind).toBe('image');
    if (resolved.background.kind !== 'image') {
      throw new Error('Expected explicit built-in preset ids to remain image-backed.');
    }
    expect(resolved.background.imageSrc).toMatch(/^data:image\/svg\+xml/);
    expect(resolved.geometry).toMatchObject({
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      textTop: 90,
      textLeft: 90,
      lineHeightPx: 20.25,
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
    expect(resolved.source).toEqual({
      kind: 'upload-backed',
      presetId: null,
    });
    expect(resolved.background).toEqual({
      kind: 'image',
      imageSrc: 'data:image/png;base64,page-1',
    });
    expect(resolved.guides).toEqual({ kind: 'none' });
    expect(resolved.capabilities).toEqual({
      alignmentMode: 'user-calibrated',
      lineSpacingOwner: 'upload',
      supportsLineHeightControl: false,
      supportsManualAlignment: true,
      supportsManualLineSpacing: true,
      supportsMarginControls: true,
      supportsMarginLineOffset: false,
    });
    expect(resolved.geometry.lineOffset).toBe(7);
    expect(resolved.geometry.lineHeightPx).toBe(44);
  });

  it('resolves ruled presets from the registered notebook asset metadata', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = withTestPaperSelection({
      paperPresetId: 'ruled-letter-portrait',
    });

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
    expect(resolved.preset?.alignment.ruledMarginPosition).toBe(80);
    expect(resolved.geometry.textLeft).toBe(90);
  });

  it('resolves grid presets from the registered graph-paper asset metadata', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = withTestPaperSelection({
      paperPresetId: 'grid-letter-portrait',
    });

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
    expect(resolved.preset?.alignment.gridSpacing).toBe(14.4);
    expect(resolved.preset?.alignment.firstBaselineOffset).toBe(104.4);
  });

  it('falls back for customized ruled offsets that no longer match the authored preset metadata', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const settings = withTestPaperSelection({
      paperPresetId: null,
      paperStyle: 'ruled',
      ruledMarginLineOffset: -14,
    });

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
    const settings = withTestPaperSelection({
      paperPresetId: null,
      paperStyle: 'lined',
      paperColor: '#ffffff',
      lineColor: '#4f8ad9',
    });
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
      paperPresetId: null,
      paperFormat: 'legal',
    } as {
      paperPresetId: null;
      paperFormat: 'legal';
    };

    const resolved = resolvePagePaper({
      pageIndex: 0,
      settings: settings as unknown as Parameters<typeof resolvePagePaper>[0]['settings'],
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

  it('maps documents without a preset identifier onto a legacy fallback to preserve geometry', () => {
    const resolved = resolvePagePaper({
      pageIndex: 0,
    });

    expect(resolved.variant).toBe('legacy-fallback');
    expect(resolved.style).toBe('lined');
    expect(resolved.geometry.textTop).toBe(60);
  });

  it('falls back from an unknown preset identifier to deterministic legacy mapping', () => {
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      marginTop: 85,
      marginLeft: 43,
      marginBottom: 43,
      marginRight: 43,
      fontSize: 28.34 / 1.8,
    };
    const settings = {
      paperPresetId: 'missing-preset-id',
      paperStyle: 'grid',
      paperFormat: 'a4',
      paperOrientation: 'landscape',
    } as {
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
      },
    });

    expect(resolved.variant).toBe('legacy-fallback');
    expect(resolved.style).toBe('lined');
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

  it('keeps fixed preset geometry for wide/narrow styles even when fontSize changes', () => {
    const styles = ['wide-lined', 'narrow-lined', 'wide-ruled', 'narrow-ruled'] as const;
    
    for (const style of styles) {
      const pageSettingsDefault = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
      const settings = {
        ...DEFAULT_SETTINGS,
        paperPresetId: null,
        paperStyle: style,
      };

      const resolvedDefault = resolvePagePaper({
        pageIndex: 0,
        settings,
        pageSettings: pageSettingsDefault,
      });

      const pageSettingsLargeFont = {
        ...pageSettingsDefault,
        fontSize: pageSettingsDefault.fontSize * 2, // Doubling the font size
      };

      const resolvedLargeFont = resolvePagePaper({
        pageIndex: 0,
        settings,
        pageSettings: pageSettingsLargeFont,
      });
      
      if (resolvedLargeFont.geometry.lineHeightPx !== resolvedDefault.geometry.lineHeightPx) {
        throw new Error(`lineHeightPx changed: ${resolvedLargeFont.geometry.lineHeightPx} vs ${resolvedDefault.geometry.lineHeightPx}`);
      }

      expect(resolvedLargeFont.variant).toBe('preset');
      expect(resolvedLargeFont.geometry.lineHeightPx).toBe(resolvedDefault.geometry.lineHeightPx);
      expect(resolvedLargeFont.geometry.lineHeightPx).toBe(resolvedDefault.preset?.alignment.lineSpacing);
      expect(resolvedLargeFont.preset?.id).toBe(resolvedDefault.preset?.id);
    }
  });
});
