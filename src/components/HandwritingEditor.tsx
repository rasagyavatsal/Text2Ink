'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { HandwritingSettings, HANDWRITING_FONTS, TextField, EditorMode } from '@/lib/types';
import { Type, PenLine, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';

interface HandwritingEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  settings: HandwritingSettings;
  onSettingsChange?: (settings: HandwritingSettings) => void;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  previewScale: number;
  onPreviewScaleChange: (value: number) => void;
  textFields: TextField[];
  onTextFieldsChange: (textFields: TextField[]) => void;
  currentPageIndex: number;
  onCurrentPageChange: (pageIndex: number) => void;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

type LineData = {
  text: string;
  lineIndex: number;
  hasNewline: boolean;
};

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

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function HandwritingEditor({
  text,
  onTextChange,
  settings,
  onSettingsChange,
  pageRefs,
  previewScale,
  onPreviewScaleChange,
  textFields,
  onTextFieldsChange,
  currentPageIndex,
  onCurrentPageChange,
}: HandwritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>('write');
  const [fontMetricsVersion, setFontMetricsVersion] = useState(0);
  const textFieldInputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMarginLine, setIsDraggingMarginLine] = useState(false);
  const marginLineDragRef = useRef({ pageIndex: 0 });

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

  const contentWidth = PAGE_WIDTH - settings.marginLeft - settings.marginRight;
  const contentHeight = PAGE_HEIGHT - settings.marginTop - settings.marginBottom;
  const ruledTextLeft =
    settings.paperStyle === 'ruled' && !hasAnyCustomBackground
      ? settings.marginLeft + settings.ruledMarginLineOffset + 10
      : settings.marginLeft;
  const ruledTextWidth = PAGE_WIDTH - ruledTextLeft - settings.marginRight;
  const baseLineHeightPx = settings.fontSize * settings.lineHeight;
  const lineHeightPx = hasAnyCustomBackground && settings.customLineSpacing
    ? settings.customLineSpacing
    : baseLineHeightPx;
  const linesPerPage = Math.floor(contentHeight / lineHeightPx);
  const lineOffset = hasAnyCustomBackground ? settings.customLineOffset : 0;

  const maxCharsPerLine = useMemo(() => {
    const approxCharWidth = settings.fontSize * 0.6;
    return Math.max(1, Math.floor(ruledTextWidth / approxCharWidth));
  }, [ruledTextWidth, settings.fontSize]);

  const measureTextWidth = useMemo(() => {
    const fallback = (s: string) => s.length * settings.fontSize * 0.6;
    if (typeof document === 'undefined' || typeof window === 'undefined') return fallback;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback;

    const resolveFamily = () => {
      if (customFontFamily) return `"${customFontFamily}", cursive`;
      const varName = FONT_VARIABLES[settings.fontFamily];
      if (!varName) return 'cursive';
      const scope = document.body ?? document.documentElement;
      const value = window.getComputedStyle(scope).getPropertyValue(varName).trim();
      return value || 'cursive';
    };

    ctx.font = `400 ${settings.fontSize}px ${resolveFamily()}`;
    return (s: string) => ctx.measureText(s).width;
  }, [customFontFamily, settings.fontFamily, settings.fontSize, fontMetricsVersion]);

  const applyRandomness = useCallback(
    (charIndex: number, lineIndex: number) => {
      if (!settings.randomness.enabled) {
        return { transform: 'none', marginLeft: '0px' };
      }

      const seed = charIndex * 1000 + lineIndex;
      const spacingOffset =
        (seededRandom(seed) - 0.5) * settings.randomness.spacing * 2;
      const baselineOffset =
        (seededRandom(seed + 1) - 0.5) * settings.randomness.baseline * 2;
      const rotationOffset =
        (seededRandom(seed + 2) - 0.5) * settings.randomness.rotation * 2;

      return {
        transform: `translateY(${baselineOffset}px) rotate(${rotationOffset}deg)`,
        transformOrigin: 'left bottom',
        marginLeft: `${spacingOffset}px`,
      };
    },
    [settings.randomness]
  );

  const renderPaperLines = useCallback(
    (pageIndex: number) => {
      const pageHasBackground = !!getBackgroundForPage(pageIndex);
      if (settings.paperStyle === 'blank' || pageHasBackground) return null;

      const lines = [];
      const startY = settings.marginTop;

      if (settings.paperStyle === 'lined' || settings.paperStyle === 'ruled') {
        for (let i = 0; i <= linesPerPage; i++) {
          const y = startY + i * lineHeightPx;
          if (y < PAGE_HEIGHT - settings.marginBottom + lineHeightPx) {
            lines.push(
              <div
                key={`line-${pageIndex}-${i}`}
                className="absolute pointer-events-none"
                style={{
                  top: y,
                  left: settings.marginLeft,
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
                  left: settings.marginLeft + settings.ruledMarginLineOffset,
                  top: settings.marginTop,
                  width: 2,
                  height: contentHeight,
                  backgroundColor: '#ffb3b3',
                }}
              />
              {onSettingsChange && (
                <div
                  key={`margin-line-handle-${pageIndex}`}
                  className="absolute"
                  style={{
                    left: settings.marginLeft + settings.ruledMarginLineOffset - 6,
                    top: settings.marginTop,
                    width: 14,
                    height: contentHeight,
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingMarginLine(true);
                    marginLineDragRef.current = {
                      pageIndex,
                    };
                  }}
                  title="Drag to reposition margin line"
                />
              )}
            </div>
          );
        }
      } else if (settings.paperStyle === 'grid') {
        const gridSize = lineHeightPx;
        for (let i = 0; i <= linesPerPage; i++) {
          const y = startY + i * gridSize;
          if (y < PAGE_HEIGHT - settings.marginBottom + gridSize) {
            lines.push(
              <div
                key={`h-line-${pageIndex}-${i}`}
                className="absolute pointer-events-none"
                style={{
                  top: y,
                  left: settings.marginLeft,
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
          const x = settings.marginLeft + j * gridSize;
          lines.push(
            <div
              key={`v-line-${pageIndex}-${j}`}
              className="absolute pointer-events-none"
              style={{
                left: x,
                top: settings.marginTop,
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
    [settings, lineHeightPx, linesPerPage, contentWidth, contentHeight, onSettingsChange]
  );

  useEffect(() => {
    if (!isDraggingMarginLine) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const handleMove = (e: MouseEvent) => {
      if (!onSettingsChange) return;
      const { pageIndex } = marginLineDragRef.current;
      const pageEl = pageRefs.current[pageIndex];
      if (!pageEl) return;

      const pageRect = pageEl.getBoundingClientRect();
      const x = (e.clientX - pageRect.left) / previewScale;
      const minLeft = 0;
      const maxLeft = PAGE_WIDTH;
      const clampedLeft = clamp(x, minLeft, maxLeft);
      const newOffset = clampedLeft - settings.marginLeft;

      const minOffset = -settings.marginLeft;
      const maxOffset = PAGE_WIDTH - settings.marginLeft;
      const clampedOffset = clamp(newOffset, minOffset, maxOffset);

      if (clampedOffset === settings.ruledMarginLineOffset) return;
      onSettingsChange({ ...settings, ruledMarginLineOffset: clampedOffset });
    };

    const handleUp = () => {
      setIsDraggingMarginLine(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingMarginLine, onSettingsChange, pageRefs, previewScale, settings]);

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

  const renderCharacter = useCallback(
    (char: string, charIndex: number, lineIndex: number, globalCharIndex: number, showCursor: boolean, showCursorBefore: boolean) => {
      if (char === ' ') {
        return (
          <span
            key={globalCharIndex}
            className="relative cursor-text"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const isLeftHalf = e.clientX < rect.left + rect.width / 2;
              handleCharClick(e, globalCharIndex, isLeftHalf);
            }}
          >
            {showCursorBefore && isFocused && (
              <span
                className="absolute animate-pulse"
                style={{
                  left: 0,
                  top: 0,
                  width: 2,
                  height: '1em',
                  backgroundColor: settings.inkColor,
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
                  backgroundColor: settings.inkColor,
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
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeftHalf = e.clientX < rect.left + rect.width / 2;
            handleCharClick(e, globalCharIndex, isLeftHalf);
          }}
        >
          {showCursorBefore && isFocused && (
            <span
              className="absolute animate-pulse"
              style={{
                left: -1,
                top: 0,
                width: 2,
                height: '1em',
                backgroundColor: settings.inkColor,
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
                backgroundColor: settings.inkColor,
              }}
            />
          )}
        </span>
      );
    },
    [applyRandomness, isFocused, settings.inkColor, handleCharClick]
  );

  const linesData = useMemo((): LineData[] => {
    const rawLines = text.split('\n');
    const out: LineData[] = [];
    const maxWidth = ruledTextWidth;

    const findMaxFittingIndex = (s: string) => {
      if (s.length === 0) return 0;

      if (typeof document === 'undefined' || typeof window === 'undefined') {
        return Math.max(1, Math.min(s.length, maxCharsPerLine));
      }

      let low = 1;
      let high = s.length;
      let best = 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const w = measureTextWidth(s.slice(0, mid));
        if (w <= maxWidth) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return Math.max(1, Math.min(best, s.length));
    };

    for (let rawIdx = 0; rawIdx < rawLines.length; rawIdx++) {
      let remaining = rawLines[rawIdx] ?? '';
      const hasNewlineAtEnd = rawIdx < rawLines.length - 1;

      if (remaining.length === 0) {
        out.push({ text: '', lineIndex: rawIdx, hasNewline: hasNewlineAtEnd });
        continue;
      }

      const tokens = remaining.match(/\S+|\s+/g) ?? [remaining];
      const pieces: string[] = [];
      let current = '';

      const flush = () => {
        pieces.push(current);
        current = '';
      };

      for (const token of tokens) {
        if (token === '') continue;

        if (current !== '' && token.trim() === '') {
          const candidate = current + token;
          if (measureTextWidth(candidate) <= maxWidth) {
            current = candidate;
          } else {
            current = candidate;
            flush();
          }
          continue;
        }

        const candidate = current + token;
        if (current !== '' && measureTextWidth(candidate) <= maxWidth) {
          current = candidate;
          continue;
        }

        if (current !== '' && measureTextWidth(candidate) > maxWidth) {
          flush();
        }

        if (measureTextWidth(token) <= maxWidth) {
          current += token;
          continue;
        }

        let rest = token;
        while (rest.length > 0 && measureTextWidth(rest) > maxWidth) {
          const fit = findMaxFittingIndex(rest);
          const chunk = rest.slice(0, fit);
          if (chunk.length === 0) break;
          pieces.push(chunk);
          rest = rest.slice(fit);
        }

        if (rest.length > 0) {
          current += rest;
        }
      }

      if (current !== '') {
        flush();
      }

      for (let i = 0; i < pieces.length; i++) {
        out.push({
          text: pieces[i] ?? '',
          lineIndex: rawIdx,
          hasNewline: i === pieces.length - 1 ? hasNewlineAtEnd : false,
        });
      }
    }

    return out;
  }, [text, ruledTextWidth, maxCharsPerLine, measureTextWidth]);

  const pages = useMemo(() => {
    const pagesData: LineData[][] = [];
    let currentPage: LineData[] = [];

    linesData.forEach((line) => {
      if (currentPage.length >= linesPerPage) {
        pagesData.push(currentPage);
        currentPage = [];
      }
      currentPage.push(line);
    });

    if (currentPage.length > 0 || pagesData.length === 0) {
      pagesData.push(currentPage);
    }

    return pagesData;
  }, [linesData, linesPerPage]);

  useEffect(() => {
    if (currentPageIndex > pages.length - 1) {
      onCurrentPageChange(Math.max(0, pages.length - 1));
    }
  }, [currentPageIndex, onCurrentPageChange, pages.length]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTextChange(e.target.value);
      setCursorPosition(e.target.selectionStart);
    },
    [onTextChange]
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

      onTextChange(nextText);
      setCursorPosition(nextCursor);
      requestAnimationFrame(() => {
        el.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [cursorPosition, onTextChange, text]
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

        const newTextField: TextField = {
          id: `tf-${Date.now()}`,
          x,
          y,
          text: '',
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
    [editorMode, textFields, onTextFieldsChange, previewScale]
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
      if (rect) {
        setDragOffset({
          x: (e.clientX - rect.left) / previewScale,
          y: (e.clientY - rect.top) / previewScale,
        });
      }
    },
    [previewScale]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;

      const tf = textFields.find((t) => t.id === draggingId);
      if (!tf) return;

      const pageEl = pageRefs.current[tf.pageIndex];
      if (!pageEl) return;

      const pageRect = pageEl.getBoundingClientRect();
      const newX = (e.clientX - pageRect.left) / previewScale - dragOffset.x + 4;
      const newY = (e.clientY - pageRect.top) / previewScale - dragOffset.y + 12;

      onTextFieldsChange(
        textFields.map((t) =>
          t.id === draggingId ? { ...t, x: Math.max(0, newX), y: Math.max(0, newY) } : t
        )
      );
    },
    [draggingId, textFields, dragOffset, onTextFieldsChange, pageRefs, previewScale]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
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

  // Calculate the global character count offset for the current page
  // (sum of all characters + newlines from previous pages)
  let globalCharCount = 0;
  for (let i = 0; i < currentPageIndex && i < pages.length; i++) {
    for (const line of pages[i]) {
      globalCharCount += line.text.length + (line.hasNewline ? 1 : 0);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Mode Toggle Toolbar */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex items-center gap-1">
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
          Page {currentPageIndex + 1} / {pages.length}
        </div>
        <button
          onClick={() => onCurrentPageChange(Math.min(pages.length - 1, currentPageIndex + 1))}
          disabled={currentPageIndex >= pages.length - 1}
          className="p-2 rounded-md text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        value={text}
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
      {pages.length > 0 && (() => {
        const pageIndex = currentPageIndex;
        const pageLines = pages[pageIndex] || [];
        const pageBackground = getBackgroundForPage(pageIndex);
        const pageHasBackground = !!pageBackground;
        const pageLineOffset = pageHasBackground ? settings.customLineOffset : 0;
        const pageLineHeightPx = pageHasBackground && settings.customLineSpacing
          ? settings.customLineSpacing
          : baseLineHeightPx;

        return (
          <div
            key={pageIndex}
            className="relative"
            style={{
              width: PAGE_WIDTH * previewScale,
              height: PAGE_HEIGHT * previewScale,
            }}
          >
            <div
              ref={(el) => {
                pageRefs.current[pageIndex] = el;
              }}
              className="relative shadow-2xl cursor-text"
              style={{
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                backgroundColor: settings.paperColor,
                backgroundImage: pageBackground
                  ? `url(${pageBackground})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
              onClick={(e) => handlePageClick(e, pageIndex)}
            >
              {renderPaperLines(pageIndex)}

              <div
                className={`absolute select-none ${fontClass}`}
                style={{
                  top: settings.marginTop + pageLineOffset,
                  left: ruledTextLeft,
                  width: ruledTextWidth,
                  height: contentHeight,
                  fontFamily: customFontFamily ? `"${customFontFamily}", cursive` : undefined,
                  fontSize: settings.fontSize,
                  lineHeight: pageHasBackground && settings.customLineSpacing
                    ? `${settings.customLineSpacing}px`
                    : settings.lineHeight,
                  color: settings.inkColor,
                  transform: settings.lineTilt ? `rotate(${settings.lineTilt}deg)` : undefined,
                  transformOrigin: 'left top',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {pageLines.length === 0 || (pageLines.length === 1 && pageLines[0].text === '') ? (
                  <span className="text-gray-400 pointer-events-none">
                    Click here to start typing...
                    {isFocused && cursorPosition === 0 && (
                      <span
                        className="inline-block animate-pulse ml-0"
                        style={{
                          width: 2,
                          height: '1em',
                          backgroundColor: settings.inkColor,
                          verticalAlign: 'text-bottom',
                        }}
                      />
                    )}
                  </span>
                ) : (
                  pageLines.map((line, lineIdx) => {
                    const lineStartChar = globalCharCount;
                    const lineText = line.text;

                    return (
                      <div key={lineIdx} style={{ minHeight: pageLineHeightPx, whiteSpace: 'nowrap' }}>
                        {lineText === '' ? (
                          <>
                            {isFocused && cursorPosition === lineStartChar && (
                              <span
                                className="inline-block animate-pulse"
                                style={{
                                  width: 2,
                                  height: '1em',
                                  backgroundColor: settings.inkColor,
                                  verticalAlign: 'text-bottom',
                                }}
                              />
                            )}
                            {(() => { globalCharCount += (line.hasNewline ? 1 : 0); return null; })()}
                          </>
                        ) : (
                          <>
                            {lineText.split('').map((char: string, charIdx: number) => {
                              const currentGlobalChar = globalCharCount;
                              globalCharCount += 1;
                              const showCursorAfter = cursorPosition === currentGlobalChar + 1;
                              const showCursorBefore = charIdx === 0 && cursorPosition === currentGlobalChar;

                              return renderCharacter(
                                char,
                                charIdx,
                                line.lineIndex,
                                currentGlobalChar,
                                showCursorAfter,
                                showCursorBefore
                              );
                            })}
                            {(() => { globalCharCount += (line.hasNewline ? 1 : 0); return null; })()}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Text Fields for this page */}
              {textFields
                .filter((tf) => tf.pageIndex === pageIndex)
                .map((tf) => (
                  <div
                    key={tf.id}
                    className="absolute text-field-container group"
                    style={{
                      left: tf.x,
                      top: tf.y,
                      transform: 'translate(-4px, -12px)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Drag handle */}
                    <div
                      className="absolute -left-6 top-0 w-5 h-5 bg-gray-400 hover:bg-gray-600 rounded cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleDragStart(e, tf)}
                      title="Drag to move"
                    >
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                      </svg>
                    </div>
                    {/* Delete button */}
                    <div
                      className="absolute -top-6 -right-6 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center cursor-pointer text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTextFieldDelete(tf.id);
                      }}
                      title="Delete text field"
                    >
                      ×
                    </div>
                    <textarea
                      ref={(el) => {
                        if (el) {
                          textFieldInputRefs.current.set(tf.id, el);
                        } else {
                          textFieldInputRefs.current.delete(tf.id);
                        }
                      }}
                      value={tf.text}
                      onChange={(e) => handleTextFieldChange(tf.id, e.target.value)}
                      onKeyDown={(e) => handleTextFieldKeyDown(e, tf.id)}
                      className={`bg-transparent border-none outline-none resize-none ${fontClass}`}
                      style={{
                        fontFamily: customFontFamily ? `"${customFontFamily}", cursive` : undefined,
                        fontSize: settings.fontSize,
                        color: settings.inkColor,
                        lineHeight: settings.lineHeight,
                        minWidth: '20px',
                        width: tf.text ? `${Math.max(20, tf.text.split('\n').reduce((max, line) => Math.max(max, line.length), 0) * settings.fontSize * 0.6)}px` : '20px',
                        minHeight: `${settings.fontSize * settings.lineHeight}px`,
                        height: 'auto',
                        caretColor: settings.inkColor,
                      }}
                      placeholder=""
                      autoComplete="off"
                    />
                  </div>
                ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
