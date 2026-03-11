'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import {
  HandwritingSettings,
  HANDWRITING_FONTS,
  TextField,
  EditorMode,
  PageSettings,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';
import { Type, PenLine, Plus, Minus, ChevronLeft, ChevronRight, GripVertical, Palette } from 'lucide-react';
import type { PaginationResponse } from '@/workers/paginationWorker';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';

import { 
  calculateRandomStyle, 
  calculatePageStartOffsets, 
  calculateLineStarts,
  type LineData 
} from '@/lib/editorHelpers';
interface HandwritingEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  settings: HandwritingSettings;
  onSettingsChange?: (settings: HandwritingSettings) => void;
  pageSettingsByPage: PageSettings[];
  onPageRef?: (pageIndex: number, el: HTMLDivElement | null) => void;
  renderAllPagesForExport?: boolean;
  previewScale: number;
  onPreviewScaleChange: (value: number) => void;
  textFields: TextField[];
  onTextFieldsChange: (textFields: TextField[]) => void;
  currentPageIndex: number;
  onCurrentPageChange: (pageIndex: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
  onApplyToAllPages?: () => void;
}

type RenderCharacterFn = (
  char: string,
  charIndex: number,
  lineIndex: number,
  globalCharIndex: number,
  showCursor: boolean,
  showCursorBefore: boolean,
  inkColor: string
) => React.ReactNode;

type LineViewProps = {
  line: LineData;
  lineStartChar: number;
  cursorPosition: number | null;
  pageLineHeightPx: number;
  renderCharacter: RenderCharacterFn;
  inkColor: string;
};

