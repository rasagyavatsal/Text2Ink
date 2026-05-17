import type { PlainTextSelectionOffsets } from './domSelection';
import { createMeasure } from './pagination';
import { layoutTextFieldContent } from './textFieldLayout';

export type TextFieldSelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TextFieldCaretRect = {
  left: number;
  top: number;
  height: number;
};

function measureSegmentWidth(
  measure: (text: string) => number,
  line: ReturnType<typeof layoutTextFieldContent>['lines'][number],
  offset: number,
) {
  const clampedOffset = Math.max(line.startOffset, Math.min(offset, line.contentEndOffset));
  return measure(line.text.slice(0, clampedOffset - line.startOffset));
}

function findLineForOffset(lines: ReturnType<typeof layoutTextFieldContent>['lines'], offset: number) {
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

export function resolveTextFieldSelectionRects(opts: {
  text: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  selection: PlainTextSelectionOffsets | null;
}): TextFieldSelectionRect[] {
  const { text, fontSize, fontFamily, width, selection } = opts;
  if (!selection || selection.anchor === selection.focus) return [];

  const layout = layoutTextFieldContent({ text, fontSize, fontFamily, width });
  const measure = createMeasure(fontFamily, fontSize);
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);
  const rects: TextFieldSelectionRect[] = [];

  for (const line of layout.lines) {
    if (end <= line.startOffset || start >= line.endOffset) continue;

    const segmentStart = Math.max(start, line.startOffset);
    const segmentEnd = Math.min(end, line.contentEndOffset);

    if (segmentStart < segmentEnd) {
      const left = measureSegmentWidth(measure, line, segmentStart);
      const right = measureSegmentWidth(measure, line, segmentEnd);
      rects.push({
        left,
        top: line.top,
        width: Math.max(1, right - left),
        height: layout.lineHeight,
      });
      continue;
    }

    if (line.hasNewline && segmentStart === line.contentEndOffset && end > line.contentEndOffset) {
      rects.push({
        left: measure(line.text),
        top: line.top,
        width: 4,
        height: layout.lineHeight,
      });
    }
  }

  return rects;
}

export function resolveTextFieldCaretRect(opts: {
  text: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  selection: PlainTextSelectionOffsets | null;
}): TextFieldCaretRect | null {
  const { text, fontSize, fontFamily, width, selection } = opts;
  if (!selection || selection.anchor !== selection.focus) return null;

  const layout = layoutTextFieldContent({ text, fontSize, fontFamily, width });
  const measure = createMeasure(fontFamily, fontSize);

  if (layout.lines.length === 0) {
    return {
      left: 0,
      top: 0,
      height: layout.lineHeight,
    };
  }

  const line = findLineForOffset(layout.lines, selection.focus);
  if (!line) return null;

  return {
    left: measureSegmentWidth(measure, line, selection.focus),
    top: line.top,
    height: layout.lineHeight,
  };
}
