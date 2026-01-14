'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { HandwritingSettings, HANDWRITING_FONTS, TextField, EditorMode } from '@/lib/types';
import { Type, PenLine, Plus, Minus } from 'lucide-react';

interface HandwritingEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  settings: HandwritingSettings;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  previewScale: number;
  onPreviewScaleChange: (value: number) => void;
  textFields: TextField[];
  onTextFieldsChange: (textFields: TextField[]) => void;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface TextSegment {
  text: string;
  isError: boolean;
  originalWord?: string;
}

const TYPO_PATTERNS: Array<(word: string, seed: number) => string> = [
  (word) => word.split('').reverse().slice(0, Math.min(3, word.length)).join('') + word.slice(3),
  (word) => word.slice(0, 2) + word[3] + word[2] + word.slice(4),
  (word, seed) => {
    const pos = Math.floor(seededRandom(seed) * (word.length - 1)) + 1;
    return word.slice(0, pos) + word.slice(pos + 1);
  },
  (word, seed) => {
    const pos = Math.floor(seededRandom(seed) * word.length);
    const chars = 'aeiou';
    const char = chars[Math.floor(seededRandom(seed + 1) * chars.length)];
    return word.slice(0, pos) + char + word.slice(pos);
  },
  (word, seed) => {
    const pos = Math.floor(seededRandom(seed) * word.length);
    const adjacent: Record<string, string> = { a: 's', e: 'r', i: 'o', o: 'p', u: 'i', s: 'a', t: 'y', n: 'm' };
    const char = word[pos];
    const replacement = adjacent[char.toLowerCase()] || char;
    return word.slice(0, pos) + replacement + word.slice(pos + 1);
  },
];

function generateTypo(word: string, seed: number): string {
  if (word.length < 3) return word;
  const patternIndex = Math.floor(seededRandom(seed) * TYPO_PATTERNS.length);
  try {
    return TYPO_PATTERNS[patternIndex](word, seed);
  } catch {
    return word;
  }
}

function processTextWithErrors(
  text: string,
  frequency: number,
  enabled: boolean
): { segments: TextSegment[]; displayText: string } {
  if (!enabled) {
    return { segments: [{ text, isError: false }], displayText: text };
  }

  const words = text.split(/(\s+)/);
  const segments: TextSegment[] = [];
  let displayText = '';
  let wordIndex = 0;

  for (const part of words) {
    if (/^\s+$/.test(part)) {
      segments.push({ text: part, isError: false });
      displayText += part;
    } else if (part.length >= 3) {
      const seed = wordIndex * 7919 + part.length * 13;
      const shouldError = seededRandom(seed) < frequency;
      
      if (shouldError) {
        const typo = generateTypo(part, seed + 1);
        segments.push({ text: typo, isError: true, originalWord: part });
        segments.push({ text: ' ', isError: false });
        segments.push({ text: part, isError: false });
        displayText += typo + ' ' + part;
      } else {
        segments.push({ text: part, isError: false });
        displayText += part;
      }
      wordIndex++;
    } else {
      segments.push({ text: part, isError: false });
      displayText += part;
    }
  }

  return { segments, displayText };
}

