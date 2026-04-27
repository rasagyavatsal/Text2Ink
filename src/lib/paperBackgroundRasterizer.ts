import type { ResolvedPageLayout } from './pageLayout';

export function rasterizePaperBackground(layout: ResolvedPageLayout): string | null {
  const template = layout.paperTemplate;
  if (!template || template.kind === 'blank') return null;

  const visualRuleBox = layout.visualRuleBox;
  const contentWidth = visualRuleBox.width;
  const contentHeight = visualRuleBox.height;
  const lineHeight = layout.lineSpacing;
  const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeight));

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}">`,
  ];

  const addLine = (attrs: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  }) => {
    parts.push(
      `<line x1="${attrs.x1}" y1="${attrs.y1}" x2="${attrs.x2}" y2="${attrs.y2}" stroke="${attrs.stroke ?? template.lineColor ?? '#a8d4f0'}" stroke-width="${attrs.strokeWidth ?? 1}"${attrs.opacity !== undefined ? ` opacity="${attrs.opacity}"` : ''} />`
    );
  };

  if (template.kind === 'ruled' || template.kind === 'graph') {
    for (let i = 0; i <= linesPerPage; i++) {
      const y = visualRuleBox.y + i * lineHeight;
      if (y > visualRuleBox.y + visualRuleBox.height + lineHeight) continue;
      addLine({
        x1: visualRuleBox.x,
        y1: y,
        x2: visualRuleBox.x + contentWidth,
        y2: y,
        opacity: template.kind === 'graph' ? 0.5 : 1,
      });
    }
  }

  if (template.kind === 'graph') {
    const cols = Math.floor(contentWidth / lineHeight);
    for (let i = 0; i <= cols; i++) {
      const x = visualRuleBox.x + i * lineHeight;
      addLine({
        x1: x,
        y1: visualRuleBox.y,
        x2: x,
        y2: visualRuleBox.y + contentHeight,
        opacity: 0.5,
      });
    }
  }

  if (template.kind === 'dot-grid') {
    for (let y = visualRuleBox.y; y <= visualRuleBox.y + contentHeight; y += lineHeight) {
      for (let x = visualRuleBox.x; x <= visualRuleBox.x + contentWidth; x += lineHeight) {
        parts.push(
          `<circle cx="${x}" cy="${y}" r="1.2" fill="${template.lineColor ?? '#9aa7b0'}" opacity="0.55" />`
        );
      }
    }
  }

  if (template.accentColor && layout.accentLine) {
    addLine({
      x1: layout.accentLine.x,
      y1: layout.accentLine.y1,
      x2: layout.accentLine.x,
      y2: layout.accentLine.y2,
      stroke: template.accentColor,
      strokeWidth: 2,
    });
  }

  parts.push('</svg>');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(parts.join(''))}`;
}
