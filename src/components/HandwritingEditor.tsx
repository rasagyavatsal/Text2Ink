'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import {
  HandwritingSettings,
  PageSettings,
  LineData,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import {
  calculatePageStartOffsets,
  calculateLineStarts,
} from '@/lib/editorHelpers';
import { ensureHandwritingFontsReady, resolveHandwritingFontFamily } from '@/lib/fontResolver';
import { paginateDocument, resolvePageLayout } from '@/lib/layout/LayoutEngine';
import CanvasPreview from './CanvasPreview';
import TextField from './TextField/TextField';

interface HandwritingEditorProps {
  readonly text: string;
  readonly onTextChange: (text: string) => void;
  readonly settings: HandwritingSettings;
  readonly onSettingsChange?: (settings: HandwritingSettings) => void;
  readonly pageSettingsByPage: PageSettings[];
  readonly onPageSettingsChange?: (settings: PageSettings) => void;
  readonly previewScale: number;
  readonly currentPageIndex: number;
  readonly onCurrentPageChange: (pageIndex: number) => void;
  readonly onTotalPagesChange?: (totalPages: number) => void;
  readonly onPagesChange?: (pages: LineData[][]) => void;
  readonly onPaginationCompleteChange?: (isComplete: boolean) => void;
  readonly isMobileLayout?: boolean;
  readonly onTypingFocus?: () => void;
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
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current !== null) {
        globalThis.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = globalThis.setTimeout(() => {
        cbRef.current(...args);
      }, delayMs) as unknown as number;
    },
    [delayMs]
  );
}

type SelectionDirection = 'forward' | 'backward' | 'none';

interface EditorSelectionRange {
  readonly start: number;
  readonly end: number;
  readonly direction: SelectionDirection;
}

function normalizeSelectionDirection(
  start: number,
  end: number,
  direction: SelectionDirection | string | null,
): SelectionDirection {
  if (start === end) return 'none';
  return direction === 'backward' ? 'backward' : 'forward';
}

function createSelectionRange(anchor: number, focus: number): EditorSelectionRange {
  const start = Math.min(anchor, focus);
  const end = Math.max(anchor, focus);
  const direction = start === end ? 'none' : focus < anchor ? 'backward' : 'forward';
  return { start, end, direction };
}

function getSelectionFocus(selection: EditorSelectionRange) {
  return selection.direction === 'backward' ? selection.start : selection.end;
}

