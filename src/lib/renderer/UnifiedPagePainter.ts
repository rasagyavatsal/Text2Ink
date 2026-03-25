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
  }): CharacterPosition[] {
    const { ctx, lines, pageSettings, settings, fontFamily } = opts;
    if (lines.length === 0) return [];

    const customBg = settings.customBackgroundImages?.[0] ?? settings.customBackgroundImage;
    const pageLineOffset = customBg ? (pageSettings.customLineOffset ?? 0) : 0;
    const baseLineHeightPx = pageSettings.fontSize * settings.lineHeight;
    const pageLineHeightPx = (customBg && pageSettings.customLineSpacing)
      ? pageSettings.customLineSpacing
      : baseLineHeightPx;

    const ruledTextLeft = (settings.paperStyle === 'ruled' && !customBg)
      ? pageSettings.marginLeft + settings.ruledMarginLineOffset + 10
      : pageSettings.marginLeft;

    ctx.font = `${pageSettings.fontSize}px ${fontFamily}`;

    const positions: CharacterPosition[] = [];
    const textTopOffset = Math.max(0, (pageLineHeightPx - pageSettings.fontSize) / 2);
    let currentLineY = pageSettings.marginTop + pageLineOffset;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx].text;
      const lineIndex = lines[lineIdx].lineIndex;
      let currentX = ruledTextLeft;

      for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
        const char = lineText[charIdx];
        const randomData = calculateRandomStyle(charIdx, lineIndex, settings.randomness);
        currentX += randomData.spacing;

        const charWidth = ctx.measureText(char).width;
        positions.push({
          x: currentX,
          y: currentLineY,
          width: charWidth,
          height: pageLineHeightPx,
          lineIndex: lineIdx,
          charIndex: charIdx,
          selectionY: currentLineY + textTopOffset,
          selectionHeight: Math.min(pageLineHeightPx, pageSettings.fontSize),
        });

        currentX += charWidth;
      }

      if (lines[lineIdx].hasNewline) {
        positions.push({
          x: currentX,
          y: currentLineY,
          width: 0,
          height: pageLineHeightPx,
          lineIndex: lineIdx,
          charIndex: lineText.length,
          selectionY: currentLineY + textTopOffset,
          selectionHeight: Math.min(pageLineHeightPx, pageSettings.fontSize),
        });
      }

      currentLineY += pageLineHeightPx;
    }

    return positions;
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

    let runStart = Math.max(0, selStart);
    while (runStart < selEnd && runStart < charPositions.length) {
      const startPos = charPositions[runStart];
      let runEnd = runStart + 1;

      while (
        runEnd < selEnd &&
        runEnd < charPositions.length &&
        charPositions[runEnd].lineIndex === startPos.lineIndex
      ) {
        runEnd += 1;
      }

      const lastPos = charPositions[runEnd - 1];
      const runX = startPos.x;
      const runY = startPos.selectionY ?? startPos.y;
      const runWidth = Math.max(0, (lastPos.x + lastPos.width) - runX);
      const runHeight = Math.max(
        startPos.selectionHeight ?? startPos.height,
        lastPos.selectionHeight ?? lastPos.height,
      );

      if (runWidth > 0) {
        ctx.fillRect(runX, runY, runWidth, runHeight);
      }

      runStart = runEnd;
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
}