const LineView = React.memo(function LineView({
  line,
  lineStartChar,
  cursorPosition,
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
    chars.push(
      renderCharacter(
        lineText[charIdx],
        charIdx,
        line.lineIndex,
        currentGlobalChar,
        showCursorAfter,
        showCursorBefore,
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

export default function HandwritingEditor({
  text,
  onTextChange,
  settings,
  onSettingsChange,
  pageSettingsByPage,
  onPageRef,
  renderAllPagesForExport = false,
  previewScale,
  onPreviewScaleChange,
  textFields,
  onTextFieldsChange,
  currentPageIndex,
  onCurrentPageChange,
  onTotalPagesChange,
  onApplyToAllPages,
}: HandwritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>('write');
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
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [isToolbarDragging, setIsToolbarDragging] = useState(false);
  const toolbarDragRef = useRef<{ active: boolean; offsetX: number; offsetY: number }>({
    active: false,
    offsetX: 0,
    offsetY: 0,
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
      renderAllPagesForExport,
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
      setPages(msg.pages as LineData[][]);
      setIsPaginationComplete(msg.isPaginationComplete);
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
    renderAllPagesForExport,
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
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    },
    []
  );

  const renderCharacter = useCallback(
    (
      char: string,
      charIndex: number,
      lineIndex: number,
      globalCharIndex: number,
      showCursor: boolean,
      showCursorBefore: boolean,
      inkColor: string
    ) => {
      if (char === ' ') {
        return (
          <span
            key={globalCharIndex}
            className="relative cursor-text"
            role="button"
            tabIndex={0}
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

      const randomStyle = applyRandomness(charIndex, lineIndex);

      return (
        <span
          key={globalCharIndex}
          className="inline-block relative cursor-text"
          style={randomStyle}
          role="button"
          tabIndex={0}
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
    [applyRandomness, isFocused, handleCharClick, handleCharKeyDown]
  );

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
      setCursorPosition(e.target.selectionStart);
    },
    [debouncedPropagateText]
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
      requestAnimationFrame(() => {
        el.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [cursorPosition, debouncedPropagateText, text]
  );

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
  }, []);

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
        textareaRef.current?.focus();
      }
    },
    [editorMode, getPageSettings, textFields, onTextFieldsChange, previewScale]
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (toolbarPosition) return;
    const el = toolbarRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = Math.max(8, Math.round(window.innerWidth / 2 - rect.width / 2));
    const y = 96;
    setToolbarPosition({ x, y });
  }, [toolbarPosition]);

  useEffect(() => {
    if (!isToolbarDragging) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const onMove = (e: MouseEvent) => {
      const el = toolbarRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      if (!toolbarDragRef.current.active) return;

      const nextX = e.clientX - toolbarDragRef.current.offsetX;
      const nextY = e.clientY - toolbarDragRef.current.offsetY;

      const maxX = Math.max(8, window.innerWidth - rect.width - 8);
      const maxY = Math.max(8, window.innerHeight - rect.height - 8);

      setToolbarPosition({
        x: clamp(nextX, 8, maxX),
        y: clamp(nextY, 8, maxY),
      });
    };

    const onUp = () => {
      toolbarDragRef.current.active = false;
      setIsToolbarDragging(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isToolbarDragging]);

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

  const pageTextFields = useMemo(
    () => textFields.filter((tf) => tf.pageIndex === currentPageIndex),
    [currentPageIndex, textFields]
  );

  const getPageLineStarts = useCallback(
    (pageIndex: number) => {
      const pageLines = pages[pageIndex] ?? [];
      const pageStartOffset = pageStartOffsets[pageIndex] ?? 0;
      return calculateLineStarts(pageLines, pageStartOffset);
    },
    [pageStartOffsets, pages]
  );

  const renderPage = useCallback(
    (pageIndex: number, scale: number, isVisiblePreview: boolean) => {
      const pageLines = pages[pageIndex] ?? [];
      const pageLineStarts = pageIndex === currentPageIndex ? currentPageLineStarts : getPageLineStarts(pageIndex);
      const pageTextFieldsForPage =
        pageIndex === currentPageIndex ? pageTextFields : textFields.filter((tf) => tf.pageIndex === pageIndex);

      const pageBackground = getBackgroundForPage(pageIndex);
      const pageHasBackground = !!pageBackground;
      const ps = getPageSettings(pageIndex);
      const pageLineOffset = pageHasBackground ? ps.customLineOffset : 0;
      const baseLineHeightPx = ps.fontSize * settings.lineHeight;
      const pageLineHeightPx =
        pageHasBackground && ps.customLineSpacing ? ps.customLineSpacing : baseLineHeightPx;
      const contentHeight = PAGE_HEIGHT - ps.marginTop - ps.marginBottom;
      const ruledTextLeft =
        settings.paperStyle === 'ruled' && !pageHasBackground
          ? ps.marginLeft + settings.ruledMarginLineOffset + 10
          : ps.marginLeft;
      const ruledTextWidth = PAGE_WIDTH - ruledTextLeft - ps.marginRight;

      const paperLines =
        pageIndex === currentPageIndex ? pagePaperLines : renderPaperLines(pageIndex);

      const showCursorForPage = isVisiblePreview && pageIndex === currentPageIndex;
      const effectiveCursorPositionForPage = showCursorForPage && isFocused ? cursorPosition : null;

      return (
        <div
          key={pageIndex}
          className="relative"
          style={{
            width: PAGE_WIDTH * scale,
            height: PAGE_HEIGHT * scale,
          }}
        >
          <div
            ref={(el) => {
              if (isVisiblePreview) {
                pageElsRef.current[pageIndex] = el;
              }
              onPageRef?.(pageIndex, el);
            }}
            className="relative shadow-2xl cursor-text"
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              backgroundColor: ps.paperColor,
              backgroundImage: pageBackground ? `url(${pageBackground})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
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
                // Create a synthetic mouse event for keyboard interaction
                const syntheticEvent = {
                  currentTarget: e.currentTarget,
                  clientX: 0,
                  clientY: 0,
                } as React.MouseEvent<HTMLDivElement>;
                handlePageClick(syntheticEvent, pageIndex);
              }
            }}
          >
            {paperLines}

            <div
              className={`absolute select-none ${fontClass}`}
              style={{
                top: ps.marginTop + pageLineOffset,
                left: ruledTextLeft,
                width: ruledTextWidth,
                height: contentHeight,
                fontFamily: customFontFamily ? `"${customFontFamily}", cursive` : undefined,
                fontSize: ps.fontSize,
                lineHeight:
                  pageHasBackground && ps.customLineSpacing ? `${ps.customLineSpacing}px` : settings.lineHeight,
                color: ps.inkColor,
                transform: ps.lineTilt ? `rotate(${ps.lineTilt}deg)` : undefined,
                transformOrigin: 'left top',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {pageLines.length === 0 || (pageLines.length === 1 && pageLines[0].text === '') ? (
                <span className="text-gray-400 pointer-events-none">
                  Click here to start typing...
                  {showCursorForPage && isFocused && cursorPosition === 0 && (
                    <span
                      className="inline-block animate-pulse ml-0"
                      style={{
                        width: 2,
                        height: '1em',
                        backgroundColor: ps.inkColor,
                        verticalAlign: 'text-bottom',
                      }}
                    />
                  )}
                </span>
              ) : (
                pageLines.map((line, lineIdx) => {
                  const lineStartChar = pageLineStarts[lineIdx] ?? 0;
                  const lineEndCaret = lineStartChar + line.text.length;
                  const cursorForLine =
                    effectiveCursorPositionForPage !== null &&
                    effectiveCursorPositionForPage >= lineStartChar &&
                    effectiveCursorPositionForPage <= lineEndCaret
                      ? effectiveCursorPositionForPage
                      : null;

                  return (
                    <LineView
                      key={lineIdx}
                      line={line}
                      lineStartChar={lineStartChar}
                      cursorPosition={cursorForLine}
                      pageLineHeightPx={pageLineHeightPx}
                      renderCharacter={renderCharacter}
                      inkColor={ps.inkColor}
                    />
                  );
                })
              )}
            </div>

            {pageTextFieldsForPage.map((tf) => (
              <div
                key={tf.id}
                className="absolute text-field-container group"
                style={{
                  left: tf.x,
                  top: tf.y,
                  transform: 'translate(-4px, -12px)',
                }}
                role="group"
                aria-label={`Text field ${tf.id}`}
                tabIndex={0}
                onClick={(e) => {
                  if (!isVisiblePreview) return;
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (!isVisiblePreview) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
              >
                <button
                  className="absolute -left-6 top-0 w-5 h-5 bg-gray-400 hover:bg-gray-600 rounded cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-0"
                  onMouseDown={(e) => {
                    if (!isVisiblePreview) return;
                    handleDragStart(e, tf);
                  }}
                  onTouchStart={(e) => {
                    if (!isVisiblePreview) return;
                    e.stopPropagation();
                    // Create a synthetic mouse-like event for handleDragStart
                    const touch = e.touches[0];
                    const syntheticEvent = {
                      preventDefault: () => { },
                      stopPropagation: () => { },
                      clientX: touch.clientX,
                      clientY: touch.clientY,
                      target: e.target,
                    } as any;
                    handleDragStart(syntheticEvent, tf);
                  }}                  onKeyDown={(e) => {
                    if (!isVisiblePreview) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      // Create a synthetic mouse event for drag start
                      const syntheticEvent = new MouseEvent('mousedown', {
                        clientX: 0,
                        clientY: 0,
                        bubbles: true,
                        cancelable: true,
                      });
                      handleDragStart(syntheticEvent as any, tf);
                    }
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
                  className="absolute -top-6 -right-6 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center cursor-pointer text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity border-0"
                  onMouseDown={(e) => {
                    if (!isVisiblePreview) return;
                    e.preventDefault();
                    e.stopPropagation();
                    handleTextFieldDelete(tf.id);
                  }}
                  onKeyDown={(e) => {
                    if (!isVisiblePreview) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTextFieldDelete(tf.id);
                    }
                  }}
                  title="Delete text field"
                  aria-label="Delete text field"
                  tabIndex={isVisiblePreview ? 0 : -1}
                >
                  ×
                </button>
                <button
                  type="button"
                  className="absolute -top-6 right-0 w-5 h-5 bg-white hover:bg-gray-50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-gray-300 p-0"
                  onMouseDown={(e) => {
                    if (!isVisiblePreview) return;
                    e.preventDefault();
                    e.stopPropagation();
                    textFieldColorInputRefs.current.get(tf.id)?.click();
                  }}
                  onKeyDown={(e) => {
                    if (!isVisiblePreview) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      textFieldColorInputRefs.current.get(tf.id)?.click();
                    }
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
                      textFieldColorInputRefs.current.set(tf.id, el);
                    } else {
                      textFieldColorInputRefs.current.delete(tf.id);
                    }
                  }}
                  type="color"
                  value={tf.inkColor ?? ps.inkColor}
                  className="sr-only"
                  onChange={(e) => {
                    if (!isVisiblePreview) return;
                    handleTextFieldColorChange(tf.id, e.target.value);
                  }}
                  aria-label="Text field color"
                  tabIndex={-1}
                />
                <textarea
                  ref={(el) => {
                    if (!isVisiblePreview) return;
                    if (el) {
                      textFieldInputRefs.current.set(tf.id, el);
                    } else {
                      textFieldInputRefs.current.delete(tf.id);
                    }
                  }}
                  value={tf.text}
                  onChange={(e) => {
                    if (!isVisiblePreview) return;
                    handleTextFieldChange(tf.id, e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (!isVisiblePreview) return;
                    handleTextFieldKeyDown(e, tf.id);
                  }}
                  className={`bg-transparent border-none outline-none resize-none ${fontClass}`}
                  style={{
                    fontFamily: customFontFamily ? `"${customFontFamily}", cursive` : undefined,
                    fontSize: ps.fontSize,
                    color: tf.inkColor ?? ps.inkColor,
                    lineHeight: settings.lineHeight,
                    minWidth: '20px',
                    width: tf.text
                      ? `${Math.max(20, tf.text.split('\n').reduce((max, line) => Math.max(max, line.length), 0) * ps.fontSize * 0.6)}px`
                      : '20px',
                    minHeight: `${ps.fontSize * settings.lineHeight}px`,
                    height: 'auto',
                    caretColor: tf.inkColor ?? ps.inkColor,
                  }}
                  placeholder=""
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>
      );
    },
    [
      cursorPosition,
      customFontFamily,
      fontClass,
      getBackgroundForPage,
      getPageLineStarts,
      getPageSettings,
      handleDragStart,
      handleTextFieldChange,
      handleTextFieldColorChange,
      handleTextFieldDelete,
      handleTextFieldKeyDown,
      handlePageClick,
      isFocused,
      onPageRef,
      pagePaperLines,
      pages,
      currentPageIndex,
      currentPageLineStarts,
      pageTextFields,
      renderCharacter,
      renderPaperLines,
      settings.lineHeight,
      settings.paperStyle,
      settings.ruledMarginLineOffset,
      textFields,
    ]
  );

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Mode Toggle Toolbar */}
      <div
        ref={toolbarRef}
        className="fixed z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex items-center gap-1"
        style={
          toolbarPosition
            ? { left: toolbarPosition.x, top: toolbarPosition.y }
            : { left: '50%', top: 96, transform: 'translateX(-50%)' }
        }
      >
        <button
          type="button"
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-move"
          aria-label="Drag toolbar"
          title="Drag toolbar"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();

            const el = toolbarRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();

            toolbarDragRef.current.active = true;
            toolbarDragRef.current.offsetX = e.clientX - rect.left;
            toolbarDragRef.current.offsetY = e.clientY - rect.top;
            setIsToolbarDragging(true);

            if (!toolbarPosition) {
              setToolbarPosition({ x: rect.left, y: rect.top });
            }
          }}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setEditorMode('write');
            setTimeout(() => textareaRef.current?.focus(), 0);
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${editorMode === 'write'
            ? 'bg-[#E0A32A]/10 text-[#E0A32A]'
            : 'text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
            }`}
          title="Write mode - Type text that flows on lines"
        >
          <PenLine className="w-4 h-4" />
          Write
        </button>
        <button
          onClick={() => setEditorMode('textfield')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${editorMode === 'textfield'
            ? 'bg-[#E0A32A]/10 text-[#E0A32A]'
            : 'text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
            }`}
          title="Text Field mode - Click anywhere to add text"
        >
          <Type className="w-4 h-4" />
          Text Field
        </button>

        <div className="w-px h-7 bg-gray-200 mx-1" />

        <button
          onClick={() => onPreviewScaleChange(Number((previewScale - 0.1).toFixed(2)))}
          className="p-2 rounded-md text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors"
          aria-label="Zoom out preview"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="px-2 min-w-14 text-center text-sm font-medium text-gray-700 select-none">
          {Math.round(previewScale * 100)}%
        </div>
        <button
          onClick={() => onPreviewScaleChange(Number((previewScale + 0.1).toFixed(2)))}
          className="p-2 rounded-md text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors"
          aria-label="Zoom in preview"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-px h-7 bg-gray-200 mx-1" />

        {/* Page Navigation */}
        <button
          onClick={() => onCurrentPageChange(Math.max(0, currentPageIndex - 1))}
          disabled={currentPageIndex === 0}
          className="p-2 rounded-md text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="px-2 min-w-16 text-center text-sm font-medium text-gray-700 select-none">
          Page {currentPageIndex + 1} / {String(totalPages)}
        </div>
        <button
          onClick={() =>
            onCurrentPageChange(
              isPaginationComplete
                ? Math.min(pages.length - 1, currentPageIndex + 1)
                : currentPageIndex + 1
            )
          }
          disabled={isPaginationComplete && currentPageIndex >= pages.length - 1}
          className="p-2 rounded-md text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-7 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={onApplyToAllPages}
          disabled={!onApplyToAllPages}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Apply settings to all pages"
        >
          Apply settings to all pages
        </button>
      </div>

      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleTextChange}
        onPaste={handlePaste}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="sr-only"
        aria-label="Handwriting text input"
        autoFocus
      />

      {/* Only render the current page - no scrolling, use prev/next buttons to navigate */}
      {pages.length > 0 && (
        <>
          {renderPage(currentPageIndex, previewScale, true)}
          {renderAllPagesForExport ? (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: -100000,
                top: 0,
                width: 1,
                height: 1,
                overflow: 'hidden',
              }}
            >
              {pages.map((_, idx) => renderPage(idx, 1, false))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
