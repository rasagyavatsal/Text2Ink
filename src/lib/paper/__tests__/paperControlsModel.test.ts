import { describe, it, expect } from 'vitest';
import { resolvePaperControlsModel } from '../paperControlsModel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import { resolvePageLayout } from '@/lib/layout/LayoutEngine';

describe('resolvePaperControlsModel', () => {
  it('identifies upload-backed paper mode and its control visibility', () => {
    // We need to set up settings that yield an upload-backed paper.
    // In DEFAULT_SETTINGS, it's a preset. Let's make it upload-backed by setting customBackgroundImage.
    const settings = {
      ...DEFAULT_SETTINGS,
      customBackgroundImage: 'data:image/png;base64,...',
      paper: {
        kind: 'generated' as const, // usually if custom image is set, it might be upload-backed. Let's check how PaperEngine does it.
        style: 'blank' as const,
        format: 'letter' as const,
        orientation: 'portrait' as const,
      }
    };
    const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
    
    const layout = resolvePageLayout({
      pageIndex: 0,
      settings,
      pageSettings
    });

    const model = resolvePaperControlsModel({
      settings,
      pageSettings,
      resolvedPaper: layout.paper
    });

    expect(model.paperMode).toBe('upload');
    expect(model.showManualAlignmentControls).toBe(true);
    // If it's upload-backed, spacing is derived from calibration, so maybe line height control is false
    expect(model.showLineHeightControl).toBe(false);
  });

  it('determines spacing controls and effective spacing value for upload-backed paper', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      customBackgroundImage: 'data:image/png;base64,...',
      lineHeight: 1.5,
      paper: {
        kind: 'generated' as const,
        style: 'blank' as const,
        format: 'letter' as const,
        orientation: 'portrait' as const,
      }
    };
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(settings),
      fontSize: 20,
      customLineSpacing: null,
    };
    
    const layout = resolvePageLayout({
      pageIndex: 0,
      settings,
      pageSettings
    });

    const model = resolvePaperControlsModel({
      settings,
      pageSettings,
      resolvedPaper: layout.paper
    });

    expect(model.showSpacingControls).toBe(true);
    expect(model.isSpacingEditable).toBe(true);
    expect(model.effectiveSpacingValue).toBe(30); // 20 * 1.5
  });
});
