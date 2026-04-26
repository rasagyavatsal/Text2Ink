import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  defaultPageSettingsFromHandwritingSettings,
  type HandwritingSettings,
} from '../types';
import {
  PAGE_FORMATS,
  PAPER_TEMPLATES,
  resolvePageLayout,
} from '../pageLayout';

describe('page layout', () => {
  const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

  it('returns exact print-point page dimensions from the format registry', () => {
    expect(PAGE_FORMATS.map((format) => [format.id, format.width, format.height])).toEqual([
      ['a3', 841.89, 1190.55],
      ['a4', 595.28, 841.89],
      ['a5', 419.53, 595.28],
      ['a6', 297.64, 419.53],
      ['us-letter', 612, 792],
      ['us-legal', 612, 1008],
      ['tabloid', 792, 1224],
      ['executive', 522, 756],
    ]);
  });

  it('swaps dimensions for landscape orientation', () => {
    const layout = resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, pageFormatId: 'a4', pageOrientation: 'landscape' },
      pageSettings,
      pageIndex: 0,
    });

    expect(layout.width).toBe(841.89);
    expect(layout.height).toBe(595.28);
  });

  it('uses built-in template writing metrics and hides manual paper controls', () => {
    const settings: HandwritingSettings = {
      ...DEFAULT_SETTINGS,
      paperTemplateId: 'graph',
      marginLeft: 10,
      marginTop: 10,
      lineHeight: 3,
    };

    const layout = resolvePageLayout({ settings, pageSettings, pageIndex: 0 });

    expect(layout.backgroundMode).toBe('template');
    expect(layout.paperTemplate?.id).toBe('graph');
    expect(layout.writingBox).toEqual(PAPER_TEMPLATES.find((template) => template.id === 'graph')?.metrics.writingBox);
    expect(layout.lineSpacing).toBe(PAPER_TEMPLATES.find((template) => template.id === 'graph')?.metrics.lineSpacing);
    expect(layout.controls).toMatchObject({
      showMarginControls: false,
      showLineHeightControl: false,
      showPaperColorControl: false,
      showLineColorControl: false,
      showInkColorControl: true,
      showCustomBackgroundControls: true,
    });
  });

  it('resolves notebook geometry separately from the handwriting box for accent ruled templates', () => {
    const layout = resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperTemplateId: 'margin-ruled', paperStyle: 'ruled' },
      pageSettings,
      pageIndex: 0,
    });

    expect(layout.lineSpacing).toBe(29.1);
    expect(layout.writingBox.x).toBe(97);
    expect(layout.visualRuleBox).toEqual({
      x: 0,
      y: 60,
      width: 612,
      height: 672,
    });
    expect(layout.accentLine).toEqual({
      x: 79,
      y1: 0,
      y2: 792,
    });
  });

  it('keeps narrow ruled denser than regular ruled while preserving plain ruled without an accent line', () => {
    const ruled = resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperTemplateId: 'ruled', paperStyle: 'lined' },
      pageSettings,
      pageIndex: 0,
    });
    const narrow = resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperTemplateId: 'narrow-ruled', paperStyle: 'lined' },
      pageSettings,
      pageIndex: 0,
    });

    expect(ruled.lineSpacing).toBe(29.1);
    expect(ruled.accentLine).toBeNull();
    expect(narrow.lineSpacing).toBe(25.5);
    expect(narrow.lineSpacing).toBeLessThan(ruled.lineSpacing);
  });

  it('scales calibrated notebook geometry with page format and orientation', () => {
    const layout = resolvePageLayout({
      settings: {
        ...DEFAULT_SETTINGS,
        pageFormatId: 'a4',
        pageOrientation: 'landscape',
        paperTemplateId: 'blue-notebook',
        paperStyle: 'ruled',
      },
      pageSettings,
      pageIndex: 0,
    });

    expect(layout.width).toBe(841.89);
    expect(layout.height).toBe(595.28);
    expect(layout.lineSpacing).toBe(21.87);
    expect(layout.writingBox.x).toBe(133.44);
    expect(layout.accentLine).toEqual({ x: 108.68, y1: 0, y2: 595.28 });
    expect(layout.visualRuleBox).toMatchObject({ x: 0, width: 841.89 });
  });

  it('leaves graph, dot grid, blank, and custom background geometry behavior unchanged', () => {
    const graph = resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperTemplateId: 'graph', paperStyle: 'grid' },
      pageSettings,
      pageIndex: 0,
    });
    const dotGrid = resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperTemplateId: 'dot-grid', paperStyle: 'grid' },
      pageSettings,
      pageIndex: 0,
    });
    const blank = resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperTemplateId: 'blank', paperStyle: 'blank' },
      pageSettings,
      pageIndex: 0,
    });
    const custom = resolvePageLayout({
      settings: {
        ...DEFAULT_SETTINGS,
        paperTemplateId: 'margin-ruled',
        customBackgroundImages: ['data:image/png;base64,one'],
      },
      pageSettings: {
        ...pageSettings,
        marginTop: 42,
        marginRight: 43,
        marginBottom: 44,
        marginLeft: 45,
        customLineOffset: 7,
        customLineSpacing: 33,
      },
      pageIndex: 0,
    });

    expect(graph.lineSpacing).toBe(24);
    expect(graph.visualRuleBox).toEqual(graph.writingBox);
    expect(dotGrid.lineSpacing).toBe(28);
    expect(dotGrid.visualRuleBox).toEqual(dotGrid.writingBox);
    expect(blank.paperTemplate?.kind).toBe('blank');
    expect(blank.visualRuleBox).toEqual(blank.writingBox);
    expect(custom.backgroundMode).toBe('custom-image');
    expect(custom.visualRuleBox).toEqual(custom.writingBox);
    expect(custom.accentLine).toBeNull();
    expect(custom.lineSpacing).toBe(33);
  });

  it('lets custom backgrounds override templates while preserving persisted margins and custom spacing', () => {
    const layout = resolvePageLayout({
      settings: {
        ...DEFAULT_SETTINGS,
        paperTemplateId: 'legal-pad',
        customBackgroundImages: ['data:image/png;base64,one'],
        lineHeight: 1.5,
      },
      pageSettings: {
        ...pageSettings,
        marginTop: 42,
        marginRight: 43,
        marginBottom: 44,
        marginLeft: 45,
        fontSize: 20,
        customLineOffset: 7,
        customLineSpacing: 33,
      },
      pageIndex: 0,
    });

    expect(layout.backgroundMode).toBe('custom-image');
    expect(layout.customBackgroundImage).toBe('data:image/png;base64,one');
    expect(layout.writingBox).toEqual({
      x: 45,
      y: 49,
      width: 612 - 45 - 43,
      height: 792 - 42 - 44,
    });
    expect(layout.lineSpacing).toBe(33);
    expect(layout.controls).toMatchObject({
      showMarginControls: true,
      showLineHeightControl: false,
      showPaperColorControl: true,
      showLineColorControl: true,
      showLineDetectionControls: true,
    });
  });

  it('maps legacy paper styles to similar built-in templates during normalization', () => {
    expect(resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperStyle: 'blank', paperTemplateId: undefined },
      pageSettings,
      pageIndex: 0,
    }).paperTemplate?.id).toBe('blank');

    expect(resolvePageLayout({
      settings: { ...DEFAULT_SETTINGS, paperStyle: 'ruled', paperTemplateId: undefined },
      pageSettings,
      pageIndex: 0,
    }).paperTemplate?.id).toBe('margin-ruled');
  });
});
