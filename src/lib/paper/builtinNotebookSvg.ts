export type NotebookPaperStyle = 'lined' | 'ruled' | 'grid';

export interface NotebookPaperSvgInput {
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

export interface NotebookPaperSvgOptions {
  rootWidth?: string;
  rootHeight?: string;
}

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
  const styleDefs = style === 'grid' ? buildGridDefinitions(input) : '';
  const defsMarkup = styleDefs ? ['<defs>', styleDefs, '</defs>'].join('') : '';
  const lineMarkup = style === 'grid' ? buildGridField(input) : buildHorizontalLines(input);
  const marginMarkup = style === 'ruled' ? buildRuledMarginLine(input) : '';

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
  const maxY = input.pageHeight - input.margins.bottom + input.lineHeightPx;
  const strokeWidth = formatNumber(Math.max(1.2, input.lineHeightPx * 0.03));
  const lines: string[] = [];

  for (let y = input.textTop; y < maxY; y += input.lineHeightPx) {
    const lineY = formatNumber(y);
    lines.push(
      `  <line x1="0" y1="${lineY}" x2="${formatNumber(input.pageWidth)}" y2="${lineY}" stroke="${escapeXml(input.lineColor)}" stroke-width="${strokeWidth}" stroke-opacity="0.85" />`,
    );
  }

  return lines.join('');
}

function buildRuledMarginLine(input: NotebookPaperSvgInput): string {
  const marginX = formatNumber(input.marginLineX ?? input.margins.left);
  const strokeWidth = formatNumber(Math.max(1.9, input.lineHeightPx * 0.055));

  return `  <line x1="${marginX}" y1="0" x2="${marginX}" y2="${formatNumber(input.pageHeight)}" stroke="${RULED_MARGIN_LINE_COLOR}" stroke-width="${strokeWidth}" stroke-opacity="0.92" />`;
}

function buildGridDefinitions(input: NotebookPaperSvgInput): string {
  const gridSpacing = input.lineHeightPx * GRID_SPACING_RATIO;
  const majorGridSpacing = gridSpacing * GRID_MAJOR_LINE_MULTIPLIER;
  const minorLineColor = mixHexColors(input.lineColor, REFERENCE_GRID_MINOR_LINE_FALLBACK, 0.48);
  const majorLineColor = mixHexColors(input.lineColor, REFERENCE_GRID_MAJOR_LINE_FALLBACK, 0.12);
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
  const contentWidth = Math.max(0, input.pageWidth - input.margins.left - input.margins.right);
  const contentHeight = Math.max(0, input.pageHeight - input.margins.top - input.margins.bottom);

  return [
    `  <rect x="${formatNumber(input.margins.left)}" y="${formatNumber(input.margins.top)}" width="${formatNumber(contentWidth)}" height="${formatNumber(contentHeight)}" fill="url(#minor-grid)" />`,
    `  <rect x="${formatNumber(input.margins.left)}" y="${formatNumber(input.margins.top)}" width="${formatNumber(contentWidth)}" height="${formatNumber(contentHeight)}" fill="url(#major-grid)" />`,
  ].join('');
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
