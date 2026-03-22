'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import {
  HandwritingSettings,
  HANDWRITING_FONTS,
  TextField,
  EditorMode,
  PageSettings,
  LineData,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { Palette } from 'lucide-react';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import type { PaginationResponse } from '@/lib/pagination';

import { 
  calculateRandomStyle, 
  calculatePageStartOffsets, 
  calculateLineStarts,
  paginateTextFieldSegments,
  type PaginatedTextFieldSegment,
} from '@/lib/editorHelpers';
import CanvasPreview from './CanvasPreview';
interface HandwritingEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  settings: HandwritingSettings;
  onSettingsChange?: (settings: HandwritingSettings) => void;
  pageSettingsByPage: PageSettings[];
  exportingPageIndex?: number | null;
  previewScale: number;
  onPreviewScaleChange: (value: number) => void;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  textFields: TextField[];
  onTextFieldsChange: (textFields: TextField[]) => void;
  currentPageIndex: number;
  onCurrentPageChange: (pageIndex: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
  onPagesChange?: (pages: LineData[][]) => void;
  onPaginationCompleteChange?: (isComplete: boolean) => void;
  onApplyToAllPages?: () => void;
}

type RenderCharacterFn = (
  char: string,
  charIndex: number,
  lineIndex: number,
  globalCharIndex: number,
  showCursor: boolean,
  showCursorBefore: boolean,
  isSelected: boolean,
  inkColor: string
) => React.ReactNode;

type LineViewProps = {
  line: LineData;
  lineStartChar: number;
  cursorPosition: number | null;
  selectionStart: number;
  selectionEnd: number;
  pageLineHeightPx: number;
  renderCharacter: RenderCharacterFn;
  inkColor: string;
};

const LineView = React.memo(function LineView({
  line,
  lineStartChar,
  cursorPosition,
  selectionStart,
  selectionEnd,
  pageLineHeightPx,
  renderCharacter,
  inkColor,
}: LineViewProps) {
  const lineText = line.text;

  if (lineText === '') {
    return (
      <div style={{ minHeight: pageLineHeightPx, whiteSpace: 'nowrap' }}>
        {cursorPosition === lineStartChar ? (
          <span
            className="inline-block animate-pulse"
            style={{
              width: 2,
              height: '1em',
              backgroundColor: inkColor,
              verticalAlign: 'text-bottom',
            }}
          />
        ) : null}
      </div>
    );
  }

  const chars: React.ReactNode[] = [];
  let globalCharCount = lineStartChar;
  for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
    const currentGlobalChar = globalCharCount;
    globalCharCount += 1;
    const showCursorAfter = cursorPosition === currentGlobalChar + 1;
    const showCursorBefore = charIdx === 0 && cursorPosition === currentGlobalChar;
    const isSelected =
      currentGlobalChar >= selectionStart && currentGlobalChar < selectionEnd;
    chars.push(
      renderCharacter(
        lineText[charIdx],
        charIdx,
        line.lineIndex,
        currentGlobalChar,
        showCursorAfter,
        showCursorBefore,
        isSelected,
        inkColor
      )
    );
  }

  return (
    <div style={{ minHeight: pageLineHeightPx, whiteSpace: 'nowrap' }}>{chars}</div>
  );
});

const FONT_VARIABLES: Record<string, string> = {
  'caveat': '--font-caveat',
  'dancing-script': '--font-dancing-script',
  'indie-flower': '--font-indie-flower',
  'shadows-into-light': '--font-shadows-into-light',
  'kalam': '--font-kalam',
  'patrick-hand': '--font-patrick-hand',
  'architects-daughter': '--font-architects-daughter',
  'satisfy': '--font-satisfy',
  'homemade-apple': '--font-homemade-apple',
};

