const defaultMeasureFactor = 0.6;

export function createMeasure(fontFamily: string, fontSize: number) {
  try {
    const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
    if (!hasOffscreen) {
      return (s: string) => s.length * fontSize * defaultMeasureFactor;
    }

    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return (s: string) => s.length * fontSize * defaultMeasureFactor;
    }

    ctx.font = `400 ${fontSize}px ${fontFamily || 'cursive'}`;
    return (s: string) => ctx.measureText(s).width;
  } catch {
    return (s: string) => s.length * fontSize * defaultMeasureFactor;
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
