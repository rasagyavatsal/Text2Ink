import { HandwritingSettings, PageSettings, TextField } from '../types';
import { LineData } from '../editorHelpers';
import { resolvePageLayout, type ResolvedPageLayout } from '../pageLayout';

export interface PaintPageOptions {
  ctx: CanvasRenderingContext2D;
  pageIndex: number;
  lines: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  scaleFactor: number;
  fontFamily: string;
  renderTextFields?: boolean;
  renderBodyText?: boolean;
}

type CharacterPositionLines = Array<Pick<LineData, 'text' | 'lineIndex' | 'hasNewline'>>;

function buildCharacterPositionsForLines(opts: {
  ctx: CanvasRenderingContext2D;
  lines: CharacterPositionLines;
  startX: number;
  startY: number;
  verticalCenteringOffset: number;
  pageLineHeightPx: number;
  fontAscent: number;
  fontDescent: number;
  ensureCaretAnchor?: boolean;
}): CharacterPosition[] {
  const {
    ctx,
    lines,
    startX,
    startY,
    verticalCenteringOffset,
    pageLineHeightPx,
    fontAscent,
    fontDescent,
    ensureCaretAnchor = false,
  } = opts;

  const positions: CharacterPosition[] = [];
  let currentLineY = startY;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx].text;
    const lineIndex = lines[lineIdx].lineIndex;
    let currentX = startX;
    let prevEndX = currentX;
    let prevSelectionY = currentLineY + verticalCenteringOffset - fontAscent;
    let prevSelectionHeight = fontAscent + fontDescent;
    let prevCursorY = prevSelectionY;
    let prevCursorHeight = prevSelectionHeight;

    for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
      const char = lineText[charIdx];
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
        cursorY = currentLineY + verticalCenteringOffset - fontAscent;
        cursorHeight = fontAscent + fontDescent;
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
        y: currentLineY,
        width: charWidth,
        height: pageLineHeightPx,
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

    if (lines[lineIdx].hasNewline) {
      positions.push({
        x: currentX,
        y: currentLineY,
        width: 0,
        height: pageLineHeightPx,
        lineIndex,
        charIndex: lineText.length,
        selectionY: currentLineY + verticalCenteringOffset - fontAscent,
        selectionHeight: fontAscent + fontDescent,
        selectionX: currentX,
        selectionWidth: 0,
        cursorY: currentLineY + verticalCenteringOffset - fontAscent,
        cursorHeight: fontAscent + fontDescent,
      });
    }

    currentLineY += pageLineHeightPx;
  }

  if (ensureCaretAnchor && positions.length === 0) {
    positions.push({
      x: startX,
      y: startY,
      width: 0,
      height: pageLineHeightPx,
      lineIndex: 0,
      charIndex: 0,
      selectionY: startY + verticalCenteringOffset - fontAscent,
      selectionHeight: fontAscent + fontDescent,
      selectionX: startX,
      selectionWidth: 0,
      cursorY: startY + verticalCenteringOffset - fontAscent,
      cursorHeight: fontAscent + fontDescent,
    });
  }

  return positions;
}

/**
 * Canvas support for the interactive preview layer.
 * Export no longer uses this painter; DOM export captures the rendered page tree.
 */
