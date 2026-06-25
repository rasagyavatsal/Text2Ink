import { describe, expect, it } from 'vitest';
import { buildBuiltinNotebookPaperDataUrl } from '../builtinNotebookSvg';

describe('buildBuiltinNotebookPaperDataUrl', () => {
  it('generates an SVG with 100% width and height for resolution independence', () => {
    const dataUrl = buildBuiltinNotebookPaperDataUrl({
      style: 'lined',
      pageWidth: 612,
      pageHeight: 792,
      paperColor: '#ffffff',
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      textTop: 50,
      lineHeightPx: 30,
    });

    // Extract the raw SVG string from the data URI
    const prefix = 'data:image/svg+xml;charset=UTF-8,';
    expect(dataUrl.startsWith(prefix)).toBe(true);
    
    const svgContent = decodeURIComponent(dataUrl.slice(prefix.length));
    
    // The SVG should specify a viewBox with the correct aspect ratio, but
    // use 100% for width and height so it renders crisply at any DPI/scale
    expect(svgContent).toContain('viewBox="0 0 612 792"');
    expect(svgContent).toContain('width="100%"');
    expect(svgContent).toContain('height="100%"');
    
    // It should not use fixed pixel dimensions for the root SVG width/height
    const svgTag = /<svg[^>]*>/.exec(svgContent)?.[0] || '';
    expect(svgTag).not.toMatch(/width="612\.?0*"/);
    expect(svgTag).not.toMatch(/height="792\.?0*"/);
  });
});
