'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import {
  HandwritingSettings,
  HANDWRITING_FONTS,
  PageSettings,
  LineData,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { paginateDom } from '@/lib/domPagination';
import {
  calculatePageStartOffsets,
} from '@/lib/editorHelpers';
import { replaceSourceTextSlice } from '@/lib/domText';
import { resolvePageLayout } from '@/lib/pageLayout';
import PageContent from './PageContent';

interface HandwritingEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  settings: HandwritingSettings;
  onSettingsChange?: (settings: HandwritingSettings) => void;
  pageSettingsByPage: PageSettings[];
  onPageSettingsChange?: (settings: PageSettings) => void;
  exportingPageIndex?: number | null;
  previewScale: number;
  onPreviewScaleChange: (value: number) => void;
  currentPageIndex: number;
  onCurrentPageChange: (pageIndex: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
  onPagesChange?: (pages: LineData[][]) => void;
  onPaginationCompleteChange?: (isComplete: boolean) => void;
  onApplyToAllPages?: () => void;
  isMobileLayout?: boolean;
  onPreviewEditingChange?: (isPreviewEditing: boolean) => void;
  isExportLocked?: boolean;
  onBlockedEditAttempt?: () => void;
}

function useDebouncedCallback<TArgs extends unknown[]>(cb: (...args: TArgs) => void, delayMs: number) {
  const cbRef = useRef(cb);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        cbRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );
}