export const UnifiedPagePainter = {
  paintPage(opts: PaintPageOptions): void {
    const { ctx, pageIndex, lines, pageSettings, settings, fontFamily, renderTextFields = true, renderBodyText = true } = opts;
    const layout = resolvePageLayout({ settings, pageSettings, pageIndex });

    // 1. Draw background
    const customBg = layout.customBackgroundImage;
    if (!customBg) {
      ctx.fillStyle = layout.paperTemplate?.tone ?? pageSettings.paperColor;
      ctx.fillRect(0, 0, layout.width, layout.height);
    }
    // Note: custom background images are drawn asynchronously via drawBackgroundImage()

    // 2. Draw paper lines
    if (!customBg && layout.paperTemplate?.kind !== 'blank') {
      this._drawPaperTemplate(ctx, layout);
    }

    // 3. Draw main text
    const pageLineHeightPx = layout.lineSpacing;
    const ruledTextLeft = layout.writingBox.x;

    ctx.font = `${pageSettings.fontSize}px ${fontFamily}`;
    ctx.fillStyle = pageSettings.inkColor;
    ctx.textBaseline = 'alphabetic';

    // Compute vertical centering offset
    const halfLeading = (pageLineHeightPx - pageSettings.fontSize) / 2;
    const sampleMetrics = ctx.measureText('Ajpqy');
    const fontAscent = sampleMetrics.fontBoundingBoxAscent
      ?? sampleMetrics.actualBoundingBoxAscent
      ?? (pageSettings.fontSize * 0.85);
    const verticalCenteringOffset = halfLeading + fontAscent;

    ctx.save();
    const tilt = pageSettings.lineTilt || 0;
    if (tilt !== 0) {
      ctx.rotate((tilt * Math.PI) / 180);
    }

    if (renderBodyText) {
      let currentLineY = layout.writingBox.y;
      for (let i = 0; i < lines.length; i++) {
        this._drawTextLine(ctx, lines[i].text, ruledTextLeft, currentLineY, verticalCenteringOffset);
        currentLineY += pageLineHeightPx;
      }
    }
    ctx.restore();

    // 4. Draw text fields
    if (renderTextFields && pageSettings.textFields && pageSettings.textFields.length > 0) {
      this._drawTextFields(ctx, pageSettings.textFields, fontFamily);
    }
  },

  _drawTextFields(
    ctx: CanvasRenderingContext2D,
    textFields: TextField[],
    fontFamily: string,
  ): void {
    ctx.save();
    ctx.textBaseline = 'alphabetic'; // Changed to match main text rendering
    
    textFields.forEach((field) => {
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
        ctx.fillText(lineText, field.x, lineY);
      });
    });
    ctx.restore();
  },

  _drawTextLine(
    ctx: CanvasRenderingContext2D,
    lineText: string,
    startX: number,
    startY: number,
    verticalCenteringOffset: number,
  ): void {
    let currentX = startX;

    for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
      const char = lineText[charIdx];

      if (char !== ' ') {
        ctx.fillText(char, currentX, startY + verticalCenteringOffset);
      }

      currentX += ctx.measureText(char).width;
    }
  },

  _drawPaperTemplate(
    ctx: CanvasRenderingContext2D,
    layout: ResolvedPageLayout,
  ): void {
    const template = layout.paperTemplate;
    if (!template || template.kind === 'blank') return;

    const box = layout.writingBox;
    const lineHeightPx = layout.lineSpacing;
    const linesPerPage = Math.max(1, Math.floor(box.height / lineHeightPx));

    ctx.strokeStyle = template.lineColor ?? '#a8d4f0';
    ctx.lineWidth = 1;

    if (template.kind === 'ruled') {
      for (let i = 0; i <= linesPerPage; i++) {
        const y = box.y + i * lineHeightPx;
        if (y < box.y + box.height + lineHeightPx) {
          ctx.beginPath();
          ctx.moveTo(box.x, y);
          ctx.lineTo(box.x + box.width, y);
          ctx.stroke();
        }
      }

      if (template.accentColor) {
        ctx.strokeStyle = template.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const marginX = Math.max(20, box.x - 18);
        ctx.moveTo(marginX, box.y);
        ctx.lineTo(marginX, box.y + box.height);
        ctx.stroke();
      }
    } else if (template.kind === 'graph') {
      ctx.globalAlpha = 0.5;
      for (let i = 0; i <= linesPerPage; i++) {
        const y = box.y + i * lineHeightPx;
        ctx.beginPath();
        ctx.moveTo(box.x, y);
        ctx.lineTo(box.x + box.width, y);
        ctx.stroke();
      }
      const cols = Math.floor(box.width / lineHeightPx);
      for (let j = 0; j <= cols; j++) {
        const x = box.x + j * lineHeightPx;
        ctx.beginPath();
        ctx.moveTo(x, box.y);
        ctx.lineTo(x, box.y + box.height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    } else if (template.kind === 'dot-grid') {
      ctx.fillStyle = template.lineColor ?? '#9aa7b0';
      ctx.globalAlpha = 0.55;
      for (let y = box.y; y <= box.y + box.height; y += lineHeightPx) {
        for (let x = box.x; x <= box.x + box.width; x += lineHeightPx) {
          if (ctx.arc && ctx.fill) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1.0;
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

    const layout = resolvePageLayout({ settings, pageSettings, pageIndex });
    const pageLineHeightPx = layout.lineSpacing;
    const ruledTextLeft = layout.writingBox.x;

    ctx.font = `${pageSettings.fontSize}px ${fontFamily}`;

    // Measure font metrics once for fallback
    const sampleMetrics = ctx.measureText('Ajpqy');
    const fontAscent = sampleMetrics.fontBoundingBoxAscent
      ?? sampleMetrics.actualBoundingBoxAscent
      ?? (pageSettings.fontSize * 0.85);
    const fontDescent = sampleMetrics.fontBoundingBoxDescent
      ?? sampleMetrics.actualBoundingBoxDescent
      ?? (pageSettings.fontSize * 0.15);

    // Compute vertical centering offset (matches _drawTextLine logic)
    const halfLeading = (pageLineHeightPx - pageSettings.fontSize) / 2;
    const verticalCenteringOffset = halfLeading + fontAscent;

    const mainPositions = buildCharacterPositionsForLines({
      ctx,
      lines,
      startX: ruledTextLeft,
      startY: layout.writingBox.y,
      verticalCenteringOffset,
      pageLineHeightPx,
      fontAscent,
      fontDescent,
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
      const last = charPositions[charPositions.length - 1];
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