function makeScribblePath(seed: number): string {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const points = 4;
  const width = 100;
  const height = 12;
  const midY = height / 2;
  const amp = 0.15 + seededRandom(seed + 11) * 0.35;

  const y = (i: number) => {
    const base = Math.sin((i / (points - 1)) * Math.PI * 2 + seededRandom(seed + 3) * 2) * amp;
    const noise = (seededRandom(seed + 100 + i) - 0.5) * 0.35;
    return clamp(midY + base + noise, 1, height - 1);
  };

  let d = `M 0 ${y(0).toFixed(2)}`;
  for (let i = 1; i < points; i++) {
    const x0 = ((i - 1) / (points - 1)) * width;
    const x1 = (i / (points - 1)) * width;
    const cx = (x0 + x1) / 2;
    const cy = clamp((y(i - 1) + y(i)) / 2 + (seededRandom(seed + 200 + i) - 0.5) * 0.25, 1, height - 1);
    d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x1.toFixed(2)} ${y(i).toFixed(2)}`;
  }

  return d;
}

export default function HandwritingEditor({
  text,
  onTextChange,
  settings,
  pageRefs,
  previewScale,
  onPreviewScaleChange,
  textFields,
  onTextFieldsChange,
}: HandwritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>('write');
  const [activeTextFieldId, setActiveTextFieldId] = useState<string | null>(null);
  const textFieldInputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  const contentWidth = PAGE_WIDTH - settings.marginLeft - settings.marginRight;
  const contentHeight = PAGE_HEIGHT - settings.marginTop - settings.marginBottom;
  const baseLineHeightPx = settings.fontSize * settings.lineHeight;
  const lineHeightPx = settings.customBackgroundImage && settings.customLineSpacing 
    ? settings.customLineSpacing 
    : baseLineHeightPx;
  const linesPerPage = Math.floor(contentHeight / lineHeightPx);
  const lineOffset = settings.customBackgroundImage ? settings.customLineOffset : 0;

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
      if (settings.paperStyle === 'blank' || settings.customBackgroundImage) return null;

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
            <div
              key={`margin-line-${pageIndex}`}
              className="absolute pointer-events-none"
              style={{
                left: settings.marginLeft - 10,
                top: settings.marginTop,
                width: 2,
                height: contentHeight,
                backgroundColor: '#ffb3b3',
              }}
            />
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
    [settings, lineHeightPx, linesPerPage, contentWidth, contentHeight]
  );

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

  const processedData = useMemo(() => {
    const lines = text.split('\n');
    const allLines: { segments: TextSegment[]; lineIndex: number }[] = [];

    lines.forEach((line, idx) => {
      const { segments } = processTextWithErrors(
        line,
        settings.errorStrokes.frequency,
        settings.errorStrokes.enabled
      );
      allLines.push({ segments, lineIndex: idx });
    });

    return allLines;
  }, [text, settings.errorStrokes.enabled, settings.errorStrokes.frequency]);

  const pages = useMemo(() => {
    const pagesData: { segments: TextSegment[]; lineIndex: number }[][] = [];
    let currentPage: { segments: TextSegment[]; lineIndex: number }[] = [];

    processedData.forEach((line) => {
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
  }, [processedData, linesPerPage]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTextChange(e.target.value);
      setCursorPosition(e.target.selectionStart);
    },
    [onTextChange]
  );

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
  }, []);

  const focusTextarea = useCallback(() => {
    if (editorMode === 'write') {
      textareaRef.current?.focus();
    }
  }, [editorMode]);

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
        setActiveTextFieldId(newTextField.id);
        
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
      setActiveTextFieldId(null);
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
        setActiveTextFieldId(null);
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
      setActiveTextFieldId(tf.id);
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

  let globalCharCount = 0;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Mode Toggle Toolbar */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex items-center gap-1">
        <button
          onClick={() => {
            setEditorMode('write');
            setTimeout(() => textareaRef.current?.focus(), 0);
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            editorMode === 'write'
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
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            editorMode === 'textfield'
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
      </div>

      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="sr-only"
        aria-label="Handwriting text input"
        autoFocus
      />

      {pages.map((pageLines, pageIndex) => {
        const getLineText = (line: { segments: TextSegment[] }) => 
          line.segments.map(s => s.text).join('');
        const pageStartChar = pages
          .slice(0, pageIndex)
          .reduce((acc, p) => acc + p.reduce((a, l) => a + getLineText(l).length + 1, 0), 0);

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
                backgroundImage: settings.customBackgroundImage
                  ? `url(${settings.customBackgroundImage})`
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
                  top: settings.marginTop + lineOffset,
                  left: settings.marginLeft,
                  width: contentWidth,
                  height: contentHeight,
                  fontFamily: customFontFamily ? `"${customFontFamily}", cursive` : undefined,
                  fontSize: settings.fontSize,
                  lineHeight: settings.customBackgroundImage && settings.customLineSpacing 
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
                {pageLines.length === 0 || (pageLines.length === 1 && getLineText(pageLines[0]) === '') ? (
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
                    const lineText = getLineText(line);
                    
                    return (
                      <div key={lineIdx} style={{ minHeight: lineHeightPx }}>
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
                            {(() => { globalCharCount += 1; return null; })()}
                          </>
                        ) : (
                          <>
                            {line.segments.map((segment, segIdx) => (
                              <span
                                key={segIdx}
                                className={segment.isError ? 'relative inline-block' : ''}
                              >
                                {segment.text.split('').map((char: string, charIdx: number) => {
                                  const currentGlobalChar = globalCharCount;
                                  globalCharCount += 1;
                                  const showCursorAfter = cursorPosition === currentGlobalChar + 1;
                                  const showCursorBefore = charIdx === 0 && segIdx === 0 && cursorPosition === currentGlobalChar;
                                  
                                  return renderCharacter(
                                    char,
                                    charIdx,
                                    line.lineIndex,
                                    currentGlobalChar,
                                    showCursorAfter,
                                    showCursorBefore
                                  );
                                })}
                                {segment.isError && (
                                  <svg
                                    className="absolute pointer-events-none"
                                    viewBox="0 0 100 12"
                                    preserveAspectRatio="none"
                                    style={{
                                      left: 0,
                                      width: '100%',
                                      top: '45%',
                                      height: Math.max(10, Math.round(settings.fontSize * 0.45)),
                                      transform: `rotate(${-1 + seededRandom(line.lineIndex * 1000 + segIdx * 97) * 2}deg)`,
                                    }}
                                  >
                                    <path
                                      d={makeScribblePath(line.lineIndex * 1000 + segIdx * 97)}
                                      fill="none"
                                      stroke={settings.inkColor}
                                      strokeWidth={settings.errorStrokes.lineWidth}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </span>
                            ))}
                            {(() => { globalCharCount += 1; return null; })()}
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
                      onFocus={() => setActiveTextFieldId(tf.id)}
                      onBlur={() => setActiveTextFieldId(null)}
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
      })}
    </div>
  );
}
