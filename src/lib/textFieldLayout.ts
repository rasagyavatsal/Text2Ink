import { createMeasure } from './pagination';

export const TEXT_FIELD_CONTENT_PADDING = 6;
export const TEXT_FIELD_MIN_SIZE = 10;
export const TEXT_FIELD_LINE_HEIGHT = 1.2;

export interface TextFieldCommittedLine {
  text: string;
  top: number;
  startOffset: number;
  contentEndOffset: number;
  endOffset: number;
  hasNewline: boolean;
}

export interface TextFieldContentLayout {
  lines: TextFieldCommittedLine[];
  lineHeight: number;
  textWidth: number;
}

function wrapLineToWidth(line: string, maxContentWidth: number, measure: (text: string) => number) {
  if (line.length === 0) return [''];

  const wrapped: string[] = [];
  let current = '';

  for (const char of line) {
    const candidate = current + char;
    if (current && measure(candidate) > maxContentWidth) {
      wrapped.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }

  wrapped.push(current);
  return wrapped;
}

function wrapTextFieldText(text: string, maxContentWidth: number, measure: (text: string) => number) {
  if (text.length === 0) {
    return [{
      text: '',
      startOffset: 0,
      contentEndOffset: 0,
      endOffset: 0,
      hasNewline: false,
    }];
  }

  const wrappedLines: Array<{
    text: string;
    startOffset: number;
    contentEndOffset: number;
    endOffset: number;
    hasNewline: boolean;
  }> = [];
  const rawLines = text.split('\n');
  let offset = 0;

  rawLines.forEach((line, rawLineIndex) => {
    const segments = wrapLineToWidth(line, maxContentWidth, measure);
    const hasNewline = rawLineIndex < rawLines.length - 1;
    let segmentOffset = offset;

    segments.forEach((segment, segmentIndex) => {
      const contentEndOffset = segmentOffset + segment.length;
      const isLastSegment = segmentIndex === segments.length - 1;
      wrappedLines.push({
        text: segment,
        startOffset: segmentOffset,
        contentEndOffset,
        endOffset: contentEndOffset + (isLastSegment && hasNewline ? 1 : 0),
        hasNewline: isLastSegment && hasNewline,
      });
      segmentOffset = contentEndOffset;
    });

    offset = segmentOffset + (hasNewline ? 1 : 0);
  });

  return wrappedLines;
}

export function layoutTextFieldContent(opts: {
  text: string;
  fontSize: number;
  fontFamily: string;
  width: number;
}): TextFieldContentLayout {
  const { text, fontSize, fontFamily, width } = opts;
  const measure = createMeasure(fontFamily, fontSize);
  const maxContentWidth = Math.max(1, width - TEXT_FIELD_CONTENT_PADDING * 2);
  const wrappedLines = wrapTextFieldText(text, maxContentWidth, measure);
  const lineHeight = fontSize * TEXT_FIELD_LINE_HEIGHT;

  return {
    lines: wrappedLines.map((line, index) => ({
      text: line.text,
      top: index * lineHeight,
      startOffset: line.startOffset,
      contentEndOffset: line.contentEndOffset,
      endOffset: line.endOffset,
      hasNewline: line.hasNewline,
    })),
    lineHeight,
    textWidth: Math.max(...wrappedLines.map((line) => measure(line.text)), 0),
  };
}

export function calculateAutoFitTextFieldSize(opts: {
  text: string;
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
}) {
  const { text, fontSize, fontFamily, x, y, pageWidth, pageHeight } = opts;
  const padding = TEXT_FIELD_CONTENT_PADDING * 2;
  const availableWidth = Math.max(TEXT_FIELD_MIN_SIZE, pageWidth - x);
  const availableHeight = Math.max(TEXT_FIELD_MIN_SIZE, pageHeight - y);
  const layout = layoutTextFieldContent({
    text,
    fontSize,
    fontFamily,
    width: availableWidth,
  });
  const width = Math.min(availableWidth, Math.max(TEXT_FIELD_MIN_SIZE, layout.textWidth + padding));
  const height = Math.max(TEXT_FIELD_MIN_SIZE, layout.lines.length * layout.lineHeight + padding);

  if (height > availableHeight) return null;

  return { width, height };
}
