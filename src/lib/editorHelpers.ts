import React from 'react';
import { HandwritingSettings } from './types';
import { createMeasure, nextLineFrom } from './pagination';

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export type RandomStyle = {
  style: React.CSSProperties;
  baseline: number;
  rotation: number;
  spacing: number;
};

export function calculateRandomStyle(
  charIndex: number,
  lineIndex: number,
  randomness: HandwritingSettings['randomness']
): RandomStyle {
  if (!randomness.enabled) {
    return {
      style: { transform: 'none', marginLeft: '0px' },
      baseline: 0,
      rotation: 0,
      spacing: 0,
    };
  }

  const seed = charIndex * 1000 + lineIndex;
  const spacingOffset = (seededRandom(seed) - 0.5) * randomness.spacing * 2;
  const baselineOffset = (seededRandom(seed + 1) - 0.5) * randomness.baseline * 2;
  const rotationOffset = (seededRandom(seed + 2) - 0.5) * randomness.rotation * 2;

  return {
    style: {
      transform: `translateY(${baselineOffset}px) rotate(${rotationOffset}deg)`,
      transformOrigin: 'left bottom',
      marginLeft: `${spacingOffset}px`,
    },
    baseline: baselineOffset,
    rotation: rotationOffset,
    spacing: spacingOffset,
  };
}

export type LineData = {
  text: string;
  lineIndex: number;
  hasNewline: boolean;
};

export type PaginatedTextFieldSegment = {
  pageIndex: number;
  startOffset: number;
  x: number;
  y: number;
  width: number;
  lineHeightPx: number;
  lines: LineData[];
};

type PaginateTextFieldParams = {
  text: string;
  startPageIndex: number;
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  lineHeight: number;
  fontFamily: string;
  pages: Array<{
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    fontSize: number;
    customLineSpacing?: number | null;
    customLineOffset?: number;
  }>;
  pageHasBackground: boolean[];
};

export function calculatePageStartOffsets(pages: LineData[][]): number[] {
  const offsets: number[] = [0];
  let total = 0;
  for (const page of pages) {
    for (const line of page) {
      total += line.text.length + (line.hasNewline ? 1 : 0);
    }
    offsets.push(total);
  }
  return offsets;
}

export function calculateLineStarts(
  lines: LineData[],
  pageStartOffset: number
): number[] {
  const starts: number[] = [];
  let offset = pageStartOffset;
  for (const line of lines) {
    starts.push(offset);
    offset += line.text.length + (line.hasNewline ? 1 : 0);
  }
  return starts;
}

export function paginateTextFieldSegments({
  text,
  startPageIndex,
  x,
  y,
  pageWidth,
  pageHeight,
  lineHeight,
  fontFamily,
  pages,
  pageHasBackground,
}: PaginateTextFieldParams): PaginatedTextFieldSegment[] {
  const segments: PaginatedTextFieldSegment[] = [];
  const safeText = text ?? '';
  let cursor = 0;
  let lineIndex = 0;
  let pageIndex = startPageIndex;

  while (cursor < safeText.length || segments.length === 0) {
    const ps = pages[pageIndex] ?? pages[pages.length - 1];
    if (!ps) break;

    const hasBackground = !!pageHasBackground[pageIndex];
    const lineHeightPx =
      hasBackground && ps.customLineSpacing ? ps.customLineSpacing : ps.fontSize * lineHeight;
    const segmentY =
      pageIndex === startPageIndex ? y : ps.marginTop + (ps.customLineOffset ?? 0);
    const availableWidth = Math.max(20, pageWidth - x - ps.marginRight);
    const availableHeight = Math.max(0, pageHeight - segmentY - ps.marginBottom);
    const linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeightPx));
    const measure = createMeasure(fontFamily, ps.fontSize);
    const lines: LineData[] = [];
    const startOffset = cursor;

    let maxLineWidth = 0;
    for (let i = 0; i < linesPerPage && cursor < safeText.length; i++) {
      const next = nextLineFrom(safeText, cursor, availableWidth, measure);
      if (!next) break;
      const lineWidth = measure(next.lineText);
      if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
      
      lines.push({
        text: next.lineText,
        lineIndex: lineIndex++,
        hasNewline: next.hasNewline,
      });
      cursor = next.nextIndex;
    }

    segments.push({
      pageIndex,
      startOffset,
      x,
      y: segmentY,
      width: Math.min(availableWidth, Math.max(80, maxLineWidth + 20)),
      lineHeightPx,
      lines,
    });

    if (cursor >= safeText.length) break;
    pageIndex += 1;
  }

  return segments;
}