export default function HandwritingEditor({
  text,
  onTextChange,
  settings,
  onSettingsChange,
  pageSettingsByPage,
  onPageSettingsChange,
  previewScale,
  currentPageIndex,
  onCurrentPageChange,
  onTotalPagesChange,
  onPagesChange,
  onPaginationCompleteChange,
  isMobileLayout = false,
  onTypingFocus,
}: HandwritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageElsRef = useRef<(HTMLElement | null)[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectionRange, setSelectionRange] = useState<EditorSelectionRange>({
    start: 0,
    end: 0,
    direction: 'none',
  });
  const [localText, setLocalText] = useState(text);
  const [lastTextProp, setLastTextProp] = useState(text);
  const [pages, setPages] = useState<LineData[][]>([[]]);
  const [isPaginationComplete, setIsPaginationComplete] = useState(true);
  void isPaginationComplete;
  const [totalPages, setTotalPages] = useState(1);
  const latestPaginationRequestIdRef = useRef(0);
  const [isDraggingMarginLine, setIsDraggingMarginLine] = useState(false);
  const marginLineDragRef = useRef({ pageIndex: 0, pageRect: null as DOMRect | null });
  const marginLinePointerIdRef = useRef<number | null>(null);
  const selectionDragRef = useRef<{ active: boolean; moved: boolean; anchor: number }>({
    active: false,
    moved: false,
    anchor: 0,
  });
  const justDidCanvasDragRef = useRef(false);

  if (text !== lastTextProp) {
    setLastTextProp(text);
    setLocalText(text);
  }

  const debouncedPropagateText = useDebouncedCallback((nextText: string) => {
    onTextChange(nextText);
  }, 150);

  const defaultPageSettings = useMemo(
    () => defaultPageSettingsFromHandwritingSettings(settings),
    [settings],
  );

  useEffect(() => {
    return () => {
      latestPaginationRequestIdRef.current += 1;
    };
  }, []);

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
      pageSettingsByPage[pageIndex] ?? defaultPageSettings,
    [defaultPageSettings, pageSettingsByPage]
  );

  const resolveLayoutForPage = useCallback(
    (pageIndex: number) =>
      resolvePageLayout({
        pageIndex,
        settings,
        pageSettings: getPageSettings(pageIndex),
      }),
    [getPageSettings, settings],
  );

  const resolvedFontFamily = useMemo(() => {
    return resolveHandwritingFontFamily(settings);
  }, [settings]);

  const desiredPageSettings = useMemo(() => {
    const desiredLength = Math.max(pageSettingsByPage.length, currentPageIndex + 2);
    const out: Array<{
      customBackgroundImage?: string | null;
      customLineOffset?: number;
      customLineSpacing?: number;
      fontSize: number;
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      marginLeft: number;
      paperColor?: string;
      textHorizontalOffset?: number;
    }> = [];

    for (let i = 0; i < desiredLength; i++) {
      const ps = getPageSettings(i);
      out.push({
        customBackgroundImage: ps.customBackgroundImage,
        customLineOffset: ps.customLineOffset ?? undefined,
        customLineSpacing: ps.customLineSpacing ?? undefined,
        fontSize: ps.fontSize,
        marginTop: ps.marginTop,
        marginRight: ps.marginRight,
        marginBottom: ps.marginBottom,
        marginLeft: ps.marginLeft,
        paperColor: ps.paperColor,
        textHorizontalOffset: ps.textHorizontalOffset,
      });
    }

    return out;
  }, [currentPageIndex, getPageSettings, pageSettingsByPage.length]);

  const debouncedRequestPagination = useDebouncedCallback(async () => {
    latestPaginationRequestIdRef.current += 1;
    const requestId = latestPaginationRequestIdRef.current;

    await ensureHandwritingFontsReady(
      settings,
      resolvedFontFamily,
      desiredPageSettings.map((pageSettings) => pageSettings.fontSize),
    );

    if (requestId !== latestPaginationRequestIdRef.current) return;

    const result = paginateDocument({
      text: localText,
      currentPageIndex,
      renderAllPagesForExport: false,
      settings: {
        customBackgroundImage: settings.customBackgroundImage,
        customBackgroundImages: settings.customBackgroundImages,
        lineHeight: settings.lineHeight,
        paperColor: settings.paperColor,
        paper: settings.paper,
        randomness: settings.randomness,
        ruledMarginLineOffset: settings.ruledMarginLineOffset,
        textHorizontalOffset: settings.textHorizontalOffset,
      },
      pageSettings: desiredPageSettings,
      fontFamily: resolvedFontFamily,
    });

    if (requestId !== latestPaginationRequestIdRef.current) return;

    const nextPages = result.pages as LineData[][];
    setPages(nextPages);
    onPagesChange?.(nextPages);
    setIsPaginationComplete(result.isPaginationComplete);
    onPaginationCompleteChange?.(result.isPaginationComplete);
    setTotalPages(result.totalPages);
  }, 40);

  useEffect(() => {
    debouncedRequestPagination();
  }, [
    currentPageIndex,
    debouncedRequestPagination,
    desiredPageSettings,
    localText,
    resolvedFontFamily,
    settings.customBackgroundImage,
    settings.customBackgroundImages,
    settings.paper,
    settings.lineHeight,
    settings.paperColor,
    settings.randomness,
    settings.ruledMarginLineOffset,
    settings.textHorizontalOffset,
  ]);

  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [onTotalPagesChange, totalPages]);

  const syncSelectionFromTextarea = useCallback((el: HTMLTextAreaElement) => {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const selection = {
      start,
      end,
      direction: normalizeSelectionDirection(start, end, el.selectionDirection),
    };
    setCursorPosition(getSelectionFocus(selection));
    setSelectionRange(selection);
  }, []);

  const focusTextareaWithSelection = useCallback((selection: EditorSelectionRange) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.setSelectionRange(selection.start, selection.end, selection.direction);
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(selection.start, selection.end, selection.direction);
  }, []);

  const updateVisibleSelection = useCallback((anchor: number, focus: number) => {
    const selection = createSelectionRange(anchor, focus);
    focusTextareaWithSelection(selection);
    setCursorPosition(getSelectionFocus(selection));
    setSelectionRange(selection);
  }, [focusTextareaWithSelection]);

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
      updateVisibleSelection(newPosition, newPosition);
    },
    [updateVisibleSelection]
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
    (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      if (justDidCanvasDragRef.current) {
        justDidCanvasDragRef.current = false;
        return;
      }

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus({ preventScroll: true });
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

      const normalized = pastedRaw.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
      const paragraphs = normalized.split('\n\n');
      const reflowed = paragraphs.map((p) => p.replaceAll('\n', ' ')).join('\n\n');

      const start = el.selectionStart ?? cursorPosition;
      const end = el.selectionEnd ?? cursorPosition;
      const nextText = text.slice(0, start) + reflowed + text.slice(end);
      const nextCursor = start + reflowed.length;

      setLocalText(nextText);
      debouncedPropagateText(nextText);
      setCursorPosition(nextCursor);
      setSelectionRange({ start: nextCursor, end: nextCursor, direction: 'none' });
      requestAnimationFrame(() => {
        el.setSelectionRange(nextCursor, nextCursor, 'none');
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
      textareaRef.current.focus({ preventScroll: true });
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
      const resolvedLayout = resolveLayoutForPage(pageIndex);
      const clientX = e.clientX;
      const x = (clientX - pageRect.left) / previewScale;
      const minLeft = 0;
      const maxLeft = resolvedLayout.page.width;
      const clampedLeft = clamp(x, minLeft, maxLeft);
      const newOffset = clampedLeft - ps.marginLeft;

      const minOffset = -ps.marginLeft;
      const maxOffset = resolvedLayout.page.width - ps.marginLeft;
      const clampedOffset = clamp(newOffset, minOffset, maxOffset);

      if (clampedOffset === settings.ruledMarginLineOffset) return;
      onSettingsChange({ ...settings, ruledMarginLineOffset: clampedOffset });
    };

    const handleUp = (e: PointerEvent) => {
      if (marginLinePointerIdRef.current !== null && e.pointerId !== marginLinePointerIdRef.current) return;
      marginLinePointerIdRef.current = null;
      setIsDraggingMarginLine(false);
    };

    globalThis.addEventListener('pointermove', handleMove);
    globalThis.addEventListener('pointerup', handleUp);
    globalThis.addEventListener('pointercancel', handleUp);
    return () => {
      globalThis.removeEventListener('pointermove', handleMove);
      globalThis.removeEventListener('pointerup', handleUp);
      globalThis.removeEventListener('pointercancel', handleUp);
    };
  }, [getPageSettings, isDraggingMarginLine, onSettingsChange, previewScale, resolveLayoutForPage, settings]);

  const renderPage = useCallback(
    (pageIndex: number, scale: number, isVisiblePreview: boolean) => {
      const pageLines = pages[pageIndex] ?? [];
      const ps = getPageSettings(pageIndex);
      const resolvedLayout = resolveLayoutForPage(pageIndex);
      const { page, paper, writing } = resolvedLayout;
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
          role="button"
          className="relative shadow-2xl block text-left bg-transparent border-0 p-0 cursor-default"
          style={{
            width: page.width * scale,
            height: page.height * scale,
          }}
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
              handlePageClick(e as unknown as React.MouseEvent<HTMLElement>);
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

          {isVisiblePreview && ps.textFields?.map((field) => {
            const handleUpdate = (updates: Parameters<React.ComponentProps<typeof TextField>['onUpdate']>[0]) => {
              const nextFields = ps.textFields?.map((f) =>
                f.id === field.id ? { ...f, ...updates } : f
              );
              onPageSettingsChange?.({ ...ps, textFields: nextFields });
            };

            const handleDelete = () => {
              const nextFields = ps.textFields?.filter((f) => f.id !== field.id);
              onPageSettingsChange?.({ ...ps, textFields: nextFields });
            };

            const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

            return (
              <div
                key={field.id}
                role="button"
                tabIndex={0}
                aria-label="Text field wrapper"
                onMouseDown={stopPropagation}
                onPointerDown={stopPropagation}
                onClick={stopPropagation}
                onKeyDown={stopPropagation}
              >
                <TextField
                  field={field}
                  scale={scale}
                  fontFamily={resolvedFontFamily}
                  randomness={settings.randomness}
                  onTypingFocus={onTypingFocus}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            );
          })}

          {isVisiblePreview && paper.guides.kind === 'ruled' && onSettingsChange && (
            <button
              type="button"
              className="absolute border-0 bg-transparent p-0"
              style={{
                left: (paper.guides.marginLineX - 6) * scale,
                top: writing.contentBounds.top * scale,
                width: 14 * scale,
                height: writing.contentBounds.height * scale,
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
              aria-valuemax={page.width - (ps.marginLeft + ps.marginRight)}
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
      resolveLayoutForPage,
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
        className="fixed left-0 top-0 h-px w-px resize-none overflow-hidden border-0 bg-transparent p-0 opacity-0 outline-none"
        aria-label="Handwriting text input"
        inputMode="text"
        spellCheck={false}
      />

      {visiblePage}
    </div>
  );
}
