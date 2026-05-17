import type { LineData } from './types';

export type BodySelectionOffsets = {
  anchor: number;
  focus: number;
};

export type BodySelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type BodyCaretRect = {
  left: number;
  top: number;
  height: number;
};

type BodyLineSpan = {
  text: string;
  lineIndex: number;
  startOffset: number;
  contentEndOffset: number;
  endOffset: number;
  hasNewline: boolean;
};

function buildLineSpans(lines: LineData[]): BodyLineSpan[] {
  let offset = 0;
  return lines.map((line, pageLineIndex) => {
    const startOffset = offset;
    const contentEndOffset = startOffset + line.text.length;
    const endOffset = contentEndOffset + (line.hasNewline ? 1 : 0);
    offset = endOffset;
    return {
      text: line.text,
      lineIndex: pageLineIndex,
      startOffset,
      contentEndOffset,
      endOffset,
      hasNewline: line.hasNewline,
    };
  });
}

function lineTop(lineIndex: number, lineHeight: number) {
  return lineIndex * lineHeight;
}

function findLineForOffset(lines: BodyLineSpan[], offset: number): BodyLineSpan | null {
  if (lines.length === 0) return null;

  for (const line of lines) {
    if (offset <= line.contentEndOffset) {
      return line;
    }
    if (line.hasNewline && offset === line.endOffset) {
      return line;
    }
  }

  return lines[lines.length - 1];
}

function measureSegmentWidth(
  measure: (text: string) => number,
  line: BodyLineSpan,
  offset: number,
) {
  const clampedOffset = Math.max(line.startOffset, Math.min(offset, line.contentEndOffset));
  return measure(line.text.slice(0, clampedOffset - line.startOffset));
}

export function resolveBodySelectionRects(opts: {
  lines: LineData[];
  selection: BodySelectionOffsets | null;
  lineHeight: number;
  measure: (text: string) => number;
}): BodySelectionRect[] {
  const { lines, selection, lineHeight, measure } = opts;
  if (!selection || selection.anchor === selection.focus) return [];

  const spans = buildLineSpans(lines);
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);
  const rects: BodySelectionRect[] = [];

  for (const line of spans) {
    if (end <= line.startOffset || start >= line.endOffset) continue;

    const segmentStart = Math.max(start, line.startOffset);
    const segmentEnd = Math.min(end, line.contentEndOffset);

    if (segmentStart < segmentEnd) {
      const left = measureSegmentWidth(measure, line, segmentStart);
      const right = measureSegmentWidth(measure, line, segmentEnd);
      rects.push({
        left,
        top: lineTop(line.lineIndex, lineHeight),
        width: Math.max(1, right - left),
        height: lineHeight,
      });
      continue;
    }

    if (line.hasNewline && segmentStart === line.contentEndOffset && end > line.contentEndOffset) {
      rects.push({
        left: measure(line.text),
        top: lineTop(line.lineIndex, lineHeight),
        width: 4,
        height: lineHeight,
      });
    }
  }

  return rects;
}

export function resolveBodyCaretRect(opts: {
  lines: LineData[];
  selection: BodySelectionOffsets | null;
  lineHeight: number;
  measure: (text: string) => number;
}): BodyCaretRect | null {
  const { lines, selection, lineHeight, measure } = opts;
  if (!selection || selection.anchor !== selection.focus) return null;

  const spans = buildLineSpans(lines);
  if (spans.length === 0) {
    return {
      left: 0,
      top: 0,
      height: lineHeight,
    };
  }

  const line = findLineForOffset(spans, selection.focus);
  if (!line) return null;

  return {
    left: measureSegmentWidth(measure, line, selection.focus),
    top: lineTop(line.lineIndex, lineHeight),
    height: lineHeight,
  };
}
