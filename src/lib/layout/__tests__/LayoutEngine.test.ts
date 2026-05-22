import { describe, expect, it } from 'vitest';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import {
  DEFAULT_SETTINGS,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { paginateDocument, resolvePageLayout } from '../LayoutEngine';

describe('LayoutEngine', () => {
  describe('resolvePageLayout', () => {
    it('resolves built-in paper into a stable page and writing layout contract', () => {
      const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

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
        lineHeightPx: pageSettings.fontSize * DEFAULT_SETTINGS.lineHeight,
        firstLineTop: pageSettings.marginTop,
        linesPerPage: Math.floor(
          (PAGE_HEIGHT - pageSettings.marginTop - pageSettings.marginBottom)
            / (pageSettings.fontSize * DEFAULT_SETTINGS.lineHeight),
        ),
        textBounds: {
          top: pageSettings.marginTop,
          left: pageSettings.marginLeft,
          width: PAGE_WIDTH - pageSettings.marginLeft - pageSettings.marginRight,
          height: PAGE_HEIGHT - pageSettings.marginTop - pageSettings.marginBottom,
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
        ...DEFAULT_SETTINGS,
        customBackgroundImages: ['data:image/png;base64,page-0', 'data:image/png;base64,page-1'],
        paperStyle: 'ruled' as const,
      };

      const resolved = resolvePageLayout({
        pageIndex: 1,
        settings,
        pageSettings,
      });

      expect(resolved.paper).toMatchObject({
        variant: 'upload',
        style: 'ruled',
        presetId: null,
        background: {
          kind: 'image',
          imageSrc: 'data:image/png;base64,page-1',
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
  });

  describe('paginateDocument', () => {
    it('paginates text through resolved page layouts and returns the layouts it used', () => {
      const result = paginateDocument({
        text: Array(40).fill('line').join('\n'),
        currentPageIndex: 0,
        renderAllPagesForExport: false,
        settings: {
          customBackgroundImage: null,
          customBackgroundImages: [],
          lineHeight: 1.5,
          lineColor: '#a8d4f0',
          paperFormat: 'letter',
          paperOrientation: 'portrait',
          paperColor: '#fffef5',
          paperStyle: 'lined',
          ruledMarginLineOffset: -10,
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
