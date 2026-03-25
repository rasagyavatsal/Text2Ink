import { HandwritingSettings, PageSettings, TextField } from '../types';
import { LineData, calculateRandomStyle } from '../editorHelpers';
import { PAGE_WIDTH, PAGE_HEIGHT } from '../pageConstants';

export interface PaintPageOptions {
  ctx: CanvasRenderingContext2D;
  pageIndex: number;
  lines: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  textFields: TextField[];
  scaleFactor: number;
  fontFamily: string;
}

type CharacterPositionLines = Array<Pick<LineData, 'text' | 'lineIndex' | 'hasNewline'>>;

function buildCharacterPositionsForLines(opts: {
  ctx: CanvasRenderingContext2D;
  lines: CharacterPositionLines;
  startX: number;
  startY: number;
  verticalCenteringOffset: number;
  pageLineHeightPx: number;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
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
    pageSettings,
    settings,
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

    for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
      const char = lineText[charIdx];
      const randomData = calculateRandomStyle(charIdx, lineIndex, settings.randomness);
      const spacingGap = randomData.spacing;
      currentX += spacingGap;

      const metrics = ctx.measureText(char);
      const charWidth = metrics.width;

      const actualBoundingBoxAscent = metrics.actualBoundingBoxAscent ?? fontAscent;
      const actualBoundingBoxDescent = metrics.actualBoundingBoxDescent ?? fontDescent;

      let selectionY: number;
      let selectionHeight: number;

      if (char === ' ') {
        selectionY = prevSelectionY;
        selectionHeight = prevSelectionHeight;
      } else {
        selectionY = currentLineY + verticalCenteringOffset - actualBoundingBoxAscent + randomData.baseline;
        selectionHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
        prevSelectionY = selectionY;
        prevSelectionHeight = selectionHeight;
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
        selectionY: currentLineY + (pageLineHeightPx - pageSettings.fontSize) / 2,
        selectionHeight: Math.min(pageLineHeightPx, pageSettings.fontSize),
        selectionX: currentX,
        selectionWidth: 0,
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
      selectionY: startY + (pageLineHeightPx - pageSettings.fontSize) / 2,
      selectionHeight: Math.min(pageLineHeightPx, pageSettings.fontSize),
      selectionX: startX,
      selectionWidth: 0,
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
    const { ctx, pageIndex, lines, pageSettings, settings, textFields, fontFamily } = opts;

    // 1. Draw background
    const customBg = settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage;
    if (!customBg) {
      ctx.fillStyle = pageSettings.paperColor;
      ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    }
    // Note: custom background images are drawn asynchronously via drawBackgroundImage()

    // 2. Draw paper lines
    if (!customBg && settings.paperStyle !== 'blank') {
      this._drawPaperLines(ctx, pageSettings, settings);
    }

    // 3. Draw main text
    const pageLineOffset = customBg ? (pageSettings.customLineOffset ?? 0) : 0;
    const baseLineHeightPx = pageSettings.fontSize * settings.lineHeight;
    const pageLineHeightPx = (customBg && pageSettings.customLineSpacing)
      ? pageSettings.customLineSpacing
      : baseLineHeightPx;

    const ruledTextLeft = (settings.paperStyle === 'ruled' && !customBg)
      ? pageSettings.marginLeft + settings.ruledMarginLineOffset + 10
      : pageSettings.marginLeft;

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

    let currentLineY = pageSettings.marginTop + pageLineOffset;
    for (let i = 0; i < lines.length; i++) {
      this._drawTextLine(ctx, lines[i].text, lines[i].lineIndex, ruledTextLeft, currentLineY, verticalCenteringOffset, pageSettings, settings);
      currentLineY += pageLineHeightPx;
    }

    // 4. Draw text fields
    for (const tf of textFields) {
      if (tf.pageIndex !== pageIndex) continue;

      ctx.font = `${pageSettings.fontSize}px ${fontFamily}`;
      ctx.fillStyle = tf.inkColor || pageSettings.inkColor;

      const tfLines = tf.text.split('\n');
      let tfY = tf.y;
      for (let i = 0; i < tfLines.length; i++) {
        this._drawTextLine(ctx, tfLines[i], 10000 + i, tf.x, tfY, verticalCenteringOffset, pageSettings, settings);
        tfY += pageLineHeightPx;
      }
    }
  },

  _drawTextLine(
    ctx: CanvasRenderingContext2D,
    lineText: string,
    lineIndex: number,
    startX: number,
    startY: number,
    verticalCenteringOffset: number,
    pageSettings: PageSettings,
    settings: HandwritingSettings,
  ): void {
    let currentX = startX;
    const tilt = pageSettings.lineTilt || 0;

    for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
      const char = lineText[charIdx];
      const randomData = calculateRandomStyle(charIdx, lineIndex, settings.randomness);

      currentX += randomData.spacing;

      if (char !== ' ') {
        ctx.save();
        ctx.translate(currentX, startY + verticalCenteringOffset + randomData.baseline);

        if (tilt !== 0) {
          ctx.rotate((tilt * Math.PI) / 180);
        }
        if (randomData.rotation !== 0) {
          ctx.rotate((randomData.rotation * Math.PI) / 180);
        }

        ctx.fillText(char, 0, 0);
        ctx.restore();
      }

      currentX += ctx.measureText(char).width;
    }
  },

  _drawPaperLines(
    ctx: CanvasRenderingContext2D,
    ps: PageSettings,
    settings: HandwritingSettings,
  ): void {
    const contentWidth = PAGE_WIDTH - ps.marginLeft - ps.marginRight;
    const contentHeight = PAGE_HEIGHT - ps.marginTop - ps.marginBottom;
    const baseLineHeightPx = ps.fontSize * settings.lineHeight;
    const lineHeightPx = ps.customLineSpacing ? ps.customLineSpacing : baseLineHeightPx;
    const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeightPx));

    ctx.strokeStyle = settings.lineColor;
    ctx.lineWidth = 1;

    if (settings.paperStyle === 'lined' || settings.paperStyle === 'ruled') {
      for (let i = 0; i <= linesPerPage; i++) {
        const y = ps.marginTop + i * lineHeightPx;
        if (y < PAGE_HEIGHT - ps.marginBottom + lineHeightPx) {
          ctx.beginPath();
          ctx.moveTo(ps.marginLeft, y);
          ctx.lineTo(ps.marginLeft + contentWidth, y);
          ctx.stroke();
        }
      }

      if (settings.paperStyle === 'ruled') {
        ctx.strokeStyle = '#ffb3b3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ps.marginLeft + settings.ruledMarginLineOffset, ps.marginTop);
        ctx.lineTo(ps.marginLeft + settings.ruledMarginLineOffset, ps.marginTop + contentHeight);
        ctx.stroke();
      }
    } else if (settings.paperStyle === 'grid') {
      ctx.globalAlpha = 0.5;
      for (let i = 0; i <= linesPerPage; i++) {
        const y = ps.marginTop + i * lineHeightPx;
        ctx.beginPath();
        ctx.moveTo(ps.marginLeft, y);
        ctx.lineTo(ps.marginLeft + contentWidth, y);
        ctx.stroke();
      }
      const cols = Math.floor(contentWidth / lineHeightPx);
      for (let j = 0; j <= cols; j++) {
        const x = ps.marginLeft + j * lineHeightPx;
        ctx.beginPath();
        ctx.moveTo(x, ps.marginTop);
        ctx.lineTo(x, ps.marginTop + contentHeight);
        ctx.stroke();
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
    textFields?: TextField[];
  }): {
    mainPositions: CharacterPosition[];
    textFieldPositions: Map<string, CharacterPosition[]>;
  } {
    const {
      ctx,
      lines,
      pageSettings,
      settings,
      fontFamily,
      pageIndex = 0,
      textFields = [],
    } = opts;

    const customBg = settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage;
    const pageLineOffset = customBg ? (pageSettings.customLineOffset ?? 0) : 0;
    const baseLineHeightPx = pageSettings.fontSize * settings.lineHeight;
    const pageLineHeightPx = (customBg && pageSettings.customLineSpacing)
      ? pageSettings.customLineSpacing
      : baseLineHeightPx;

    const ruledTextLeft = (settings.paperStyle === 'ruled' && !customBg)
      ? pageSettings.marginLeft + settings.ruledMarginLineOffset + 10
      : pageSettings.marginLeft;

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
      startY: pageSettings.marginTop + pageLineOffset,
      verticalCenteringOffset,
      pageLineHeightPx,
      pageSettings,
      settings,
      fontAscent,
      fontDescent,
    });

    const textFieldPositions = new Map<string, CharacterPosition[]>();
    for (const tf of textFields) {
      if (tf.pageIndex !== pageIndex) continue;

      const tfLines: CharacterPositionLines = tf.text.split('\n').map((lineText, lineIdx, allLines) => ({
        text: lineText,
        lineIndex: 10000 + lineIdx,
        hasNewline: lineIdx < allLines.length - 1,
      }));

      textFieldPositions.set(
        tf.id,
        buildCharacterPositionsForLines({
          ctx,
          lines: tfLines,
          startX: tf.x,
          startY: tf.y,
          verticalCenteringOffset,
          pageLineHeightPx,
          pageSettings,
          settings,
          fontAscent,
          fontDescent,
          ensureCaretAnchor: true,
        }),
      );
    }

    return { mainPositions, textFieldPositions };
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
  ): void {
    if (charPositions.length === 0) return;

    let cursorX: number;
    let cursorY: number;
    let cursorHeight: number;

    if (cursorIndex <= 0) {
      // Before first character
      const first = charPositions[0];
      cursorX = first.x;
      cursorY = first.y;
      cursorHeight = first.height;
    } else if (cursorIndex >= charPositions.length) {
      // After last character
      const last = charPositions[charPositions.length - 1];
      cursorX = last.x + last.width;
      cursorY = last.y;
      cursorHeight = last.height;
    } else {
      // Between characters: position at the left edge of the character at cursorIndex
      const pos = charPositions[cursorIndex];
      cursorX = pos.x;
      cursorY = pos.y;
      cursorHeight = pos.height;
    }

    ctx.fillStyle = inkColor;
    ctx.fillRect(cursorX, cursorY, 2, cursorHeight);
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
  ): void {
    if (selStart >= selEnd) return;

    ctx.save();
    ctx.fillStyle = `${inkColor}33`; // Semi-transparent
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
}
