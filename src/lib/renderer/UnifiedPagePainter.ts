import type { HandwritingSettings, PageSettings, PaperStyle, TextField } from '../types';
import { calculateRandomStyle, type LineData } from '../editorHelpers';
import { type ResolvedPageLayout, resolvePageLayout } from '../layout/LayoutEngine';

export interface PaintPageOptions {
  ctx: CanvasRenderingContext2D;
  pageIndex: number;
  lines: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  scaleFactor: number;
  fontFamily: string;
  renderTextFields?: boolean;
}

type CharacterPositionLines = Array<Pick<LineData, 'text' | 'lineIndex' | 'hasNewline'>>;

interface FontMetrics {
  ascent: number;
  descent: number;
}

const BUILT_IN_BASELINE_PAPER_STYLES = new Set<PaperStyle>([
  'lined',
  'wide-lined',
  'narrow-lined',
  'ruled',
  'wide-ruled',
  'narrow-ruled',
  'cornell',
]);

function measureMainFontMetrics(ctx: CanvasRenderingContext2D, fontSize: number): FontMetrics {
  const sampleMetrics = ctx.measureText('Ajpqy');
  return {
    ascent: sampleMetrics.fontBoundingBoxAscent
      ?? sampleMetrics.actualBoundingBoxAscent
      ?? (fontSize * 0.85),
    descent: sampleMetrics.fontBoundingBoxDescent
      ?? sampleMetrics.actualBoundingBoxDescent
      ?? (fontSize * 0.15),
  };
}

function usesBuiltInPaperLineBaseline(layout: ResolvedPageLayout): boolean {
  return layout.paper.sourceKind === 'preset-built-in'
    && BUILT_IN_BASELINE_PAPER_STYLES.has(layout.paper.style);
}

function resolveLegacyCenteredBaselineOffset(
  layout: ResolvedPageLayout,
  fontMetrics: FontMetrics,
): number {
  return ((layout.writing.lineHeightPx - layout.writing.fontSize) / 2) + fontMetrics.ascent;
}

function resolveLineTopY(layout: ResolvedPageLayout, lineNumber: number): number {
  return layout.writing.firstLineTop + (lineNumber * layout.writing.lineHeightPx);
}

function resolveLineBaselineY(opts: {
  layout: ResolvedPageLayout;
  lineNumber: number;
  fontMetrics: FontMetrics;
}): number {
  const lineTopY = resolveLineTopY(opts.layout, opts.lineNumber);
  if (usesBuiltInPaperLineBaseline(opts.layout)) {
    return lineTopY + opts.layout.writing.lineHeightPx;
  }

  return lineTopY + resolveLegacyCenteredBaselineOffset(opts.layout, opts.fontMetrics);
}

function resolveLineHitbox(opts: {
  layout: ResolvedPageLayout;
  lineNumber: number;
  fontMetrics: FontMetrics;
  baselineY: number;
}): { y: number; height: number } {
  const lineTopY = resolveLineTopY(opts.layout, opts.lineNumber);
  if (!usesBuiltInPaperLineBaseline(opts.layout)) {
    return {
      y: lineTopY,
      height: opts.layout.writing.lineHeightPx,
    };
  }

  return {
    y: opts.baselineY - opts.fontMetrics.ascent,
    height: Math.max(
      opts.layout.writing.lineHeightPx,
      opts.fontMetrics.ascent + opts.fontMetrics.descent,
    ),
  };
}

