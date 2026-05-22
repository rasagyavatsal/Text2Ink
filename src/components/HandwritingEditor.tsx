'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import {
  HandwritingSettings,
  HANDWRITING_FONTS,
  PageSettings,
  LineData,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import type { PaginationResponse } from '@/lib/pagination';
import {
  calculateRandomStyle,
  calculatePageStartOffsets,
  calculateLineStarts,
} from '@/lib/editorHelpers';
import { resolvePagePaper } from '@/lib/paper/PaperEngine';
import CanvasPreview from './CanvasPreview';
import TextField from './TextField/TextField';

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
  onTypingFocus?: () => void;
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
  onTypingFocus,
}: HandwritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const [fontMetricsVersion, setFontMetricsVersion] = useState(0);
  const [localText, setLocalText] = useState(text);
  const [pages, setPages] = useState<LineData[][]>([[]]);
  const [isPaginationComplete, setIsPaginationComplete] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const latestPaginationRequestIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const [isDraggingMarginLine, setIsDraggingMarginLine] = useState(false);
  const marginLineDragRef = useRef({ pageIndex: 0, pageRect: null as DOMRect | null });
  const marginLinePointerIdRef = useRef<number | null>(null);
  const selectionDragRef = useRef<{ active: boolean; moved: boolean; anchor: number }>({
    active: false,
    moved: false,
    anchor: 0,
  });
  const justDidCanvasDragRef = useRef(false);

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

  const getPageSettings = useCallback(
    (pageIndex: number): PageSettings =>
      pageSettingsByPage[pageIndex] ?? defaultPageSettingsFromHandwritingSettings(settings),
    [pageSettingsByPage, settings]
  );

  const resolvePaperForPage = useCallback(
    (pageIndex: number) =>
      resolvePagePaper({
        pageIndex,
        settings,
        pageSettings: getPageSettings(pageIndex),
      }),
    [getPageSettings, settings],
  );

  const resolvedFontFamily = useMemo(() => {
    if (settings.fontFamily === 'custom' && settings.customFont) {
      return `"${settings.customFont.family}", cursive`;
    }

    const font = HANDWRITING_FONTS.find((f) => f.value === settings.fontFamily);
    if (!font) return 'cursive';
    if (typeof document === 'undefined' || typeof window === 'undefined') return 'cursive';

    const varName = font.className.match(/var\((--[^)]+)\)/)?.[1];
    if (!varName) return 'cursive';

    const scope = document.body ?? document.documentElement;
    const value = window.getComputedStyle(scope).getPropertyValue(varName).trim();
    return value || 'cursive';
  }, [fontMetricsVersion, settings.customFont, settings.fontFamily]);

  const desiredPageSettings = useMemo(() => {
    const desiredLength = Math.max(pageSettingsByPage.length, currentPageIndex + 2);
    const out: Array<{
      customBackgroundImage?: string | null;
      customLineOffset?: number;
      customLineSpacing?: number;
      fontSize: number;
      lineColor?: string;
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      marginLeft: number;
      paperColor?: string;
      paperStyle?: PageSettings['paperStyle'];
    }> = [];

    for (let i = 0; i < desiredLength; i++) {
      const ps = getPageSettings(i);
      out.push({
        customBackgroundImage: ps.customBackgroundImage,
        customLineOffset: ps.customLineOffset ?? undefined,
        customLineSpacing: ps.customLineSpacing ?? undefined,
        fontSize: ps.fontSize,
        lineColor: ps.lineColor,
        marginTop: ps.marginTop,
        marginRight: ps.marginRight,
        marginBottom: ps.marginBottom,
        marginLeft: ps.marginLeft,
        paperColor: ps.paperColor,
        paperStyle: ps.paperStyle,
      });
    }

    return out;
  }, [currentPageIndex, getPageSettings, pageSettingsByPage.length]);

  const debouncedRequestPagination = useDebouncedCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;

    latestPaginationRequestIdRef.current += 1;
    const requestId = latestPaginationRequestIdRef.current;

    worker.postMessage({
      type: 'paginate',
      requestId,
      text: localText,
      currentPageIndex,
      renderAllPagesForExport: exportingPageIndex !== null,
      settings: {
        customBackgroundImage: settings.customBackgroundImage,
        customBackgroundImages: settings.customBackgroundImages,
        lineHeight: settings.lineHeight,
        lineColor: settings.lineColor,
        paperColor: settings.paperColor,
        paperFormat: settings.paperFormat,
        paperOrientation: settings.paperOrientation,
        paperStyle: settings.paperStyle,
        ruledMarginLineOffset: settings.ruledMarginLineOffset,
      },
      pageSettings: desiredPageSettings,
      fontFamily: resolvedFontFamily,
    });
  }, 40);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (workerRef.current) return;

    const worker = new Worker(new URL('../workers/paginationWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const onMessage = (ev: MessageEvent<PaginationResponse>) => {
      const msg = ev.data;
      if (!msg || msg.type !== 'pagination-result') return;
      if (msg.requestId !== latestPaginationRequestIdRef.current) return;

      const nextPages = msg.pages as LineData[][];
      setPages(nextPages);
      onPagesChange?.(nextPages);
      setIsPaginationComplete(msg.isPaginationComplete);
      onPaginationCompleteChange?.(msg.isPaginationComplete);
      setTotalPages(msg.totalPages);
    };

    worker.addEventListener('message', onMessage);
    return () => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [onPagesChange, onPaginationCompleteChange]);

  useEffect(() => {
    debouncedRequestPagination();
  }, [
    currentPageIndex,
    debouncedRequestPagination,
    desiredPageSettings,
    localText,
    exportingPageIndex,
    resolvedFontFamily,
    settings.customBackgroundImage,
    settings.customBackgroundImages,
    settings.paperFormat,
    settings.paperOrientation,
    settings.lineHeight,
    settings.lineColor,
    settings.paperColor,
    settings.paperStyle,
    settings.ruledMarginLineOffset,
  ]);

  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [onTotalPagesChange, totalPages]);

  const applyRandomness = useCallback(
    (charIndex: number, lineIndex: number) => calculateRandomStyle(charIndex, lineIndex, settings.randomness),
    [settings.randomness]
  );

  const syncSelectionFromTextarea = useCallback((el: HTMLTextAreaElement) => {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    setCursorPosition(end);
    setSelectionRange({ start, end });
  }, []);

  const updateVisibleSelection = useCallback((anchor: number, focus: number) => {
    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    setCursorPosition(focus);
    setSelectionRange({ start, end });
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(anchor, focus);
    }
  }, []);

  const handleCharClick = useCallback(
    (e: React.MouseEvent, globalCharIndex: number, isLeftHalf: boolean) => {
      e.stopPropagation();
      const newPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      setCursorPosition(newPosition);
      setSelectionRange({ start: newPosition, end: newPosition });
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    },
    []
  );

  const handleCharKeyDown = useCallback(
    (e: React.KeyboardEvent, globalCharIndex: number, isLeftHalf: boolean = true) => {
      e.stopPropagation();
      const newPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      setCursorPosition(newPosition);
      setSelectionRange({ start: newPosition, end: newPosition });
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    },
    []
  );

  const handleCharMouseDown = useCallback(
    (globalCharIndex: number, isLeftHalf: boolean) => {
      const newPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      selectionDragRef.current = {
        active: true,
        moved: false,
        anchor: newPosition,
      };
      updateVisibleSelection(newPosition, newPosition);
    },
    [updateVisibleSelection]
  );

  const handleCharMouseMove = useCallback(
    (globalCharIndex: number, isLeftHalf: boolean) => {
      if (!selectionDragRef.current.active) return;
      selectionDragRef.current.moved = true;
      const nextPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      updateVisibleSelection(selectionDragRef.current.anchor, nextPosition);
      justDidCanvasDragRef.current = true;
    },
    [updateVisibleSelection]
  );

  const handleSelectionEnd = useCallback(() => {
    if (selectionDragRef.current.active && selectionDragRef.current.moved) {
      justDidCanvasDragRef.current = true;
    }
    selectionDragRef.current.active = false;
    selectionDragRef.current.moved = false;
  }, []);

  const handleCanvasCharClick = useCallback(
    (globalCharIndex: number, isLeftHalf: boolean) => {
      if (justDidCanvasDragRef.current) {
        justDidCanvasDragRef.current = false;
        return;
      }

      const newPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      setCursorPosition(newPosition);
      setSelectionRange({ start: newPosition, end: newPosition });
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    },
    []
  );

  const handleCanvasCharShiftClick = useCallback(
    (globalCharIndex: number, isLeftHalf: boolean) => {
      const newPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      const anchor = cursorPosition ?? newPosition;
      updateVisibleSelection(anchor, newPosition);
    },
    [cursorPosition, updateVisibleSelection]
  );

  const currentPageLines = useMemo(() => pages[currentPageIndex] ?? [], [currentPageIndex, pages]);
  const pageStartOffsets = useMemo(() => calculatePageStartOffsets(pages), [pages]);
  const currentPageStartOffset = pageStartOffsets[currentPageIndex] ?? 0;
  const currentPageLineStarts = useMemo(
    () => calculateLineStarts(currentPageLines, currentPageStartOffset),
    [currentPageLines, currentPageStartOffset]
  );
  const currentPageEndOffset = pageStartOffsets[currentPageIndex + 1] ?? text.length;

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        updateVisibleSelection(currentPageStartOffset, currentPageEndOffset);
      }
    },
    [currentPageEndOffset, currentPageStartOffset, updateVisibleSelection]
  );

  const findWordSelectionRange = useCallback(
    (globalCharIndex: number): { start: number; end: number } | null => {
      if (currentPageLines.length === 0 || currentPageStartOffset >= currentPageEndOffset) return null;

      const pageStart = currentPageStartOffset;
      const pageEnd = currentPageEndOffset;
      const pageText = text.slice(pageStart, pageEnd);
      if (pageText.length === 0) return null;

      const localIndex = Math.max(0, Math.min(globalCharIndex - pageStart, pageText.length - 1));
      if (/\s/.test(pageText[localIndex] ?? '')) return null;

      let start = localIndex;
      while (start > 0 && !/\s/.test(pageText[start - 1] ?? '')) start -= 1;

      let end = localIndex + 1;
      while (end < pageText.length && !/\s/.test(pageText[end] ?? '')) end += 1;

      return { start: pageStart + start, end: pageStart + end };
    },
    [currentPageEndOffset, currentPageLines.length, currentPageStartOffset, text]
  );

  const findLineSelectionRange = useCallback(
    (globalCharIndex: number): { start: number; end: number } | null => {
      if (currentPageLines.length === 0) return null;

      for (let i = 0; i < currentPageLines.length; i++) {
        const line = currentPageLines[i];
        const lineStart = currentPageLineStarts[i] ?? currentPageStartOffset;
        const lineEnd = lineStart + line.text.length + (line.hasNewline ? 1 : 0);
        if (globalCharIndex >= lineStart && globalCharIndex <= lineEnd) {
          return { start: lineStart, end: lineStart + line.text.length };
        }
      }

      const lastLine = currentPageLines[currentPageLines.length - 1];
      if (!lastLine) return null;
      const lastStart = currentPageLineStarts[currentPageLineStarts.length - 1] ?? currentPageStartOffset;
      return { start: lastStart, end: lastStart + lastLine.text.length };
    },
    [currentPageLineStarts, currentPageLines, currentPageStartOffset]
  );

  const handleCanvasCharDoubleClick = useCallback(
    (globalCharIndex: number) => {
      const range = findWordSelectionRange(globalCharIndex);
      if (!range) return;
      updateVisibleSelection(range.start, range.end);
    },
    [findWordSelectionRange, updateVisibleSelection]
  );

  const handleCanvasCharTripleClick = useCallback(
    (globalCharIndex: number) => {
      const range = findLineSelectionRange(globalCharIndex);
      if (!range) return;
      updateVisibleSelection(range.start, range.end);
    },
    [findLineSelectionRange, updateVisibleSelection]
  );

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (justDidCanvasDragRef.current) {
        justDidCanvasDragRef.current = false;
        return;
      }

      const textarea = textareaRef.current;
      textarea?.focus();
      if (textarea) {
        syncSelectionFromTextarea(textarea);
      }
    },
    [syncSelectionFromTextarea]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setLocalText(next);
      debouncedPropagateText(next);
      syncSelectionFromTextarea(e.target);
    },
    [debouncedPropagateText, syncSelectionFromTextarea]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const el = textareaRef.current;
      if (!el) return;

      const pastedRaw = e.clipboardData?.getData('text/plain');
      if (!pastedRaw) return;
      if (!pastedRaw.includes('\n') && !pastedRaw.includes('\r')) return;

      e.preventDefault();

      const normalized = pastedRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const paragraphs = normalized.split('\n\n');
      const reflowed = paragraphs.map((p) => p.replace(/\n/g, ' ')).join('\n\n');

      const start = el.selectionStart ?? cursorPosition;
      const end = el.selectionEnd ?? cursorPosition;
      const nextText = text.slice(0, start) + reflowed + text.slice(end);
      const nextCursor = start + reflowed.length;

      setLocalText(nextText);
      debouncedPropagateText(nextText);
      setCursorPosition(nextCursor);
      setSelectionRange({ start: nextCursor, end: nextCursor });
      requestAnimationFrame(() => {
        el.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [cursorPosition, debouncedPropagateText, text]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      syncSelectionFromTextarea(e.target as HTMLTextAreaElement);
    },
    [syncSelectionFromTextarea]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      syncSelectionFromTextarea(e.target as HTMLTextAreaElement);
    },
    [syncSelectionFromTextarea]
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      syncSelectionFromTextarea(e.currentTarget);
    },
    [syncSelectionFromTextarea]
  );

  useEffect(() => {
    if (currentPageIndex > pages.length - 1) {
      onCurrentPageChange(Math.max(0, pages.length - 1));
    }
  }, [currentPageIndex, onCurrentPageChange, pages.length]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!isDraggingMarginLine) return;
    if (!onSettingsChange) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const handleMove = (e: PointerEvent) => {
      if (marginLinePointerIdRef.current !== null && e.pointerId !== marginLinePointerIdRef.current) return;
      const { pageIndex, pageRect } = marginLineDragRef.current;
      if (!pageRect) return;

      const ps = getPageSettings(pageIndex);
      const resolvedPaper = resolvePaperForPage(pageIndex);
      const clientX = e.clientX;
      const x = (clientX - pageRect.left) / previewScale;
      const minLeft = 0;
      const maxLeft = resolvedPaper.geometry.pageWidth;
      const clampedLeft = clamp(x, minLeft, maxLeft);
      const newOffset = clampedLeft - ps.marginLeft;

      const minOffset = -ps.marginLeft;
      const maxOffset = resolvedPaper.geometry.pageWidth - ps.marginLeft;
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
  }, [getPageSettings, isDraggingMarginLine, onSettingsChange, previewScale, resolvePaperForPage, settings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (workerRef.current) return;

    const worker = new Worker(new URL('../workers/paginationWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const onMessage = (ev: MessageEvent<PaginationResponse>) => {
      const msg = ev.data;
      if (!msg || msg.type !== 'pagination-result') return;
      if (msg.requestId !== latestPaginationRequestIdRef.current) return;

      const nextPages = msg.pages as LineData[][];
      setPages(nextPages);
      onPagesChange?.(nextPages);
      setIsPaginationComplete(msg.isPaginationComplete);
      onPaginationCompleteChange?.(msg.isPaginationComplete);
      setTotalPages(msg.totalPages);
    };

    worker.addEventListener('message', onMessage);
    return () => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [onPagesChange, onPaginationCompleteChange]);

  useEffect(() => {
    debouncedRequestPagination();
  }, [
    currentPageIndex,
    debouncedRequestPagination,
    desiredPageSettings,
    localText,
    exportingPageIndex,
    resolvedFontFamily,
    settings.customBackgroundImage,
    settings.customBackgroundImages,
    settings.lineHeight,
    settings.lineColor,
    settings.paperColor,
    settings.paperStyle,
    settings.ruledMarginLineOffset,
  ]);

  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [onTotalPagesChange, totalPages]);

  const renderPage = useCallback(
    (pageIndex: number, scale: number, isVisiblePreview: boolean) => {
      const pageLines = pages[pageIndex] ?? [];
      const ps = getPageSettings(pageIndex);
      const resolvedPaper = resolvePaperForPage(pageIndex);
      const { geometry } = resolvedPaper;
      const showCursorForPage = isVisiblePreview && pageIndex === currentPageIndex;
      const effectiveCursorPositionForPage = showCursorForPage && isFocused ? cursorPosition : null;
      const currentStartOffset = pageStartOffsets[pageIndex] ?? 0;

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
            width: geometry.pageWidth * scale,
            height: geometry.pageHeight * scale,
          }}
          role="button"
          tabIndex={isVisiblePreview ? 0 : -1}
          aria-label={`Page ${pageIndex + 1}`}
          onClick={(e) => {
            if (!isVisiblePreview) return;
            handlePageClick(e);
          }}
          onKeyDown={(e) => {
            if (!isVisiblePreview) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePageClick(e as unknown as React.MouseEvent<HTMLDivElement>);
            }
          }}
        >
          <CanvasPreview
            lines={pageLines}
            pageSettings={ps}
            settings={settings}
            pageIndex={pageIndex}
            previewScale={scale}
            fontFamily={resolvedFontFamily}
            cursorPosition={effectiveCursorPositionForPage}
            selectionStart={selectionRange.start}
            selectionEnd={selectionRange.end}
            pageStartOffset={currentStartOffset}
            isFocused={isFocused}
            onCharClick={isVisiblePreview ? handleCanvasCharClick : undefined}
            onCharShiftClick={isVisiblePreview ? handleCanvasCharShiftClick : undefined}
            onCharDoubleClick={isVisiblePreview ? handleCanvasCharDoubleClick : undefined}
            onCharTripleClick={isVisiblePreview ? handleCanvasCharTripleClick : undefined}
            onCharMouseDown={isVisiblePreview ? handleCharMouseDown : undefined}
            onCharMouseMove={isVisiblePreview ? handleCharMouseMove : undefined}
            onMouseUp={isVisiblePreview ? handleSelectionEnd : undefined}
          />

          {isVisiblePreview && ps.textFields?.map((field) => (
            <div
              key={field.id}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <TextField
                field={field}
                scale={scale}
                fontFamily={resolvedFontFamily}
                randomness={settings.randomness}
                onTypingFocus={onTypingFocus}
                onUpdate={(updates) => {
                  const nextFields = ps.textFields?.map((f) =>
                    f.id === field.id ? { ...f, ...updates } : f
                  );
                  onPageSettingsChange?.({ ...ps, textFields: nextFields });
                }}
                onDelete={() => {
                  const nextFields = ps.textFields?.filter((f) => f.id !== field.id);
                  onPageSettingsChange?.({ ...ps, textFields: nextFields });
                }}
              />
            </div>
          ))}

          {isVisiblePreview && resolvedPaper.guides.kind === 'ruled' && onSettingsChange && (
            <button
              type="button"
              className="absolute border-0 bg-transparent p-0"
              style={{
                left: (resolvedPaper.guides.marginLineX - 6) * scale,
                top: geometry.contentBounds.top * scale,
                width: 14 * scale,
                height: geometry.contentBounds.height * scale,
                cursor: 'col-resize',
                backgroundColor: 'transparent',
              }}
              onPointerDown={(e) => {
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
              aria-valuemax={geometry.pageWidth - (ps.marginLeft + ps.marginRight)}
              aria-valuenow={settings.ruledMarginLineOffset}
              aria-orientation="vertical"
              tabIndex={0}
            />
          )}
        </div>
      );
    },
    [
      cursorPosition,
      getPageSettings,
      handleCharMouseDown,
      handleCharMouseMove,
      handleCanvasCharClick,
      handleCanvasCharDoubleClick,
      handleCanvasCharShiftClick,
      handleCanvasCharTripleClick,
      handlePageClick,
      handleSelectionEnd,
      isFocused,
      onSettingsChange,
      onTypingFocus,
      pageStartOffsets,
      pages,
      resolvePaperForPage,
      resolvedFontFamily,
      selectionRange.end,
      selectionRange.start,
      settings,
      currentPageIndex,
      onPageSettingsChange,
    ]
  );

  const visiblePage = pages.length > 0 ? renderPage(currentPageIndex, previewScale, true) : null;

  return (
    <div className={`flex flex-col items-center ${isMobileLayout ? 'gap-4 py-3' : 'gap-8 py-8'}`}>
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleTextChange}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            // Keep typing keys inside the editor so page-level keyboard handlers do not steal focus.
            e.stopPropagation();
          }
          handleTextareaKeyDown(e);
        }}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onSelect={handleSelect}
        onFocus={(e) => {
          onTypingFocus?.();
          setIsFocused(true);
          syncSelectionFromTextarea(e.currentTarget);
        }}
        onBlur={() => setIsFocused(false)}
        className="sr-only"
        aria-label="Handwriting text input"
        inputMode="text"
        spellCheck={false}
        autoFocus
      />

      {visiblePage}
    </div>
  );
}
