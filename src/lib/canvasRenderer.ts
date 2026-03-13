import { HandwritingSettings, PageSettings, TextField, HANDWRITING_FONTS } from './types';
import { LineData, calculateRandomStyle } from './editorHelpers';
import { PAGE_WIDTH, PAGE_HEIGHT } from './pageConstants';

interface RenderPageOptions {
  canvas: HTMLCanvasElement;
  pageIndex: number;
  lines: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  textFields: TextField[];
  scale: number;
  fontFamily: string; // The resolved font family string
}

export async function renderPageToCanvas({
  canvas,
  pageIndex,
  lines,
  pageSettings,
  settings,
  textFields,
  scale,
  fontFamily,
}: RenderPageOptions): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Setup Canvas Size
  canvas.width = PAGE_WIDTH * scale;
  canvas.height = PAGE_HEIGHT * scale;
  ctx.scale(scale, scale);

  // 2. Draw Background
  const customBg = settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage;
  if (customBg) {
    const img = await loadImage(customBg);
    ctx.drawImage(img, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  } else {
    ctx.fillStyle = pageSettings.paperColor;
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }

  // 3. Draw Paper Lines
  if (!customBg && settings.paperStyle !== 'blank') {
    drawPaperLines(ctx, pageSettings, settings);
  }

  // 4. Draw Main Text
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
  // Use top baseline to better match CSS line-height behavior
  ctx.textBaseline = 'top';

  let currentLineY = pageSettings.marginTop + pageLineOffset;

  // In CSS, line-height centers the text vertically within the line box.
  // We calculate the exact vertical offset needed to push the 'top' baseline 
  // down so it sits in the middle of our calculated line height.
  const measure = ctx.measureText('Ajpqy'); // Measure tall and descending characters
  const textHeight = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
  
  // The extra space in the line box, divided by 2 to center it
  const verticalCenteringOffset = Math.max(0, (pageLineHeightPx - textHeight) / 2);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineIndex = line.lineIndex;
    
    // y is the top of the line box + the centering offset
    const y = currentLineY + verticalCenteringOffset;
    
    let currentX = ruledTextLeft;

    for (let charIdx = 0; charIdx < line.text.length; charIdx++) {
      const char = line.text[charIdx];
      const randomStyle = calculateRandomStyle(charIdx, lineIndex, settings.randomness);
      
      const spacingOffset = parseFloat(randomStyle.marginLeft as string || '0');
      const transform = randomStyle.transform as string;
      
      let translateY = 0;
      let rotateDeg = 0;
      
      if (transform && transform !== 'none') {
        const translateMatch = transform.match(/translateY\((.*?)px\)/);
        const rotateMatch = transform.match(/rotate\((.*?)deg\)/);
        if (translateMatch) translateY = parseFloat(translateMatch[1]);
        if (rotateMatch) rotateDeg = parseFloat(rotateMatch[1]);
      }

      currentX += spacingOffset;

      if (char !== ' ') {
        ctx.save();
        ctx.translate(currentX, y + translateY);
        if (rotateDeg !== 0) {
          ctx.rotate((rotateDeg * Math.PI) / 180);
        }
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
      
      currentX += ctx.measureText(char).width;
    }
    
    currentLineY += pageLineHeightPx;
  }

  // 5. Draw Text Fields
  for (const tf of textFields) {
    if (tf.pageIndex !== pageIndex) continue;
    
    ctx.font = `${pageSettings.fontSize}px ${fontFamily}`;
    ctx.fillStyle = tf.inkColor || pageSettings.inkColor;
    ctx.textBaseline = 'top';
    
    // Simplified text field rendering (single line for now, or split by \n)
    const tfLines = tf.text.split('\n');
    let tfY = tf.y;
    for (const tfLine of tfLines) {
      ctx.fillText(tfLine, tf.x, tfY + verticalCenteringOffset);
      tfY += pageLineHeightPx;
    }
  }
}

function drawPaperLines(
  ctx: CanvasRenderingContext2D,
  ps: PageSettings,
  settings: HandwritingSettings
) {
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
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