function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delayMs: number) {
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
    (...args: Parameters<T>) => {
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

type RenderedTextFieldSegment = PaginatedTextFieldSegment & {
  id: string;
  inkColor: string;
  isAnchor: boolean;
};

export default function HandwritingEditor({
  text,
  onTextChange,
  settings,
  onSettingsChange,
  pageSettingsByPage,
  exportingPageIndex = null,
  previewScale,
  onPreviewScaleChange,
  editorMode,
  onEditorModeChange,
  textFields,
  onTextFieldsChange,
  currentPageIndex,
  onCurrentPageChange,
  onTotalPagesChange,
  onPagesChange,
  onPaginationCompleteChange,
  onApplyToAllPages,
}: HandwritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const [activeTextFieldId, setActiveTextFieldId] = useState<string | null>(null);
  const [focusedTextFieldId, setFocusedTextFieldId] = useState<string | null>(null);
  const [textFieldSelectionRange, setTextFieldSelectionRange] = useState({ start: 0, end: 0 });
  const [fontMetricsVersion, setFontMetricsVersion] = useState(0);
  const [localText, setLocalText] = useState(text);
  const [pages, setPages] = useState<LineData[][]>([[]]);
  const [isPaginationComplete, setIsPaginationComplete] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const latestPaginationRequestIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const textFieldInputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const textFieldColorInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0, pageRect: null as DOMRect | null });
  const [isDraggingMarginLine, setIsDraggingMarginLine] = useState(false);
  const marginLineDragRef = useRef({ pageIndex: 0, pageRect: null as DOMRect | null });
  const selectionDragRef = useRef<{ active: boolean; anchor: number; target: 'write' | 'textfield'; textFieldId: string | null }>({
    active: false,
    anchor: 0,
    target: 'write',
    textFieldId: null,
  });

  const fontClass = useMemo(() => {
    if (settings.fontFamily === 'custom' && !settings.customFont) {
      return HANDWRITING_FONTS[0].className;
    }
    const font = HANDWRITING_FONTS.find((f) => f.value === settings.fontFamily);
    return font?.className || HANDWRITING_FONTS[0].className;
  }, [settings.fontFamily, settings.customFont]);

  const customFontFamily =
    settings.fontFamily === 'custom' && settings.customFont
      ? settings.customFont.family
      : null;

  useEffect(() => {
    setLocalText(text);
  }, [text]);

  const debouncedPropagateText = useDebouncedCallback(
    (nextText: string) => {
      onTextChange(nextText);
    },
    150
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fonts = document.fonts;
    if (!fonts) return;

    let cancelled = false;
    const bump = () => {
      if (cancelled) return;
      setFontMetricsVersion((v) => v + 1);
    };

    fonts.ready.then(bump).catch(() => { });
    fonts.addEventListener('loadingdone', bump);
    fonts.addEventListener('loadingerror', bump);
    return () => {
      cancelled = true;
      fonts.removeEventListener('loadingdone', bump);
      fonts.removeEventListener('loadingerror', bump);
    };
  }, [fontClass, customFontFamily, settings.fontSize]);



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
      .catch(() => { });

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
    if (customFontFamily) return `"${customFontFamily}", cursive`;
    const varName = FONT_VARIABLES[settings.fontFamily];
    if (!varName) return 'cursive';
    if (typeof document === 'undefined' || typeof window === 'undefined') return 'cursive';
    const scope = document.body ?? document.documentElement;
    const value = window.getComputedStyle(scope).getPropertyValue(varName).trim();
    return value || 'cursive';
  }, [customFontFamily, fontMetricsVersion, settings.fontFamily]);

  const desiredPageSettings = useMemo(() => {
    const desiredLength = Math.max(pageSettingsByPage.length, currentPageIndex + 2);
    const out: Array<{
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      marginLeft: number;
      fontSize: number;
      customLineSpacing?: number;
    }> = [];

    for (let i = 0; i < desiredLength; i++) {
      const ps = getPageSettings(i);
      out.push({
        marginTop: ps.marginTop,
        marginRight: ps.marginRight,
        marginBottom: ps.marginBottom,
        marginLeft: ps.marginLeft,
        fontSize: ps.fontSize,
        customLineSpacing: ps.customLineSpacing ?? undefined,
      });
    }

    return out;
  }, [currentPageIndex, getPageSettings, pageSettingsByPage.length]);

  const desiredPageHasBackground = useMemo(() => {
    const desiredLength = Math.max(pageSettingsByPage.length, currentPageIndex + 2);
    const out: boolean[] = [];
    for (let i = 0; i < desiredLength; i++) {
      out.push(!!getBackgroundForPage(i));
    }
    return out;
  }, [currentPageIndex, getBackgroundForPage, pageSettingsByPage.length]);

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
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
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

    worker.addEventListener('message', onMessage as any);
    return () => {
      worker.removeEventListener('message', onMessage as any);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

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
  ]);

  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [onTotalPagesChange, totalPages]);

  const applyRandomness = useCallback(
    (charIndex: number, lineIndex: number) => {
      return calculateRandomStyle(charIndex, lineIndex, settings.randomness);
    },
    [settings.randomness]
  );

  const renderPaperLines = useCallback(
    (pageIndex: number) => {
      const pageHasBackground = !!getBackgroundForPage(pageIndex);
      if (settings.paperStyle === 'blank' || pageHasBackground) return null;

      const ps = getPageSettings(pageIndex);
      const contentWidth = PAGE_WIDTH - ps.marginLeft - ps.marginRight;
      const contentHeight = PAGE_HEIGHT - ps.marginTop - ps.marginBottom;
      const baseLineHeightPx = ps.fontSize * settings.lineHeight;
      const lineHeightPx = ps.customLineSpacing ? ps.customLineSpacing : baseLineHeightPx;
      const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeightPx));

      const lines = [];
      const startY = ps.marginTop;

      if (settings.paperStyle === 'lined' || settings.paperStyle === 'ruled') {
        for (let i = 0; i <= linesPerPage; i++) {
          const y = startY + i * lineHeightPx;
          if (y < PAGE_HEIGHT - ps.marginBottom + lineHeightPx) {
            lines.push(
              <div
                key={`line-${pageIndex}-${i}`}
                className="absolute pointer-events-none"
                style={{
                  top: y,
                  left: ps.marginLeft,
                  height: 1,
                  width: contentWidth,
                  backgroundColor: settings.lineColor,
                }}
              />
            );
          }
        }

        if (settings.paperStyle === 'ruled') {
          lines.push(
            <div key={`margin-line-wrap-${pageIndex}`} className="absolute" style={{ left: 0, top: 0 }}>
              <div
                key={`margin-line-${pageIndex}`}
                className="absolute pointer-events-none"
                style={{
                  left: ps.marginLeft + settings.ruledMarginLineOffset,
                  top: ps.marginTop,
                  width: 2,
                  height: contentHeight,
                  backgroundColor: '#ffb3b3',
                }}
              />
              {onSettingsChange && (
                <button
                  key={`margin-line-handle-${pageIndex}`}
                  type="button"
                  className="absolute border-0 bg-transparent p-0"
                  style={{
                    left: ps.marginLeft + settings.ruledMarginLineOffset - 6,
                    top: ps.marginTop,
                    width: 14,
                    height: contentHeight,
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingMarginLine(true);
                    const pageEl = pageElsRef.current[pageIndex];
                    marginLineDragRef.current = {
                      pageIndex,
                      pageRect: pageEl ? pageEl.getBoundingClientRect() : null,
                    };
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
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
                  aria-valuemax={PAGE_WIDTH - (ps.marginLeft + ps.marginRight)}
                  aria-valuenow={settings.ruledMarginLineOffset}
                  aria-orientation="vertical"
                  tabIndex={0}
                />
              )}
            </div>
          );
        }
      } else if (settings.paperStyle === 'grid') {
        const gridSize = lineHeightPx;
        for (let i = 0; i <= linesPerPage; i++) {
          const y = startY + i * gridSize;
          if (y < PAGE_HEIGHT - ps.marginBottom + gridSize) {
            lines.push(
              <div
                key={`h-line-${pageIndex}-${i}`}
                className="absolute pointer-events-none"
                style={{
                  top: y,
                  left: ps.marginLeft,
                  height: 1,
                  width: contentWidth,
                  backgroundColor: settings.lineColor,
                  opacity: 0.5,
                }}
              />
            );
          }
        }
        const cols = Math.floor(contentWidth / gridSize);
        for (let j = 0; j <= cols; j++) {
          const x = ps.marginLeft + j * gridSize;
          lines.push(
            <div
              key={`v-line-${pageIndex}-${j}`}
              className="absolute pointer-events-none"
              style={{
                left: x,
                top: ps.marginTop,
                width: 1,
                height: contentHeight,
                backgroundColor: settings.lineColor,
                opacity: 0.5,
              }}
            />
          );
        }
      }

      return lines;
    },
    [getBackgroundForPage, getPageSettings, onSettingsChange, settings.lineColor, settings.lineHeight, settings.paperStyle, settings.ruledMarginLineOffset]
  );

  useEffect(() => {
    if (!isDraggingMarginLine) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!onSettingsChange) return;
      const { pageIndex, pageRect } = marginLineDragRef.current;
      if (!pageRect) return;

      const ps = getPageSettings(pageIndex);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = (clientX - pageRect.left) / previewScale;
      const minLeft = 0;
      const maxLeft = PAGE_WIDTH;
      const clampedLeft = clamp(x, minLeft, maxLeft);
      const newOffset = clampedLeft - ps.marginLeft;

      const minOffset = -ps.marginLeft;
      const maxOffset = PAGE_WIDTH - ps.marginLeft;
      const clampedOffset = clamp(newOffset, minOffset, maxOffset);

      if (clampedOffset === settings.ruledMarginLineOffset) return;
      onSettingsChange({ ...settings, ruledMarginLineOffset: clampedOffset });
    };

    const handleUp = () => {
      setIsDraggingMarginLine(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, [getPageSettings, isDraggingMarginLine, onSettingsChange, previewScale, settings]);

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

  const syncSelectionFromTextarea = useCallback((el: HTMLTextAreaElement) => {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    setActiveTextFieldId(null);
    setFocusedTextFieldId(null);
    setCursorPosition(end);
    setSelectionRange({ start, end });
  }, []);

  const syncSelectionFromTextFieldTextarea = useCallback(
    (id: string, el: HTMLTextAreaElement) => {
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? start;
      setActiveTextFieldId(id);
      setFocusedTextFieldId(id);
      setTextFieldSelectionRange({ start, end });
    },
    []
  );

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

  const handleCharMouseDown = useCallback(
    (e: React.MouseEvent, globalCharIndex: number, isLeftHalf: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      const newPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      selectionDragRef.current = {
        active: true,
        anchor: newPosition,
        target: 'write',
        textFieldId: null,
      };
      updateVisibleSelection(newPosition, newPosition);
    },
    [updateVisibleSelection]
  );

  const handleCharMouseMove = useCallback(
    (e: React.MouseEvent, globalCharIndex: number, isLeftHalf: boolean) => {
      if (!selectionDragRef.current.active) return;
      if (selectionDragRef.current.target !== 'write') return;
      e.preventDefault();
      e.stopPropagation();
      const nextPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      updateVisibleSelection(selectionDragRef.current.anchor, nextPosition);
    },
    [updateVisibleSelection]
  );

  const updateTextFieldVisibleSelection = useCallback((id: string, anchor: number, focus: number) => {
    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    setActiveTextFieldId(id);
    setFocusedTextFieldId(id);
    setTextFieldSelectionRange({ start, end });
    const textarea = textFieldInputRefs.current.get(id);
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(anchor, focus);
    }
  }, []);

  const handleTextFieldCharMouseDown = useCallback(
    (e: React.MouseEvent, id: string, globalCharIndex: number, isLeftHalf: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      const newPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      selectionDragRef.current = {
        active: true,
        anchor: newPosition,
        target: 'textfield',
        textFieldId: id,
      };
      updateTextFieldVisibleSelection(id, newPosition, newPosition);
    },
    [updateTextFieldVisibleSelection]
  );

  const handleTextFieldCharMouseMove = useCallback(
    (e: React.MouseEvent, id: string, globalCharIndex: number, isLeftHalf: boolean) => {
      if (!selectionDragRef.current.active) return;
      if (selectionDragRef.current.target !== 'textfield') return;
      if (selectionDragRef.current.textFieldId !== id) return;
      e.preventDefault();
      e.stopPropagation();
      const nextPosition = isLeftHalf ? globalCharIndex : globalCharIndex + 1;
      updateTextFieldVisibleSelection(id, selectionDragRef.current.anchor, nextPosition);
    },
    [updateTextFieldVisibleSelection]
  );

  const handleSelectionEnd = useCallback(() => {
    selectionDragRef.current.active = false;
    selectionDragRef.current.textFieldId = null;
  }, []);

  const renderCharacter = useCallback(
    (
      char: string,
      charIndex: number,
      lineIndex: number,
      globalCharIndex: number,
      showCursor: boolean,
      showCursorBefore: boolean,
      isSelected: boolean,
      inkColor: string
    ) => {
      const selectionStyle = isSelected
        ? ({
            backgroundColor: `${inkColor}33`,
            borderRadius: 2,
          } as const)
        : undefined;

      if (char === ' ') {
        return (
          <span
            key={globalCharIndex}
            className="relative cursor-text"
            style={selectionStyle}
            role="button"
            tabIndex={0}
            onMouseDown={(e) => {
              const isLeftHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
              handleCharMouseDown(e, globalCharIndex, isLeftHalf);
            }}
            onMouseMove={(e) => {
              const isLeftHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
              handleCharMouseMove(e, globalCharIndex, isLeftHalf);
            }}
            onClick={(e) => {
              const isLeftHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
              handleCharClick(e, globalCharIndex, isLeftHalf);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCharKeyDown(e, globalCharIndex, true);
              }
            }}
            aria-label={`Character position ${globalCharIndex}`}
          >
            {showCursorBefore && isFocused && (
              <span
                className="absolute animate-pulse"
                style={{
                  left: 0,
                  top: 0,
                  width: 2,
                  height: '1em',
                  backgroundColor: inkColor,
                }}
              />
            )}
            <span style={{ whiteSpace: 'pre' }}>{' '}</span>
            {showCursor && isFocused && (
              <span
                className="absolute animate-pulse"
                style={{
                  right: 0,
                  top: 0,
                  width: 2,
                  height: '1em',
                  backgroundColor: inkColor,
                }}
              />
            )}
          </span>
        );
      }

      const randomData = applyRandomness(charIndex, lineIndex);

      return (
        <span
          key={globalCharIndex}
          className="inline-block relative cursor-text"
          style={{ ...randomData.style, ...selectionStyle }}
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            const isLeftHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
            handleCharMouseDown(e, globalCharIndex, isLeftHalf);
          }}
          onMouseMove={(e) => {
            const isLeftHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
            handleCharMouseMove(e, globalCharIndex, isLeftHalf);
          }}
          onClick={(e) => {
            const isLeftHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
            handleCharClick(e, globalCharIndex, isLeftHalf);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCharKeyDown(e, globalCharIndex, true);
            }
          }}
          aria-label={`Character ${char} at position ${globalCharIndex}`}
        >
          {showCursorBefore && isFocused && (
            <span
              className="absolute animate-pulse"
              style={{
                left: -1,
                top: 0,
                width: 2,
                height: '1em',
                backgroundColor: inkColor,
              }}
            />
          )}
          {char}
          {showCursor && isFocused && (
            <span
              className="absolute animate-pulse"
              style={{
                right: -1,
                top: 0,
                width: 2,
                height: '1em',
                backgroundColor: inkColor,
              }}
            />
          )}
        </span>
      );
    },
    [applyRandomness, isFocused, handleCharClick, handleCharKeyDown, handleCharMouseDown, handleCharMouseMove]
  );

  const renderTextFieldCharacter = useCallback(
    (
      textFieldId: string,
      isTextFieldFocused: boolean,
      inkColor: string
    ): RenderCharacterFn =>
      (
        char: string,
        charIndex: number,
        lineIndex: number,
        globalCharIndex: number,
        showCursor: boolean,
        showCursorBefore: boolean,
        isSelected: boolean
      ) => {
        const selectionStyle = isSelected
          ? ({
              backgroundColor: `${inkColor}33`,
              borderRadius: 2,
            } as const)
          : undefined;

        const handlePosition = (e: React.MouseEvent<HTMLElement>) => {
          const isLeftHalf = e.nativeEvent.offsetX < e.currentTarget.offsetWidth / 2;
          return isLeftHalf;
        };

        if (char === ' ') {
          return (
            <span
              key={`${textFieldId}-${globalCharIndex}`}
              className="relative cursor-text"
              style={selectionStyle}
              role="button"
              tabIndex={0}
              onMouseDown={(e) => {
                handleTextFieldCharMouseDown(e, textFieldId, globalCharIndex, handlePosition(e));
              }}
              onMouseMove={(e) => {
                handleTextFieldCharMouseMove(e, textFieldId, globalCharIndex, handlePosition(e));
              }}
              onClick={(e) => {
                handleTextFieldCharMouseDown(e, textFieldId, globalCharIndex, handlePosition(e));
                handleSelectionEnd();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateTextFieldVisibleSelection(textFieldId, globalCharIndex, globalCharIndex);
                }
              }}
              aria-label={`Text field character position ${globalCharIndex}`}
            >
              {showCursorBefore && isTextFieldFocused && (
                <span
                  className="absolute animate-pulse"
                  style={{
                    left: 0,
                    top: 0,
                    width: 2,
                    height: '1em',
                    backgroundColor: inkColor,
                  }}
                />
              )}
              <span style={{ whiteSpace: 'pre' }}>{' '}</span>
              {showCursor && isTextFieldFocused && (
                <span
                  className="absolute animate-pulse"
                  style={{
                    right: 0,
                    top: 0,
                    width: 2,
                    height: '1em',
                    backgroundColor: inkColor,
                  }}
                />
              )}
            </span>
          );
        }

        const randomData = applyRandomness(charIndex, lineIndex);
        return (
          <span
            key={`${textFieldId}-${globalCharIndex}`}
            className="inline-block relative cursor-text"
            style={{ ...randomData.style, ...selectionStyle }}
            role="button"
            tabIndex={0}
            onMouseDown={(e) => {
              handleTextFieldCharMouseDown(e, textFieldId, globalCharIndex, handlePosition(e));
            }}
            onMouseMove={(e) => {
              handleTextFieldCharMouseMove(e, textFieldId, globalCharIndex, handlePosition(e));
            }}
            onClick={(e) => {
              handleTextFieldCharMouseDown(e, textFieldId, globalCharIndex, handlePosition(e));
              handleSelectionEnd();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                updateTextFieldVisibleSelection(textFieldId, globalCharIndex, globalCharIndex + 1);
              }
            }}
            aria-label={`Text field character ${char} at position ${globalCharIndex}`}
          >
            {showCursorBefore && isTextFieldFocused && (
              <span
                className="absolute animate-pulse"
                style={{
                  left: -1,
                  top: 0,
                  width: 2,
                  height: '1em',
                  backgroundColor: inkColor,
                }}
              />
            )}
            {char}
            {showCursor && isTextFieldFocused && (
              <span
                className="absolute animate-pulse"
                style={{
                  right: -1,
                  top: 0,
                  width: 2,
                  height: '1em',
                  backgroundColor: inkColor,
                }}
              />
            )}
          </span>
        );
      },
    [
      applyRandomness,
      handleSelectionEnd,
      handleTextFieldCharMouseDown,
      handleTextFieldCharMouseMove,
      updateTextFieldVisibleSelection,
    ]
  );

  useEffect(() => {
    window.addEventListener('mouseup', handleSelectionEnd);
    return () => {
      window.removeEventListener('mouseup', handleSelectionEnd);
    };
  }, [handleSelectionEnd]);

  useEffect(() => {
    if (currentPageIndex > pages.length - 1) {
      onCurrentPageChange(Math.max(0, pages.length - 1));
    }
  }, [currentPageIndex, onCurrentPageChange, pages.length]);

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

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    syncSelectionFromTextarea(e.target as HTMLTextAreaElement);
  }, [syncSelectionFromTextarea]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    syncSelectionFromTextarea(e.target as HTMLTextAreaElement);
  }, [syncSelectionFromTextarea]);

  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    syncSelectionFromTextarea(e.currentTarget);
  }, [syncSelectionFromTextarea]);

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
      if (editorMode === 'textfield') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / previewScale;
        const y = (e.clientY - rect.top) / previewScale;

        const ps = getPageSettings(pageIndex);

        const newTextField: TextField = {
          id: `tf-${Date.now()}`,
          x,
          y,
          text: '',
          inkColor: ps.inkColor,
          pageIndex,
        };

        onTextFieldsChange([...textFields, newTextField]);

        setTimeout(() => {
          const input = textFieldInputRefs.current.get(newTextField.id);
          input?.focus();
        }, 0);
      } else {
        const textarea = textareaRef.current;
        textarea?.focus();
        if (textarea) {
          syncSelectionFromTextarea(textarea);
        }
      }
    },
    [editorMode, getPageSettings, textFields, onTextFieldsChange, previewScale, syncSelectionFromTextarea]
  );

  const handleTextFieldChange = useCallback(
    (id: string, newText: string) => {
      onTextFieldsChange(
        textFields.map((tf) => (tf.id === id ? { ...tf, text: newText } : tf))
      );
    },
    [textFields, onTextFieldsChange]
  );

  const handleTextFieldDelete = useCallback(
    (id: string) => {
      onTextFieldsChange(textFields.filter((tf) => tf.id !== id));
    },
    [textFields, onTextFieldsChange]
  );

  const handleTextFieldColorChange = useCallback(
    (id: string, inkColor: string) => {
      onTextFieldsChange(textFields.map((tf) => (tf.id === id ? { ...tf, inkColor } : tf)));
    },
    [onTextFieldsChange, textFields]
  );

  const handleTextFieldKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
      if (e.key === 'Backspace') {
        const tf = textFields.find((t) => t.id === id);
        if (tf && tf.text === '') {
          e.preventDefault();
          handleTextFieldDelete(id);
        }
      } else if (e.key === 'Escape') {
        (e.target as HTMLTextAreaElement).blur();
      }
    },
    [textFields, handleTextFieldDelete]
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent, tf: TextField) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingId(tf.id);
      const rect = (e.target as HTMLElement).closest('.text-field-container')?.getBoundingClientRect();
      const pageEl = pageElsRef.current[tf.pageIndex];
      const pageRect = pageEl ? pageEl.getBoundingClientRect() : null;
      if (rect) {
        setDragOffset({
          x: (e.clientX - rect.left) / previewScale,
          y: (e.clientY - rect.top) / previewScale,
          pageRect,
        });
      }
    },
    [previewScale]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggingId) return;

      const tf = textFields.find((t) => t.id === draggingId);
      if (!tf) return;

      const pageRect = dragOffset.pageRect;
      if (!pageRect) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const newX = (clientX - pageRect.left) / previewScale - dragOffset.x + 4;
      const newY = (clientY - pageRect.top) / previewScale - dragOffset.y + 12;

      onTextFieldsChange(
        textFields.map((t) =>
          t.id === draggingId ? { ...t, x: Math.max(0, newX), y: Math.max(0, newY) } : t
        )
      );
    },
    [draggingId, textFields, dragOffset, onTextFieldsChange, previewScale]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchcancel', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
        window.removeEventListener('touchcancel', handleDragEnd);
      };
    }
  }, [draggingId, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (textareaRef.current && editorMode === 'write') {
      textareaRef.current.focus();
    }
  }, [editorMode]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const pageStartOffsets = useMemo(() => calculatePageStartOffsets(pages), [pages]);

  const currentPageLines = useMemo(() => pages[currentPageIndex] ?? [], [currentPageIndex, pages]);

  const currentPageStartOffset = pageStartOffsets[currentPageIndex] ?? 0;

  const currentPageLineStarts = useMemo(
    () => calculateLineStarts(currentPageLines, currentPageStartOffset),
    [currentPageLines, currentPageStartOffset]
  );

  const pagePaperLines = useMemo(
    () => renderPaperLines(currentPageIndex),
    [currentPageIndex, renderPaperLines]
  );

  const paginatedTextFieldSegments = useMemo(() => {
    return textFields.flatMap((tf) => {
      const segments = paginateTextFieldSegments({
        text: tf.text,
        startPageIndex: tf.pageIndex,
        x: tf.x,
        y: tf.y,
        pageWidth: PAGE_WIDTH,
        pageHeight: PAGE_HEIGHT,
        lineHeight: settings.lineHeight,
        fontFamily: resolvedFontFamily,
        pages: desiredPageSettings.map((page, idx) => ({
          ...page,
          customLineOffset: getPageSettings(idx).customLineOffset,
        })),
        pageHasBackground: desiredPageHasBackground,
      });

      return segments.map((segment, index) => ({
        ...segment,
        id: tf.id,
        inkColor: tf.inkColor ?? getPageSettings(segment.pageIndex).inkColor,
        isAnchor: index === 0,
      }));
    });
  }, [
    desiredPageHasBackground,
    desiredPageSettings,
    getPageSettings,
    resolvedFontFamily,
    settings.lineHeight,
    textFields,
  ]);

  const currentPageTextFieldSegments = useMemo(
    () => paginatedTextFieldSegments.filter((segment) => segment.pageIndex === currentPageIndex),
    [currentPageIndex, paginatedTextFieldSegments]
  );

  const getPageLineStarts = useCallback(
    (pageIndex: number) => {
      const pageLines = pages[pageIndex] ?? [];
      const pageStartOffset = pageStartOffsets[pageIndex] ?? 0;
      return calculateLineStarts(pageLines, pageStartOffset);
    },
    [pageStartOffsets, pages]
  );

  const handleCanvasCharClick = useCallback(
    (globalCharIndex: number, _isLeftHalf: boolean) => {
      setCursorPosition(globalCharIndex);
      setSelectionRange({ start: globalCharIndex, end: globalCharIndex });
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(globalCharIndex, globalCharIndex);
      }
    },
    []
  );

  const handleCanvasCharMouseDown = useCallback(
    (globalCharIndex: number, _isLeftHalf: boolean) => {
      selectionDragRef.current = {
        active: true,
        anchor: globalCharIndex,
        target: 'write',
        textFieldId: null,
      };
      updateVisibleSelection(globalCharIndex, globalCharIndex);
    },
    [updateVisibleSelection]
  );

  const handleCanvasCharMouseMove = useCallback(
    (globalCharIndex: number, _isLeftHalf: boolean) => {
      if (!selectionDragRef.current.active) return;
      if (selectionDragRef.current.target !== 'write') return;
      updateVisibleSelection(selectionDragRef.current.anchor, globalCharIndex);
    },
    [updateVisibleSelection]
  );

  const renderPage = useCallback(
    (pageIndex: number, scale: number, isVisiblePreview: boolean) => {
      const pageLines = pages[pageIndex] ?? [];
      const pageTextFieldsForPage =
        pageIndex === currentPageIndex
          ? currentPageTextFieldSegments
          : paginatedTextFieldSegments.filter((segment) => segment.pageIndex === pageIndex);

      const ps = getPageSettings(pageIndex);
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
            width: PAGE_WIDTH * scale,
            height: PAGE_HEIGHT * scale,
          }}
          role="button"
          tabIndex={isVisiblePreview ? 0 : -1}
          aria-label={`Page ${pageIndex + 1}`}
          onClick={(e) => {
            if (!isVisiblePreview) return;
            handlePageClick(e, pageIndex);
          }}
          onKeyDown={(e) => {
            if (!isVisiblePreview) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const syntheticEvent = {
                currentTarget: e.currentTarget,
                clientX: 0,
                clientY: 0,
              } as React.MouseEvent<HTMLDivElement>;
              handlePageClick(syntheticEvent, pageIndex);
            }
          }}
        >
          {/* Canvas-based preview (replaces DOM text + paper lines) */}
          <CanvasPreview
            lines={pageLines}
            pageSettings={ps}
            settings={settings}
            textFields={textFields}
            pageIndex={pageIndex}
            previewScale={scale}
            fontFamily={resolvedFontFamily}
            cursorPosition={effectiveCursorPositionForPage}
            selectionStart={selectionRange.start}
            selectionEnd={selectionRange.end}
            pageStartOffset={currentStartOffset}
            isFocused={isFocused}
            onCharClick={isVisiblePreview ? handleCanvasCharClick : undefined}
            onCharMouseDown={isVisiblePreview ? handleCanvasCharMouseDown : undefined}
            onCharMouseMove={isVisiblePreview ? handleCanvasCharMouseMove : undefined}
            onMouseUp={isVisiblePreview ? handleSelectionEnd : undefined}
          />

          {/* Placeholder text overlay when empty */}
          {isVisiblePreview && (pageLines.length === 0 || (pageLines.length === 1 && pageLines[0].text === '')) && (
            <div
              className="absolute pointer-events-none select-none"
              style={{
                top: ps.marginTop,
                left: ps.marginLeft,
                color: '#9ca3af',
                fontSize: ps.fontSize,
                fontFamily: customFontFamily ? `"${customFontFamily}", cursive` : undefined,
              }}
            >
              Click here to start typing...
            </div>
          )}

          {/* Ruled margin line drag handle (DOM overlay) */}
          {isVisiblePreview && settings.paperStyle === 'ruled' && !getBackgroundForPage(pageIndex) && onSettingsChange && (
            <button
              type="button"
              className="absolute border-0 bg-transparent p-0"
              style={{
                left: (ps.marginLeft + settings.ruledMarginLineOffset - 6) * scale,
                top: ps.marginTop * scale,
                width: 14 * scale,
                height: (PAGE_HEIGHT - ps.marginTop - ps.marginBottom) * scale,
                cursor: 'col-resize',
                backgroundColor: 'transparent',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingMarginLine(true);
                const pageEl = pageElsRef.current[pageIndex];
                marginLineDragRef.current = {
                  pageIndex,
                  pageRect: pageEl ? pageEl.getBoundingClientRect() : null,
                };
              }}
              title="Drag to reposition margin line"
              aria-label="Drag to reposition margin line"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={PAGE_WIDTH - (ps.marginLeft + ps.marginRight)}
              aria-valuenow={settings.ruledMarginLineOffset}
              aria-orientation="vertical"
              tabIndex={0}
            />
          )}
          {/* Text field DOM overlays (positioned absolutely over the canvas) */}
          {pageTextFieldsForPage.map((segment) => {
              const sourceTextField = textFields.find((tf) => tf.id === segment.id);
              if (!sourceTextField) return null;

              const isTextFieldFocused = focusedTextFieldId === segment.id;
              const visibleHeight = Math.max(
                segment.lineHeightPx,
                segment.lines.length * segment.lineHeightPx
              );
              const controlsTop = -28;

              return (
                <div
                  key={`${segment.id}-${segment.pageIndex}-${segment.startOffset}`}
                  className="absolute text-field-container group border border-dashed border-black/20 hover:border-blue-500/50 focus-within:border-blue-600/70 rounded-sm transition-colors p-1"
                  style={{
                    left: segment.x * scale,
                    top: segment.y * scale,
                    transform: `scale(${scale}) translate(-8px, -16px)`,
                    transformOrigin: 'top left',
                    width: segment.width,
                    minHeight: visibleHeight,
                  }}
                  role="group"
                  aria-label={`Text field ${segment.id}`}
                  tabIndex={0}
                  onClick={(e) => {
                    if (!isVisiblePreview) return;
                    e.stopPropagation();
                    const input = textFieldInputRefs.current.get(segment.id);
                    input?.focus();
                    if (input) {
                      syncSelectionFromTextFieldTextarea(segment.id, input);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!isVisiblePreview) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                    }
                  }}
                >
                  {segment.isAnchor ? (
                    <>
                      <button
                        className="absolute left-0 w-5 h-5 bg-gray-400 hover:bg-gray-600 rounded cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-0"
                        style={{ top: controlsTop }}
                        onMouseDown={(e) => {
                          if (!isVisiblePreview) return;
                          handleDragStart(e, sourceTextField);
                        }}
                        title="Drag to move"
                        aria-label="Drag to move text field"
                        tabIndex={isVisiblePreview ? 0 : -1}
                      >
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                        </svg>
                      </button>
                      <button
                        className="absolute w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center cursor-pointer text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity border-0"
                        style={{ top: controlsTop, left: 48 }}
                        onMouseDown={(e) => {
                          if (!isVisiblePreview) return;
                          e.preventDefault();
                          e.stopPropagation();
                          handleTextFieldDelete(segment.id);
                        }}
                        title="Delete text field"
                        aria-label="Delete text field"
                        tabIndex={isVisiblePreview ? 0 : -1}
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        className="absolute w-5 h-5 bg-white hover:bg-gray-50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-gray-300 p-0"
                        style={{ top: controlsTop, left: 24 }}
                        onMouseDown={(e) => {
                          if (!isVisiblePreview) return;
                          e.preventDefault();
                          e.stopPropagation();
                          textFieldColorInputRefs.current.get(segment.id)?.click();
                        }}
                        aria-label="Change text field color"
                        title="Change color"
                        tabIndex={isVisiblePreview ? 0 : -1}
                      >
                        <Palette className="w-3 h-3 text-gray-700" />
                      </button>
                      <input
                        ref={(el) => {
                          if (!isVisiblePreview) return;
                          if (el) {
                            textFieldColorInputRefs.current.set(segment.id, el);
                          } else {
                            textFieldColorInputRefs.current.delete(segment.id);
                          }
                        }}
                        type="color"
                        value={segment.inkColor}
                        className="sr-only"
                        onChange={(e) => {
                          if (!isVisiblePreview) return;
                          handleTextFieldColorChange(segment.id, e.target.value);
                        }}
                        aria-label="Text field color"
                        tabIndex={-1}
                      />
                    </>
                  ) : null}

                  <textarea
                    ref={(el) => {
                      if (!isVisiblePreview) return;
                      if (el) {
                        textFieldInputRefs.current.set(segment.id, el);
                      } else {
                        textFieldInputRefs.current.delete(segment.id);
                      }
                    }}
                    value={sourceTextField.text}
                    onChange={(e) => {
                      if (!isVisiblePreview) return;
                      handleTextFieldChange(segment.id, e.target.value);
                      syncSelectionFromTextFieldTextarea(segment.id, e.target);
                    }}
                    onKeyDown={(e) => {
                      if (!isVisiblePreview) return;
                      handleTextFieldKeyDown(e, segment.id);
                    }}
                    onKeyUp={(e) => {
                      if (!isVisiblePreview) return;
                      syncSelectionFromTextFieldTextarea(segment.id, e.currentTarget);
                    }}
                    onClick={(e) => {
                      if (!isVisiblePreview) return;
                      e.stopPropagation();
                      syncSelectionFromTextFieldTextarea(segment.id, e.currentTarget);
                    }}
                    onSelect={(e) => {
                      if (!isVisiblePreview) return;
                      syncSelectionFromTextFieldTextarea(segment.id, e.currentTarget);
                    }}
                    onFocus={(e) => {
                      if (!isVisiblePreview) return;
                      setIsFocused(false);
                      syncSelectionFromTextFieldTextarea(segment.id, e.currentTarget);
                    }}
                    onBlur={() => {
                      setFocusedTextFieldId((prev) => (prev === segment.id ? null : prev));
                    }}
                    className="text-field-input-overlay absolute inset-0 resize-none border-none bg-transparent text-transparent outline-none pointer-events-none selection:bg-transparent selection:text-transparent"
                    style={{
                      width: segment.width,
                      height: visibleHeight,
                      caretColor: 'transparent',
                    }}
                    spellCheck={false}
                    autoComplete="off"
                  />

                  {/* Text field cursor indicator */}
                  {isTextFieldFocused && segment.lines.length === 0 && (
                    <span
                      className="inline-block animate-pulse"
                      style={{
                        width: 2,
                        height: '1em',
                        backgroundColor: segment.inkColor,
                        verticalAlign: 'text-bottom',
                      }}
                    />
                  )}
                </div>
              );
            })}
        </div>
      );
    },
    [
      cursorPosition,
      customFontFamily,
      getBackgroundForPage,
      getPageSettings,
      handleCanvasCharClick,
      handleCanvasCharMouseDown,
      handleCanvasCharMouseMove,
      handleDragStart,
      handleTextFieldChange,
      handleTextFieldColorChange,
      handleTextFieldDelete,
      handleTextFieldKeyDown,
      handlePageClick,
      handleSelectionEnd,
      isFocused,
      pageStartOffsets,
      pages,
      currentPageIndex,
      currentPageTextFieldSegments,
      focusedTextFieldId,
      onSettingsChange,
      paginatedTextFieldSegments,
      resolvedFontFamily,
      selectionRange.end,
      selectionRange.start,
      settings,
      syncSelectionFromTextFieldTextarea,
      textFields,
    ]
  );

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleTextChange}
        onPaste={handlePaste}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onSelect={handleSelect}
        onFocus={(e) => {
          setIsFocused(true);
          syncSelectionFromTextarea(e.currentTarget);
        }}
        onBlur={() => setIsFocused(false)}
        className="sr-only"
        aria-label="Handwriting text input"
        autoFocus
      />

      {/* Only render the current page - no scrolling, use prev/next buttons to navigate in sidebar */}
      {pages.length > 0 && renderPage(currentPageIndex, previewScale, true)}
    </div>
  );
}
