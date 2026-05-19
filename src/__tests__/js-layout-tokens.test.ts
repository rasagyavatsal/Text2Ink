import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const globalsCss = fs.readFileSync(
  path.resolve(__dirname, '../app/globals.css'),
  'utf-8'
);

function extractCustomProperties(css: string): Map<string, string> {
  const props = new Map<string, string>();
  const regex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    props.set(match[1], match[2].trim());
  }
  return props;
}

const allProps = extractCustomProperties(globalsCss);

function readSource(relPath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, `../${relPath}`),
    'utf-8'
  );
}

describe('JS layout tokens as CSS custom properties', () => {
  it('defines header height tokens', () => {
    expect(allProps.has('--metric-header-height-mobile')).toBe(true);
    expect(allProps.has('--metric-header-height-desktop')).toBe(true);
  });

  it('defines mobile sheet metric tokens', () => {
    expect(allProps.has('--metric-sheet-handle-height')).toBe(true);
    expect(allProps.has('--metric-desktop-breakpoint')).toBe(true);
  });

  it('header height tokens have valid pixel values', () => {
    const mobile = allProps.get('--metric-header-height-mobile');
    const desktop = allProps.get('--metric-header-height-desktop');
    expect(mobile).toMatch(/^\d+px$/);
    expect(desktop).toMatch(/^\d+px$/);
  });
});

describe('JS sources consume CSS tokens', () => {
  it('RootEditorPageClient reads header height from CSS tokens', () => {
    const source = readSource('app/RootEditorPageClient.tsx');
    expect(source).not.toMatch(/isMobileEditorLayout\s*\?\s*60\s*:\s*68/);
    expect(source).toMatch(/getComputedStyle|--metric-header-height/);
  });

  it('mobileEditorSheet reads desktop breakpoint from CSS token', () => {
    const source = readSource('lib/mobileEditorSheet.ts');
    expect(source).not.toMatch(/MOBILE_EDITOR_DESKTOP_BREAKPOINT_PX\s*=\s*1280/);
    expect(source).toMatch(/getComputedStyle|--metric-desktop-breakpoint/);
  });
});