function buildCharacterPositionsForLines(opts: {
  ctx: CanvasRenderingContext2D;
  lines: CharacterPositionLines;
  layout: ResolvedPageLayout;
  settings: HandwritingSettings;
  fontMetrics: FontMetrics;
  ensureCaretAnchor?: boolean;
}): CharacterPosition[] {
  const {
    ctx,
    lines,
    layout,
    settings,
    fontMetrics,
    ensureCaretAnchor = false,
  } = opts;
  const startX = layout.writing.textBounds.left;
  const fontHeight = fontMetrics.ascent + fontMetrics.descent;

  const positions: CharacterPosition[] = [];

  lines.forEach((line, lineNumber) => {
    const lineText = line.text;
    const lineIndex = line.lineIndex;
    const baselineY = resolveLineBaselineY({ layout, lineNumber, fontMetrics });
    const hitbox = resolveLineHitbox({ layout, lineNumber, fontMetrics, baselineY });
    let currentX = startX;
    let prevEndX = currentX;
    let prevSelectionY = baselineY - fontMetrics.ascent;
    let prevSelectionHeight = fontHeight;
    let prevCursorY = prevSelectionY;
    let prevCursorHeight = prevSelectionHeight;

    for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
      const char = lineText[charIdx];
      const randomData = calculateRandomStyle(charIdx, lineIndex, settings.randomness);
      const spacingGap = randomData.spacing;
      currentX += spacingGap;

      const metrics = ctx.measureText(char);
      const charWidth = metrics.width;

      let selectionY: number;
      let selectionHeight: number;
      let cursorY: number;
      let cursorHeight: number;

      if (char === ' ') {
        selectionY = prevSelectionY;
        selectionHeight = prevSelectionHeight;
        cursorY = prevCursorY;
        cursorHeight = prevCursorHeight;
      } else {
        cursorY = baselineY - fontMetrics.ascent + randomData.baseline;
        cursorHeight = fontHeight;
        selectionY = cursorY;
        selectionHeight = cursorHeight;
        prevSelectionY = selectionY;
        prevSelectionHeight = selectionHeight;
        prevCursorY = cursorY;
        prevCursorHeight = cursorHeight;
      }

      const selectionX = prevEndX;
      const selectionWidth = currentX + charWidth - prevEndX;

      positions.push({
        x: currentX,
        y: hitbox.y,
        width: charWidth,
        height: hitbox.height,
        lineIndex,
        charIndex: charIdx,
        selectionY,
        selectionHeight,
        selectionX,
        selectionWidth,
        cursorY,
        cursorHeight,
      });

      currentX += charWidth;
      prevEndX = currentX;
    }

    if (line.hasNewline) {
      positions.push({
        x: currentX,
        y: hitbox.y,
        width: 0,
        height: hitbox.height,
        lineIndex,
        charIndex: lineText.length,
        selectionY: baselineY - fontMetrics.ascent,
        selectionHeight: fontHeight,
        selectionX: currentX,
        selectionWidth: 0,
        cursorY: baselineY - fontMetrics.ascent,
        cursorHeight: fontHeight,
      });
    }
  });

  if (ensureCaretAnchor && positions.length === 0) {
    const baselineY = resolveLineBaselineY({ layout, lineNumber: 0, fontMetrics });
    const hitbox = resolveLineHitbox({ layout, lineNumber: 0, fontMetrics, baselineY });
    positions.push({
      x: startX,
      y: hitbox.y,
      width: 0,
      height: hitbox.height,
      lineIndex: 0,
      charIndex: 0,
      selectionY: baselineY - fontMetrics.ascent,
      selectionHeight: fontHeight,
      selectionX: startX,
      selectionWidth: 0,
      cursorY: baselineY - fontMetrics.ascent,
      cursorHeight: fontHeight,
    });
  }

  return positions;
}

/**
 * UnifiedPagePainter - A single rendering engine used for both preview and export.
 * Accepts a CanvasRenderingContext2D and draws background, paper lines, text, and text fields.
 * Resolution-independent: uses a scaleFactor so the same code renders at any DPI.
 */
