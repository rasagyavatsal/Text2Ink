export type NotebookPaperStyle = 'lined' | 'wide-lined' | 'narrow-lined' | 'ruled' | 'wide-ruled' | 'narrow-ruled' | 'grid' | 'dot-grid' | 'cornell';

export interface NotebookPaperSvgInput {
  style: NotebookPaperStyle;
  pageWidth: number;
  pageHeight: number;
  paperColor: string;
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

export interface NotebookPaperSvgOptions {
  rootWidth?: string;
  rootHeight?: string;
}

export const BUILTIN_NOTEBOOK_GUIDE_LINE_COLOR = '#a9becd';

const RULED_MARGIN_LINE_COLOR = '#f39ca6';
const REFERENCE_GRID_MINOR_LINE_FALLBACK = '#d7e2ea';
const REFERENCE_GRID_MAJOR_LINE_FALLBACK = '#a9becd';
const GRID_SPACING_RATIO = 0.5;
const GRID_MAJOR_LINE_MULTIPLIER = 5;

export function buildBuiltinNotebookPaperDataUrl(input: NotebookPaperSvgInput): string {
  const svg = buildBuiltinNotebookPaperSvg(input);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function buildBuiltinNotebookPaperSvg(
  input: NotebookPaperSvgInput,
  options: NotebookPaperSvgOptions = {},
): string {
  const { pageWidth, pageHeight, paperColor, style } = input;
  const rootWidth = escapeXml(options.rootWidth ?? '100%');
  const rootHeight = escapeXml(options.rootHeight ?? '100%');
  const styleDefs = (style === 'grid' || style === 'dot-grid') ? buildGridDefinitions(input) : '';
  const defsMarkup = styleDefs ? '<defs>' + styleDefs + '</defs>' : '';
  const getLineMarkup = () => {
    if (style === 'grid') return buildGridField(input);
    if (style === 'dot-grid') return buildDotGridField(input);
    return buildHorizontalLines(input);
  };
  const getMarginMarkup = () => {
    if (style === 'ruled' || style === 'wide-ruled' || style === 'narrow-ruled') return buildRuledMarginLine(input);
    if (style === 'cornell') return buildCornellLines(input);
    return '';
  };

  const lineMarkup = getLineMarkup();
  const marginMarkup = getMarginMarkup();

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(pageWidth)} ${formatNumber(pageHeight)}" width="${rootWidth}" height="${rootHeight}" shape-rendering="geometricPrecision">`,
    defsMarkup,
    `  <rect width="${formatNumber(pageWidth)}" height="${formatNumber(pageHeight)}" fill="${escapeXml(paperColor)}" />`,
    lineMarkup,
    marginMarkup,
    '</svg>',
  ].join('');
}

function buildHorizontalLines(input: NotebookPaperSvgInput): string {
  const bottomMargin = input.style === 'cornell' ? Math.max(100, input.pageHeight * 0.2) : 0;
  const maxY = input.pageHeight - input.margins.bottom + input.lineHeightPx - bottomMargin;
  const strokeWidth = formatNumber(Math.max(1.2, input.lineHeightPx * 0.03));
  const lines: string[] = [];

  for (let y = input.textTop; y < maxY; y += input.lineHeightPx) {
    const lineY = formatNumber(y);
    lines.push(
      `  <line x1="0" y1="${lineY}" x2="${formatNumber(input.pageWidth)}" y2="${lineY}" stroke="${escapeXml(BUILTIN_NOTEBOOK_GUIDE_LINE_COLOR)}" stroke-width="${strokeWidth}" stroke-opacity="0.85" />`,
    );
  }

  return lines.join('');
}

function buildRuledMarginLine(input: NotebookPaperSvgInput): string {
  const marginX = formatNumber(input.marginLineX ?? input.margins.left);
  const strokeWidth = formatNumber(Math.max(1.9, input.lineHeightPx * 0.055));

  return `  <line x1="${marginX}" y1="0" x2="${marginX}" y2="${formatNumber(input.pageHeight)}" stroke="${RULED_MARGIN_LINE_COLOR}" stroke-width="${strokeWidth}" stroke-opacity="0.92" />`;
}

function buildCornellLines(input: NotebookPaperSvgInput): string {
  const marginX = formatNumber(input.marginLineX ?? Math.max(input.margins.left, input.pageWidth * 0.25));
  const strokeWidth = formatNumber(Math.max(1.9, input.lineHeightPx * 0.055));
  const bottomMargin = Math.max(100, input.pageHeight * 0.2);
  const bottomY = formatNumber(input.pageHeight - bottomMargin);

  return [
    `  <line x1="${marginX}" y1="0" x2="${marginX}" y2="${formatNumber(input.pageHeight)}" stroke="${RULED_MARGIN_LINE_COLOR}" stroke-width="${strokeWidth}" stroke-opacity="0.92" />`,
    `  <line x1="0" y1="${bottomY}" x2="${formatNumber(input.pageWidth)}" y2="${bottomY}" stroke="${RULED_MARGIN_LINE_COLOR}" stroke-width="${strokeWidth}" stroke-opacity="0.92" />`
  ].join('');
}

