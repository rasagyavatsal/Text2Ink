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