export const UnifiedPagePainter = {
  paintPage(opts: PaintPageOptions): void {
    const { ctx, pageIndex, lines, pageSettings, settings, fontFamily, renderTextFields = true } = opts;
    const resolvedLayout = resolvePageLayout({
      pageIndex,
      settings,
      pageSettings,
    });
    const { page, paper, writing } = resolvedLayout;
    const { width: pageWidth, height: pageHeight } = page;

    // 1. Draw background
    if (paper.background.kind === 'solid-color') {
      ctx.fillStyle = paper.background.color;
      ctx.fillRect(0, 0, pageWidth, pageHeight);
    }
    // Note: custom background images are drawn asynchronously via drawBackgroundImage()

    // 2. Draw paper lines
    if (paper.guides.kind !== 'none') {
      this._drawPaperGuides(ctx, resolvedLayout);
    }

    // 3. Draw main text
    ctx.font = `${writing.fontSize}px ${fontFamily}`;
    ctx.fillStyle = pageSettings.inkColor;
    ctx.textBaseline = 'alphabetic';

    const fontMetrics = measureMainFontMetrics(ctx, writing.fontSize);

    ctx.save();
    const tilt = resolveEffectiveLineTilt(resolvedLayout, pageSettings);
    if (tilt !== 0) {
      ctx.rotate((tilt * Math.PI) / 180);
    }

    lines.forEach((line, lineNumber) => {
      const baselineY = resolveLineBaselineY({
        layout: resolvedLayout,
        lineNumber,
        fontMetrics,
      });
      this._drawTextLine(
        ctx,
        line.text,
        line.lineIndex,
        writing.textBounds.left,
        baselineY,
        settings,
      );
    });
    ctx.restore();

    // 4. Draw text fields
    if (renderTextFields && pageSettings.textFields && pageSettings.textFields.length > 0) {
      this._drawTextFields(ctx, pageSettings.textFields, fontFamily, settings.randomness);
    }
  },

  _drawTextFields(
    ctx: CanvasRenderingContext2D,
    textFields: TextField[],
    fontFamily: string,
    randomness: HandwritingSettings['randomness'],
  ): void {
    ctx.save();
    ctx.textBaseline = 'alphabetic'; // Changed to match main text rendering
    
    textFields.forEach((field, fieldIdx) => {
      ctx.fillStyle = field.color;
      ctx.font = `${field.fontSize}px ${fontFamily}`;
      
      const lines = field.text.split('\n');
      const lineHeight = field.fontSize * 1.2;
      
      // Calculate font ascent for vertical positioning
      // (Simplified similar to buildCharacterPositionsForLines)
      const sampleMetrics = ctx.measureText('Ajpqy');
      const fontAscent = sampleMetrics.fontBoundingBoxAscent
        ?? sampleMetrics.actualBoundingBoxAscent
        ?? (field.fontSize * 0.85);

      lines.forEach((lineText, lineInFieldIdx) => {
        const lineY = field.y + (lineInFieldIdx * lineHeight) + fontAscent;
        let currentX = field.x;
        
        // Use a unique line index for each line in each field to avoid repeating patterns
        const lineIndexForSeed = (fieldIdx + 1) * 1000 + lineInFieldIdx;

        for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
          const char = lineText[charIdx];
          const randomData = calculateRandomStyle(charIdx, lineIndexForSeed, randomness);

          currentX += randomData.spacing;

          if (char !== ' ') {
            ctx.save();
            ctx.translate(currentX, lineY + randomData.baseline);

            if (randomData.rotation !== 0) {
              ctx.rotate((randomData.rotation * Math.PI) / 180);
            }

            ctx.fillText(char, 0, 0);
            ctx.restore();
          }

          currentX += ctx.measureText(char).width;
        }
      });
    });
    ctx.restore();
  },

  _drawTextLine(
    ctx: CanvasRenderingContext2D,
    lineText: string,
    lineIndex: number,
    startX: number,
    baselineY: number,
    settings: HandwritingSettings,
  ): void {
    let currentX = startX;

    for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
      const char = lineText[charIdx];
      const randomData = calculateRandomStyle(charIdx, lineIndex, settings.randomness);

      currentX += randomData.spacing;

      if (char !== ' ') {
        ctx.save();
        ctx.translate(currentX, baselineY + randomData.baseline);

        if (randomData.rotation !== 0) {
          ctx.rotate((randomData.rotation * Math.PI) / 180);
        }

        ctx.fillText(char, 0, 0);
        ctx.restore();
      }

      currentX += ctx.measureText(char).width;
    }
  },

  _drawPaperGuides(
    ctx: CanvasRenderingContext2D,
    resolvedLayout: ResolvedPageLayout,
  ): void {
    const { page, paper, writing } = resolvedLayout;
    const { guides } = paper;
    const { contentBounds, lineHeightPx, linesPerPage } = writing;
    const contentHeight = contentBounds.height;
    const contentWidth = contentBounds.width;

    if (guides.kind === 'none') {
      return;
    }

    ctx.strokeStyle = guides.lineColor;
    ctx.lineWidth = 1;

    if (guides.kind === 'lined' || guides.kind === 'ruled') {
      for (let i = 0; i <= linesPerPage; i++) {
        const y = contentBounds.top + i * lineHeightPx;
        if (y < contentBounds.bottom + lineHeightPx) {
          ctx.beginPath();
          ctx.moveTo(contentBounds.left, y);
          ctx.lineTo(contentBounds.left + contentWidth, y);
          ctx.stroke();
        }
      }

      if (guides.kind === 'ruled') {
        ctx.strokeStyle = guides.marginLineColor;
        ctx.lineWidth = guides.marginLineWidth;
        ctx.beginPath();
        ctx.moveTo(guides.marginLineX, 0);
        ctx.lineTo(guides.marginLineX, page.height);
        ctx.stroke();
      }
    } else if (guides.kind === 'grid') {
      ctx.globalAlpha = guides.alpha;
      for (let i = 0; i <= linesPerPage; i++) {
        const y = contentBounds.top + i * lineHeightPx;
        ctx.beginPath();
        ctx.moveTo(contentBounds.left, y);
        ctx.lineTo(contentBounds.left + contentWidth, y);
        ctx.stroke();
      }
      const cols = Math.floor(contentWidth / lineHeightPx);
      for (let j = 0; j <= cols; j++) {
        const x = contentBounds.left + j * lineHeightPx;
        ctx.beginPath();
        ctx.moveTo(x, contentBounds.top);
        ctx.lineTo(x, contentBounds.top + contentHeight);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  },

  /**
   * Compute the bounding box of each character on the page for hit-testing
   * and overlay drawing (cursor/selection). Returns positions in page-coordinate space.
   */
  computeCharacterPositions(opts: {
    ctx: CanvasRenderingContext2D;
    lines: LineData[];
    pageSettings: PageSettings;
    settings: HandwritingSettings;
    fontFamily: string;
    pageIndex?: number;
  }): {
    mainPositions: CharacterPosition[];
  } {
    const {
      ctx,
      lines,
      pageSettings,
      settings,
      fontFamily,
      pageIndex = 0,
    } = opts;
    const resolvedLayout = resolvePageLayout({
      pageIndex,
      settings,
      pageSettings,
    });

    ctx.font = `${resolvedLayout.writing.fontSize}px ${fontFamily}`;

    const fontMetrics = measureMainFontMetrics(ctx, resolvedLayout.writing.fontSize);

    const mainPositions = buildCharacterPositionsForLines({
      ctx,
      lines,
      layout: resolvedLayout,
      settings,
      fontMetrics,
      // Ensure we have at least one position (anchor) even if the page is empty 
      // so that the blinking caret can be rendered.
      ensureCaretAnchor: true,
    });
    return { mainPositions };
  },

  /**
   * Draw a blinking cursor at the given character position index.
   * cursorIndex is the caret position (0 = before first char, N = after Nth char).
   */
  paintCursorOverlay(
    ctx: CanvasRenderingContext2D,
    charPositions: CharacterPosition[],
    cursorIndex: number,
    inkColor: string,
    lineTilt: number = 0,
  ): void {
    if (charPositions.length === 0) return;

    let cursorX: number;
    let cursorY: number;
    let cursorHeight: number;

    if (cursorIndex <= 0) {
      // Before first character
      const first = charPositions[0];
      cursorX = first.x;
      cursorY = first.cursorY ?? first.selectionY ?? first.y;
      cursorHeight = first.cursorHeight ?? first.selectionHeight ?? first.height;
    } else if (cursorIndex >= charPositions.length) {
      // After last character
      const last = charPositions.at(-1)!;
      cursorX = last.x + last.width;
      cursorY = last.cursorY ?? last.selectionY ?? last.y;
      cursorHeight = last.cursorHeight ?? last.selectionHeight ?? last.height;
    } else {
      // Between characters: position at the left edge of the character at cursorIndex
      const pos = charPositions[cursorIndex];
      cursorX = pos.x;
      cursorY = pos.cursorY ?? pos.selectionY ?? pos.y;
      cursorHeight = pos.cursorHeight ?? pos.selectionHeight ?? pos.height;
    }

    ctx.save();
    if (lineTilt !== 0) {
      ctx.rotate((lineTilt * Math.PI) / 180);
    }
    ctx.fillStyle = inkColor;
    ctx.fillRect(cursorX, cursorY, 2, cursorHeight);
    ctx.restore();
  },

  /**
   * Draw selection highlight rectangles for the given character range.
   * selStart and selEnd are character indices (0-based, exclusive end).
   */
  paintSelectionOverlay(
    ctx: CanvasRenderingContext2D,
    charPositions: CharacterPosition[],
    selStart: number,
    selEnd: number,
    inkColor: string,
    lineTilt: number = 0,
  ): void {
    if (selStart >= selEnd) return;

    ctx.save();
    if (lineTilt !== 0) {
      ctx.rotate((lineTilt * Math.PI) / 180);
    }
    ctx.fillStyle = 'rgba(0, 122, 255, 0.35)'; // Native-like selection blue
    ctx.globalAlpha = 1;

    // Draw per-character rects using the new selection dimensions
    for (let i = Math.max(0, selStart); i < Math.min(selEnd, charPositions.length); i++) {
      const pos = charPositions[i];
      const rectX = pos.selectionX ?? pos.x;
      const rectY = pos.selectionY ?? pos.y;
      const rectWidth = pos.selectionWidth ?? pos.width;
      const rectHeight = pos.selectionHeight ?? pos.height;

      if (rectWidth > 0 && rectHeight > 0) {
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      }
    }

    ctx.restore();
  },
};

export function resolveEffectiveLineTilt(
  resolvedLayout: ResolvedPageLayout,
  pageSettings: Pick<PageSettings, 'lineTilt'>,
): number {
  return resolvedLayout.paper.sourceKind === 'upload-backed'
    ? pageSettings.lineTilt || 0
    : 0;
}

export interface CharacterPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  lineIndex: number;
  charIndex: number;
  selectionY?: number;
  selectionHeight?: number;
  selectionX?: number;
  selectionWidth?: number;
  cursorY?: number;
  cursorHeight?: number;
}