function buildGridDefinitions(input: NotebookPaperSvgInput): string {
  if (input.style === 'dot-grid') {
    const dotSpacing = input.lineHeightPx * GRID_SPACING_RATIO;
    const dotColor = mixHexColors(BUILTIN_NOTEBOOK_GUIDE_LINE_COLOR, REFERENCE_GRID_MAJOR_LINE_FALLBACK, 0.4);
    const dotRadius = formatNumber(Math.max(0.8, input.lineHeightPx * 0.02));

    return [
      `  <pattern id="dot-grid" x="${formatNumber(input.margins.left)}" y="${formatNumber(input.margins.top)}" width="${formatNumber(dotSpacing)}" height="${formatNumber(dotSpacing)}" patternUnits="userSpaceOnUse">`,
      `    <circle cx="${dotRadius}" cy="${dotRadius}" r="${dotRadius}" fill="${escapeXml(dotColor)}" fill-opacity="0.8" />`,
      '  </pattern>',
    ].join('');
  }

  const gridSpacing = input.lineHeightPx * GRID_SPACING_RATIO;
  const majorGridSpacing = gridSpacing * GRID_MAJOR_LINE_MULTIPLIER;
  const minorLineColor = mixHexColors(BUILTIN_NOTEBOOK_GUIDE_LINE_COLOR, REFERENCE_GRID_MINOR_LINE_FALLBACK, 0.48);
  const majorLineColor = mixHexColors(BUILTIN_NOTEBOOK_GUIDE_LINE_COLOR, REFERENCE_GRID_MAJOR_LINE_FALLBACK, 0.12);
  const minorLineWidth = formatNumber(Math.max(0.7, input.lineHeightPx * 0.0175));
  const majorLineWidth = formatNumber(Math.max(1, input.lineHeightPx * 0.025));

  return [
    `  <pattern id="minor-grid" x="${formatNumber(input.margins.left)}" y="${formatNumber(input.margins.top)}" width="${formatNumber(gridSpacing)}" height="${formatNumber(gridSpacing)}" patternUnits="userSpaceOnUse">`,
    `    <path d="M ${formatNumber(gridSpacing)} 0 L 0 0 0 ${formatNumber(gridSpacing)}" fill="none" stroke="${escapeXml(minorLineColor)}" stroke-width="${minorLineWidth}" stroke-opacity="0.84" />`,
    '  </pattern>',
    `  <pattern id="major-grid" x="${formatNumber(input.margins.left)}" y="${formatNumber(input.margins.top)}" width="${formatNumber(majorGridSpacing)}" height="${formatNumber(majorGridSpacing)}" patternUnits="userSpaceOnUse">`,
    `    <path d="M ${formatNumber(majorGridSpacing)} 0 L 0 0 0 ${formatNumber(majorGridSpacing)}" fill="none" stroke="${escapeXml(majorLineColor)}" stroke-width="${majorLineWidth}" stroke-opacity="0.9" />`,
    '  </pattern>',
  ].join('');
}

function buildGridField(input: NotebookPaperSvgInput): string {
  return [
    `  <rect width="${formatNumber(input.pageWidth)}" height="${formatNumber(input.pageHeight)}" fill="url(#minor-grid)" />`,
    `  <rect width="${formatNumber(input.pageWidth)}" height="${formatNumber(input.pageHeight)}" fill="url(#major-grid)" />`,
  ].join('');
}

function buildDotGridField(input: NotebookPaperSvgInput): string {
  return `  <rect width="${formatNumber(input.pageWidth)}" height="${formatNumber(input.pageHeight)}" fill="url(#dot-grid)" />`;
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

function mixHexColors(primary: string, fallback: string, ratio: number): string {
  const source = parseHexColor(primary);
  const target = parseHexColor(fallback);
  if (!source || !target) {
    return fallback;
  }

  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const mixed = source.map((channel, index) => (
    Math.round(channel + (target[index] - channel) * clampedRatio)
  ));

  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function parseHexColor(value: string): [number, number, number] | null {
  const normalized = value.trim();
  if (/^#[\da-fA-F]{6}$/.test(normalized)) {
    return [
      Number.parseInt(normalized.slice(1, 3), 16),
      Number.parseInt(normalized.slice(3, 5), 16),
      Number.parseInt(normalized.slice(5, 7), 16),
    ];
  }

  if (/^#[\da-fA-F]{3}$/.test(normalized)) {
    return [
      Number.parseInt(normalized[1] + normalized[1], 16),
      Number.parseInt(normalized[2] + normalized[2], 16),
      Number.parseInt(normalized[3] + normalized[3], 16),
    ];
  }

  return null;
}
