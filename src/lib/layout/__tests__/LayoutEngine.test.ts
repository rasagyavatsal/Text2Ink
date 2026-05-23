import { describe, expect, it } from 'vitest';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import {
  DEFAULT_SETTINGS,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { resolvePagePaper } from '@/lib/paper/PaperEngine';
import { withTestPaperSelection } from '@/test/paperTestHelpers';
import { paginateDocument, resolvePageLayout } from '../LayoutEngine';

describe('LayoutEngine', () => {
  describe('resolvePageLayout', () => {
    it('resolves built-in paper into a stable page and writing layout contract', () => {
      const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
      const resolvedPaper = resolvePagePaper({
        pageIndex: 0,
        settings: DEFAULT_SETTINGS,
        pageSettings,
      });

      const resolved = resolvePageLayout({
        pageIndex: 0,
        settings: DEFAULT_SETTINGS,
        pageSettings,
      });

      expect(resolved.page).toMatchObject({
        index: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
      });
      expect(resolved.paper).toMatchObject({
        variant: 'preset',
        style: 'lined',
        presetId: 'lined-letter-portrait',
        background: {
          kind: 'image',
          imageSrc: '/paper-presets/lined-letter-portrait.svg',
        },
      });
      expect(resolved.writing).toMatchObject({
        fontSize: pageSettings.fontSize,
        lineHeightPx: resolvedPaper.geometry.lineHeightPx,
        firstLineTop: resolvedPaper.geometry.textTop,
        linesPerPage: Math.floor(
          resolvedPaper.geometry.contentHeight / resolvedPaper.geometry.lineHeightPx,
        ),
        textBounds: {
          top: resolvedPaper.geometry.textTop,
          left: resolvedPaper.geometry.textLeft,
          width: resolvedPaper.geometry.textWidth,
          height: resolvedPaper.geometry.contentBounds.bottom - resolvedPaper.geometry.textTop,
        },
      });
    });

    it('resolves upload-backed paper into page-specific writing offsets and spacing', () => {
      const pageSettings = {
        ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
        customLineOffset: 7,
        customLineSpacing: 44,
      };
      const settings = {
        ...withTestPaperSelection({
          paperPresetId: null,
          paperStyle: 'ruled',
        }),
        customBackgroundImages: ['data:image/png;base64,page-0', 'data:image/png;base64,page-1'],
      };

      const resolved = resolvePageLayout({
        pageIndex: 1,
        settings,
        pageSettings,
      });

      expect(resolved.paper).toMatchObject({
        variant: 'upload',
        sourceKind: 'upload-backed',
        style: 'ruled',
        presetId: null,
        background: {
          kind: 'image',
          imageSrc: 'data:image/png;base64,page-1',
        },
        capabilities: {
          alignmentMode: 'user-calibrated',
          lineSpacingOwner: 'upload',
          supportsLineHeightControl: false,
          supportsManualAlignment: true,
          supportsManualLineSpacing: true,
          supportsMarginControls: true,
          supportsMarginLineOffset: false,
        },
      });
      expect(resolved.writing).toMatchObject({
        lineHeightPx: 44,
        firstLineTop: pageSettings.marginTop + 7,
        lineOffset: 7,
        linesPerPage: Math.floor(
          (PAGE_HEIGHT - pageSettings.marginTop - pageSettings.marginBottom) / 44,
        ),
        textBounds: {
          left: pageSettings.marginLeft,
        },
      });
    });
    it('keeps linesPerPage stable for wide/narrow paper when font size changes', () => {
      const styles = ['wide-lined', 'narrow-lined', 'wide-ruled', 'narrow-ruled'] as const;
      
      for (const style of styles) {
        const pageSettingsDefault = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
        const settings = {
          ...DEFAULT_SETTINGS,
          paperPresetId: null, // Test automatic fallback mechanism
          paperStyle: style,
        };

        const resolvedDefault = resolvePageLayout({
          pageIndex: 0,
          settings,
          pageSettings: pageSettingsDefault,
        });

        const pageSettingsLargeFont = {
          ...pageSettingsDefault,
          fontSize: pageSettingsDefault.fontSize * 2,
        };

        const resolvedLargeFont = resolvePageLayout({
          pageIndex: 0,
          settings,
          pageSettings: pageSettingsLargeFont,
        });

        expect(resolvedLargeFont.paper.variant).toBe('preset');
        expect(resolvedLargeFont.writing.linesPerPage).toBe(resolvedDefault.writing.linesPerPage);
      }
    });
  });

  describe('paginateDocument', () => {
    it('paginates text through resolved page layouts and returns the layouts it used', () => {
      const result = paginateDocument({
        text: Array(40).fill('line').join('\n'),
        currentPageIndex: 0,
        renderAllPagesForExport: false,
        settings: {
          ...withTestPaperSelection({
            customBackgroundImage: null,
            customBackgroundImages: [],
            lineHeight: 1.5,
            lineColor: '#a8d4f0',
            paperFormat: 'letter',
            paperOrientation: 'portrait',
            paperPresetId: null,
            paperColor: '#fffef5',
            paperStyle: 'lined',
            ruledMarginLineOffset: -10,
          }),
        },
        pageSettings: [
          {
            marginTop: 50,
            marginRight: 50,
            marginBottom: 50,
            marginLeft: 50,
            fontSize: 20,
          },
        ],
        fontFamily: 'caveat',
      });

      expect(result.pages[0]).toHaveLength(23);
      expect(result.totalPages).toBe(2);
      expect(result.isPaginationComplete).toBe(true);
      expect(result.pageLayouts).toHaveLength(2);
      expect(result.pageLayouts[0]?.writing.linesPerPage).toBe(23);
      expect(result.pageLayouts[0]?.page.width).toBe(PAGE_WIDTH);
      expect(result.pageLayouts[0]?.page.height).toBe(PAGE_HEIGHT);
    });
  });
});
