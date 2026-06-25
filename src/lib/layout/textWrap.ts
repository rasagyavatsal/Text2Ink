import { calculateRandomStyle } from '@/lib/editorHelpers';
import type { HandwritingSettings } from '@/lib/types';

const defaultMeasureFactor = 0.6;

type MeasureOptions = {
  randomness?: HandwritingSettings['randomness'];
  lineIndex?: number;
};

type GlyphMetrics = {
  width?: number;
  actualBoundingBoxRight?: number;
};

type TextMeasureContext = {
  font?: string;
  measureText: (text: string) => GlyphMetrics;
};

function safeMetric(value: number | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function fallbackMeasureRenderedLine(
  text: string,
  fontSize: number,
  options: MeasureOptions = {},
) {
  let currentX = 0;
  let maxRight = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    const randomData = calculateRandomStyle(
      charIndex,
      options.lineIndex ?? 0,
      options.randomness ?? { enabled: false, spacing: 0, baseline: 0, rotation: 0 },
    );
    currentX += randomData.spacing;
    const charWidth = fontSize * defaultMeasureFactor;
    currentX += charWidth;
    maxRight = Math.max(maxRight, currentX);
  }
  return Math.max(0, maxRight);
}

export function measureRenderedLine(
  text: string,
  ctx: TextMeasureContext,
  options: MeasureOptions = {},
) {
  let currentX = 0;
  let maxRight = 0;

  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    const randomData = calculateRandomStyle(
      charIndex,
      options.lineIndex ?? 0,
      options.randomness ?? { enabled: false, spacing: 0, baseline: 0, rotation: 0 },
    );
    currentX += randomData.spacing;

    const metrics = ctx.measureText(text[charIndex]);
    const width = safeMetric(metrics.width);
    const right = Math.max(width, safeMetric(metrics.actualBoundingBoxRight, width));
    maxRight = Math.max(maxRight, currentX + right);

    currentX += width;
    maxRight = Math.max(maxRight, currentX);
  }

  return Math.max(0, maxRight);
}

export function createMeasure(
  fontFamily: string,
  fontSize: number,
  options: MeasureOptions = {},
) {
  try {
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(1, 1)
        : typeof document !== 'undefined'
          ? document.createElement('canvas')
          : null;
    const ctx = canvas?.getContext('2d') as TextMeasureContext | null | undefined;
    if (!ctx) {
      return (s: string) => fallbackMeasureRenderedLine(s, fontSize, options);
    }

    ctx.font = `400 ${fontSize}px ${fontFamily || 'cursive'}`;
    return (s: string) => measureRenderedLine(s, ctx, options);
  } catch {
    return (s: string) => fallbackMeasureRenderedLine(s, fontSize, options);
  }
}

export function nextLineFrom(
  text: string,
  fromIndex: number,
  maxWidth: number,
  measure: (s: string) => number,
): { lineText: string; nextIndex: number; hasNewline: boolean } | null {
  if (fromIndex >= text.length) return null;

  const nlIndex = text.indexOf('\n', fromIndex);
  const rawEnd = nlIndex === -1 ? text.length : nlIndex;
  const segment = text.slice(fromIndex, rawEnd);

  if (segment.length === 0) {
    if (nlIndex !== -1 && nlIndex === fromIndex) {
      return { lineText: '', nextIndex: fromIndex + 1, hasNewline: true };
    }
    return { lineText: '', nextIndex: rawEnd, hasNewline: nlIndex !== -1 };
  }

  if (measure(segment) <= maxWidth) {
    const nextIndex = nlIndex === -1 ? rawEnd : rawEnd + 1;
    return { lineText: segment, nextIndex, hasNewline: nlIndex !== -1 };
  }

  const findMaxFittingIndex = (s: string) => {
    let low = 1;
    let high = s.length;
    let best = 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const w = measure(s.slice(0, mid));
      if (w <= maxWidth) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.max(1, Math.min(best, s.length));
  };

  const fit = findMaxFittingIndex(segment);
  const candidate = segment.slice(0, fit);
  const lastWhitespace = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\t'));
  const breakAt = lastWhitespace > 0 ? lastWhitespace + 1 : fit;

  return {
    lineText: segment.slice(0, breakAt),
    nextIndex: fromIndex + breakAt,
    hasNewline: false,
  };
}
