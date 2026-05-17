import { createMeasure } from './pagination';

export const TEXT_FIELD_CONTENT_PADDING = 6;
export const TEXT_FIELD_MIN_SIZE = 10;
export const TEXT_FIELD_LINE_HEIGHT = 1.2;

export interface TextFieldCommittedLine {
  text: string;
  top: number;
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
  if (text.length === 0) return [''];

  return text
    .split('\n')
    .flatMap((line) => wrapLineToWidth(line, maxContentWidth, measure));
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
      text: line,
      top: index * lineHeight,
    })),
    lineHeight,
    textWidth: Math.max(...wrappedLines.map((line) => measure(line)), 0),
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