export default function HandwritingEditor({
  text,
  onTextChange,
  settings,
  onSettingsChange,
  pageSettingsByPage,
  onPageSettingsChange,
  exportingPageIndex = null,
  previewScale,
  onPreviewScaleChange,
  currentPageIndex,
  onCurrentPageChange,
  onTotalPagesChange,
  onPagesChange,
  onPaginationCompleteChange,
  onApplyToAllPages,
  isMobileLayout = false,
  onPreviewEditingChange,
  isExportLocked = false,
  onBlockedEditAttempt,
}: HandwritingEditorProps) {
  void onPreviewScaleChange;
  void onApplyToAllPages;
  const pageElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [fontMetricsVersion, setFontMetricsVersion] = useState(0);
  const [localText, setLocalText] = useState(text);
  const [pages, setPages] = useState<LineData[][]>([[]]);
  const [totalPages, setTotalPages] = useState(1);
  const latestPaginationRequestIdRef = useRef(0);
  const [isDraggingMarginLine, setIsDraggingMarginLine] = useState(false);
  const marginLineDragRef = useRef({ pageIndex: 0, pageRect: null as DOMRect | null });
  const marginLinePointerIdRef = useRef<number | null>(null);
  useEffect(() => {
    setLocalText(text);
  }, [text]);

  const debouncedPropagateText = useDebouncedCallback((nextText: string) => {
    onTextChange(nextText);
  }, 150);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fonts = document.fonts;
    if (!fonts) return;

    let cancelled = false;
    const bump = () => {
      if (cancelled) return;
      setFontMetricsVersion((v) => v + 1);
    };

    fonts.ready.then(bump).catch(() => {});
    fonts.addEventListener('loadingdone', bump);
    fonts.addEventListener('loadingerror', bump);
    return () => {
      cancelled = true;
      fonts.removeEventListener('loadingdone', bump);
      fonts.removeEventListener('loadingerror', bump);
    };
  }, [settings.fontFamily, settings.customFont, settings.fontSize]);

  useEffect(() => {
    const styleId = '__text2ink_custom_font_style';

    if (!settings.customFont) {
      document.getElementById(styleId)?.remove();
      return;
    }

    const { family, dataUrl, format } = settings.customFont;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `@font-face{font-family:"${family}";src:url("${dataUrl}") format("${format}");font-display:swap;}`;

    let cancelled = false;
    const face = new FontFace(family, `url("${dataUrl}")`);
    face
      .load()
      .then((loaded) => {
        if (cancelled) return;
        document.fonts.add(loaded);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [settings.customFont]);

  const getBackgroundForPage = useCallback(
    (pageIndex: number) =>
      settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage,
    [settings.customBackgroundImages, settings.customBackgroundImage]
  );

  const hasAnyCustomBackground =
    (settings.customBackgroundImages?.length ?? 0) > 0 || !!settings.customBackgroundImage;

  const getPageSettings = useCallback(
    (pageIndex: number): PageSettings =>
      pageSettingsByPage[pageIndex] ?? defaultPageSettingsFromHandwritingSettings(settings),
    [pageSettingsByPage, settings]
  );

  const resolvedFontFamily = useMemo(() => {
    if (settings.fontFamily === 'custom' && settings.customFont) {
      return `"${settings.customFont.family}", cursive`;
    }

    const font = HANDWRITING_FONTS.find((f) => f.value === settings.fontFamily);
    if (!font) return 'cursive';
    if (typeof document === 'undefined' || typeof window === 'undefined') return 'cursive';
    void fontMetricsVersion;

    const varName = font.className.match(/var\((--[^)]+)\)/)?.[1];
    if (!varName) return 'cursive';

    const scope = document.body ?? document.documentElement;
    const value = window.getComputedStyle(scope).getPropertyValue(varName).trim();
    return value || 'cursive';
  }, [fontMetricsVersion, settings.customFont, settings.fontFamily]);

  const desiredPageSettings = useMemo(() => {
    const desiredLength = Math.max(pageSettingsByPage.length, currentPageIndex + 2);
    const out: Array<{
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      marginLeft: number;
      fontSize: number;
      customLineSpacing?: number;
      customLineOffset?: number;
      writingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      lineSpacing?: number;
    }> = [];

    for (let i = 0; i < desiredLength; i++) {
      const ps = getPageSettings(i);
      const layout = resolvePageLayout({ settings, pageSettings: ps, pageIndex: i });
      out.push({
        marginTop: ps.marginTop,
        marginRight: ps.marginRight,
        marginBottom: ps.marginBottom,
        marginLeft: ps.marginLeft,
        fontSize: ps.fontSize,
        customLineSpacing: ps.customLineSpacing ?? undefined,
        customLineOffset: ps.customLineOffset ?? undefined,
        writingBox: layout.writingBox,
        lineSpacing: layout.lineSpacing,
      });
    }

    return out;
  }, [currentPageIndex, getPageSettings, pageSettingsByPage.length, settings]);

  const currentLayout = useMemo(
    () => resolvePageLayout({ settings, pageSettings: getPageSettings(currentPageIndex), pageIndex: currentPageIndex }),
    [currentPageIndex, getPageSettings, settings],
  );

  const desiredPageHasBackground = useMemo(() => {
    const desiredLength = Math.max(pageSettingsByPage.length, currentPageIndex + 2);
    const out: boolean[] = [];
    for (let i = 0; i < desiredLength; i++) {
      out.push(!!getBackgroundForPage(i));
    }
    return out;
  }, [currentPageIndex, getBackgroundForPage, pageSettingsByPage.length]);

  const debouncedRequestPagination = useDebouncedCallback(() => {
    latestPaginationRequestIdRef.current += 1;
    const requestId = latestPaginationRequestIdRef.current;

    const msg = paginateDom({
      type: 'paginate',
      requestId,
      text: localText,
      currentPageIndex,
      renderAllPagesForExport: exportingPageIndex !== null,
      pageWidth: currentLayout.width,
      pageHeight: currentLayout.height,
      hasAnyCustomBackground,
      settings: {
        lineHeight: settings.lineHeight,
        paperStyle: settings.paperStyle,
        ruledMarginLineOffset: settings.ruledMarginLineOffset,
      },
      pages: desiredPageSettings,
      pageHasBackground: desiredPageHasBackground,
      fontFamily: resolvedFontFamily,
    });

    if (msg.requestId !== latestPaginationRequestIdRef.current) return;
    const nextPages = msg.pages as LineData[][];
    setPages(nextPages);
    onPagesChange?.(nextPages);
    onPaginationCompleteChange?.(msg.isPaginationComplete);
    setTotalPages(msg.totalPages);
  }, 80);

  useEffect(() => {
    debouncedRequestPagination();
  }, [
    currentPageIndex,
    debouncedRequestPagination,
    desiredPageHasBackground,
    desiredPageSettings,
    hasAnyCustomBackground,
    localText,
    exportingPageIndex,
    resolvedFontFamily,
    settings.lineHeight,
    settings.paperStyle,
    settings.ruledMarginLineOffset,
    currentLayout.width,
    currentLayout.height,
  ]);

  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [onTotalPagesChange, totalPages]);

  const pageStartOffsets = useMemo(() => calculatePageStartOffsets(pages), [pages]);

  const replacePageText = useCallback(
    (pageIndex: number, editedPageText: string) => {
      const start = pageStartOffsets[pageIndex] ?? 0;
      const end = pageStartOffsets[pageIndex + 1] ?? localText.length;
      const nextText = replaceSourceTextSlice(localText, start, end, editedPageText);
      setLocalText(nextText);
      debouncedPropagateText(nextText);
    },
    [debouncedPropagateText, localText, pageStartOffsets]
  );

  useEffect(() => {
    if (currentPageIndex > pages.length - 1) {
      onCurrentPageChange(Math.max(0, pages.length - 1));
    }
  }, [currentPageIndex, onCurrentPageChange, pages.length]);

  useEffect(() => {
    if (!isDraggingMarginLine) return;
    if (!onSettingsChange) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const handleMove = (e: PointerEvent) => {
      if (isExportLocked) {
        onBlockedEditAttempt?.();
        marginLinePointerIdRef.current = null;
        setIsDraggingMarginLine(false);
        return;
      }
      if (marginLinePointerIdRef.current !== null && e.pointerId !== marginLinePointerIdRef.current) return;
      const { pageIndex, pageRect } = marginLineDragRef.current;
      if (!pageRect) return;

      const ps = getPageSettings(pageIndex);
      const layout = resolvePageLayout({ settings, pageSettings: ps, pageIndex });
      const clientX = e.clientX;
      const x = (clientX - pageRect.left) / previewScale;
      const minLeft = 0;
      const maxLeft = layout.width;
      const clampedLeft = clamp(x, minLeft, maxLeft);
      const newOffset = clampedLeft - ps.marginLeft;

      const minOffset = -ps.marginLeft;
      const maxOffset = layout.width - ps.marginLeft;
      const clampedOffset = clamp(newOffset, minOffset, maxOffset);

      if (clampedOffset === settings.ruledMarginLineOffset) return;
      onSettingsChange({ ...settings, ruledMarginLineOffset: clampedOffset });
    };

    const handleUp = (e: PointerEvent) => {
      if (marginLinePointerIdRef.current !== null && e.pointerId !== marginLinePointerIdRef.current) return;
      marginLinePointerIdRef.current = null;
      setIsDraggingMarginLine(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [getPageSettings, isDraggingMarginLine, isExportLocked, onBlockedEditAttempt, onSettingsChange, previewScale, settings]);

  const renderPage = useCallback(
    (pageIndex: number, scale: number, isVisiblePreview: boolean) => {
      const ps = getPageSettings(pageIndex);
      const layout = resolvePageLayout({ settings, pageSettings: ps, pageIndex });
      const currentStartOffset = pageStartOffsets[pageIndex] ?? 0;
      const currentEndOffset = pageStartOffsets[pageIndex + 1] ?? localText.length;
      const pageText = localText.slice(currentStartOffset, currentEndOffset);

      return (
        <div
          key={pageIndex}
          ref={(el) => {
            if (isVisiblePreview) {
              pageElsRef.current[pageIndex] = el;
            }
          }}
          className="relative shadow-2xl"
          style={{
            width: layout.width * scale,
            height: layout.height * scale,
          }}
          aria-label={`Page ${pageIndex + 1}`}
        >
          <PageContent
            pageIndex={pageIndex}
            pageText={pageText}
            pageSettings={ps}
            settings={settings}
            fontFamily={resolvedFontFamily}
            scale={scale}
            editable={isVisiblePreview}
            isLocked={isVisiblePreview && isExportLocked}
            onPageTextChange={(nextPageText) => replacePageText(pageIndex, nextPageText)}
            onPageSettingsChange={onPageSettingsChange}
            onPreviewEditingChange={onPreviewEditingChange}
            onBlockedEditAttempt={onBlockedEditAttempt}
          />

          {isVisiblePreview && layout.controls.showMarginControls && settings.paperStyle === 'ruled' && !getBackgroundForPage(pageIndex) && onSettingsChange && (
            <button
              type="button"
              className="absolute border-0 bg-transparent p-0"
              style={{
                left: (ps.marginLeft + settings.ruledMarginLineOffset - 6) * scale,
                top: ps.marginTop * scale,
                width: 14 * scale,
                height: (layout.height - ps.marginTop - ps.marginBottom) * scale,
                cursor: isExportLocked ? 'not-allowed' : 'col-resize',
                backgroundColor: 'transparent',
              }}
              onPointerDown={(e) => {
                if (isExportLocked) {
                  e.preventDefault();
                  e.stopPropagation();
                  onBlockedEditAttempt?.();
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
                const pointerId = typeof e.pointerId === 'number' ? e.pointerId : null;
                marginLinePointerIdRef.current = pointerId;
                if (pointerId !== null) {
                  e.currentTarget.setPointerCapture?.(pointerId);
                }
                setIsDraggingMarginLine(true);
                const pageEl = pageElsRef.current[pageIndex];
                marginLineDragRef.current = {
                  pageIndex,
                  pageRect: pageEl ? pageEl.getBoundingClientRect() : null,
                };
              }}
              onKeyDown={(e) => {
                if (isExportLocked) {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onBlockedEditAttempt?.();
                  }
                  return;
                }
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsDraggingMarginLine(true);
                  const pageEl = pageElsRef.current[pageIndex];
                  marginLineDragRef.current = {
                    pageIndex,
                    pageRect: pageEl ? pageEl.getBoundingClientRect() : null,
                  };
                }
              }}
              title="Drag to reposition margin line"
              aria-label="Drag to reposition margin line"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={layout.width - (ps.marginLeft + ps.marginRight)}
              aria-valuenow={settings.ruledMarginLineOffset}
              aria-orientation="vertical"
              aria-disabled={isExportLocked}
              tabIndex={0}
            />
          )}
        </div>
      );
    },
    [
      getBackgroundForPage,
      getPageSettings,
      localText,
      onSettingsChange,
      onPreviewEditingChange,
      pageStartOffsets,
      replacePageText,
      resolvedFontFamily,
      settings,
      onPageSettingsChange,
      onBlockedEditAttempt,
      isExportLocked,
    ]
  );

  const visiblePageIndices = useMemo(() => {
    const start = Math.max(0, currentPageIndex - 1);
    const end = Math.min(pages.length - 1, currentPageIndex + 1);
    const indices: number[] = [];

    for (let pageIndex = start; pageIndex <= end; pageIndex++) {
      indices.push(pageIndex);
    }

    return indices;
  }, [currentPageIndex, pages.length]);

  return (
    <div className={`flex flex-col items-center ${isMobileLayout ? 'gap-4 py-3' : 'gap-8 py-8'}`}>
      {visiblePageIndices.map((pageIndex) => renderPage(pageIndex, previewScale, pageIndex === currentPageIndex))}
    </div>
  );
}
