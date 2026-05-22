type NotebookPaperStyle = 'lined' | 'ruled';

interface NotebookPaperSvgInput {
  style: NotebookPaperStyle;
  pageWidth: number;
  pageHeight: number;
  paperColor: string;
  lineColor: string;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  textTop: number;
  lineHeightPx: number;
  marginLineX?: number;
}

const PAPER_GRAIN_COLOR = '#d4c7ab';
const RULED_MARGIN_LINE_COLOR = '#e6a1a8';

export function buildBuiltinNotebookPaperDataUrl(input: NotebookPaperSvgInput): string {
  const svg = buildBuiltinNotebookPaperSvg(input);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildBuiltinNotebookPaperSvg(input: NotebookPaperSvgInput): string {
  const { pageWidth, pageHeight, paperColor, style } = input;
  const lineMarkup = buildHorizontalLines(input);
  const marginMarkup = style === 'ruled' ? buildRuledMarginLine(input) : '';
  const grainMarkup = buildPaperGrain(pageWidth, pageHeight);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(pageWidth)} ${formatNumber(pageHeight)}" width="${formatNumber(pageWidth)}" height="${formatNumber(pageHeight)}">`,
    '<defs>',
    '  <linearGradient id="paper-wash" x1="0" y1="0" x2="0" y2="1">',
    '    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.38" />',
    '    <stop offset="18%" stop-color="#ffffff" stop-opacity="0.10" />',
    '    <stop offset="100%" stop-color="#efe6cf" stop-opacity="0.14" />',
    '  </linearGradient>',
    '  <linearGradient id="edge-tone" x1="0" y1="0" x2="1" y2="0">',
    '    <stop offset="0%" stop-color="#dccfb4" stop-opacity="0.18" />',
    '    <stop offset="6%" stop-color="#dccfb4" stop-opacity="0.05" />',
    '    <stop offset="94%" stop-color="#dccfb4" stop-opacity="0.05" />',
    '    <stop offset="100%" stop-color="#dccfb4" stop-opacity="0.18" />',
    '  </linearGradient>',
    '</defs>',
    `  <rect width="${formatNumber(pageWidth)}" height="${formatNumber(pageHeight)}" fill="${escapeXml(paperColor)}" />`,
    `  <rect width="${formatNumber(pageWidth)}" height="${formatNumber(pageHeight)}" fill="url(#paper-wash)" />`,
    `  <rect width="${formatNumber(pageWidth)}" height="${formatNumber(pageHeight)}" fill="url(#edge-tone)" opacity="0.55" />`,
    '  <rect x="0" y="0" width="100%" height="22" fill="#fff7de" opacity="0.35" />',
    grainMarkup,
    lineMarkup,
    marginMarkup,
    '</svg>',
  ].join('');
}

function buildHorizontalLines(input: NotebookPaperSvgInput): string {
  const right = input.pageWidth - input.margins.right;
  const maxY = input.pageHeight - input.margins.bottom + input.lineHeightPx;
  const lines: string[] = [];

  for (let y = input.textTop; y < maxY; y += input.lineHeightPx) {
    const lineY = formatNumber(y);
    lines.push(
      `  <line x1="0" y1="${lineY}" x2="${formatNumber(input.pageWidth)}" y2="${lineY}" stroke="${escapeXml(input.lineColor)}" stroke-width="1.1" stroke-opacity="0.72" />`,
    );
    lines.push(
      `  <line x1="${formatNumber(input.margins.left * 0.3)}" y1="${lineY}" x2="${formatNumber(right)}" y2="${lineY}" stroke="#ffffff" stroke-width="0.55" stroke-opacity="0.16" />`,
    );
  }

  return lines.join('');
}

function buildRuledMarginLine(input: NotebookPaperSvgInput): string {
  const marginX = formatNumber(input.marginLineX ?? input.margins.left);
  const top = formatNumber(Math.max(0, input.margins.top - input.lineHeightPx * 0.35));
  const bottom = formatNumber(input.pageHeight - input.margins.bottom + input.lineHeightPx * 0.45);

  return [
    `  <line x1="${marginX}" y1="${top}" x2="${marginX}" y2="${bottom}" stroke="${RULED_MARGIN_LINE_COLOR}" stroke-width="1.6" stroke-opacity="0.9" />`,
    `  <line x1="${formatNumber((input.marginLineX ?? input.margins.left) + 1.6)}" y1="${top}" x2="${formatNumber((input.marginLineX ?? input.margins.left) + 1.6)}" y2="${bottom}" stroke="#f7d9dd" stroke-width="0.8" stroke-opacity="0.7" />`,
  ].join('');
}

function buildPaperGrain(pageWidth: number, pageHeight: number): string {
  const fibers: string[] = [];
  const dots: string[] = [];
  const fiberCount = 18;
  const dotCount = 28;

  for (let index = 0; index < fiberCount; index += 1) {
    const startX = seededValue(index * 3 + 1, pageWidth * 0.94) + pageWidth * 0.03;
    const startY = seededValue(index * 3 + 2, pageHeight * 0.94) + pageHeight * 0.03;
    const length = 4 + seededValue(index * 3 + 3, 9);
    const angle = seededValue(index * 3 + 4, Math.PI);
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    fibers.push(
      `  <line x1="${formatNumber(startX)}" y1="${formatNumber(startY)}" x2="${formatNumber(endX)}" y2="${formatNumber(endY)}" stroke="${PAPER_GRAIN_COLOR}" stroke-width="0.7" stroke-opacity="0.11" stroke-linecap="round" />`,
    );
  }

  for (let index = 0; index < dotCount; index += 1) {
    const cx = seededValue(index * 5 + 7, pageWidth * 0.96) + pageWidth * 0.02;
    const cy = seededValue(index * 5 + 8, pageHeight * 0.96) + pageHeight * 0.02;
    const radius = 0.45 + seededValue(index * 5 + 9, 0.7);
    dots.push(
      `  <circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(radius)}" fill="${PAPER_GRAIN_COLOR}" fill-opacity="0.08" />`,
    );
  }

  return [...fibers, ...dots].join('');
}

function seededValue(seed: number, range: number): number {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return (raw - Math.floor(raw)) * range;
}

function formatNumber(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '');
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
