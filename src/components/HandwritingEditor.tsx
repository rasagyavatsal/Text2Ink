'use client';

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { HandwritingSettings, HANDWRITING_FONTS } from '@/lib/types';

interface HandwritingEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  settings: HandwritingSettings;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function HandwritingEditor({
  text,
  onTextChange,
  settings,
  pageRefs,
}: HandwritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const fontClass = useMemo(() => {
    const font = HANDWRITING_FONTS.find((f) => f.value === settings.fontFamily);
    return font?.className || HANDWRITING_FONTS[0].className;
  }, [settings.fontFamily]);

  const contentWidth = PAGE_WIDTH - settings.marginLeft - settings.marginRight;
  const contentHeight = PAGE_HEIGHT - settings.marginTop - settings.marginBottom;
  const lineHeightPx = settings.fontSize * settings.lineHeight;
  const linesPerPage = Math.floor(contentHeight / lineHeightPx);

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
        marginLeft: `${spacingOffset}px`,
      };
    },
    [settings.randomness]
  );

  const renderPaperLines = useCallback(
    (pageIndex: number) => {
      if (settings.paperStyle === 'blank') return null;

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

  const renderCharacter = useCallback(
    (char: string, charIndex: number, lineIndex: number, globalCharIndex: number, showCursor: boolean) => {
      if (char === ' ') {
        return (
          <span key={globalCharIndex} className="relative">
            <span style={{ whiteSpace: 'pre' }}>{' '}</span>
            {showCursor && isFocused && (
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
          </span>
        );
      }

      const randomStyle = applyRandomness(charIndex, lineIndex);

      return (
        <span
          key={globalCharIndex}
          className="inline-block relative"
          style={randomStyle}
        >
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
    [applyRandomness, isFocused, settings.inkColor]
  );

  const pages = useMemo(() => {
    const lines = text.split('\n');
    const allLines: { text: string; lineIndex: number }[] = [];

    lines.forEach((line, idx) => {
      allLines.push({ text: line, lineIndex: idx });
    });

    const pagesData: { text: string; lineIndex: number }[][] = [];
    let currentPage: { text: string; lineIndex: number }[] = [];

    allLines.forEach((line) => {
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
  }, [text, linesPerPage]);

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
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  let globalCharCount = 0;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
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
        const pageStartChar = pages
          .slice(0, pageIndex)
          .reduce((acc, p) => acc + p.reduce((a, l) => a + l.text.length + 1, 0), 0);

        return (
          <div
            key={pageIndex}
            ref={(el) => {
              pageRefs.current[pageIndex] = el;
            }}
            className="relative shadow-2xl cursor-text"
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              backgroundColor: settings.paperColor,
            }}
            onClick={focusTextarea}
          >
            {renderPaperLines(pageIndex)}

            <div
              className={`absolute select-none ${fontClass}`}
              style={{
                top: settings.marginTop,
                left: settings.marginLeft,
                width: contentWidth,
                height: contentHeight,
                fontSize: settings.fontSize,
                lineHeight: settings.lineHeight,
                color: settings.inkColor,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
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
                  
                  return (
                    <div key={lineIdx} style={{ minHeight: lineHeightPx }}>
                      {line.text === '' ? (
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
                          {line.text.split('').map((char, charIdx) => {
                            const currentGlobalChar = globalCharCount;
                            globalCharCount += 1;
                            const showCursor = cursorPosition === currentGlobalChar + 1;
                            
                            return renderCharacter(
                              char,
                              charIdx,
                              line.lineIndex,
                              currentGlobalChar,
                              showCursor
                            );
                          })}
                          {(() => { globalCharCount += 1; return null; })()}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
