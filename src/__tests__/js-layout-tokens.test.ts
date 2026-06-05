import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const globalsCss = fs.readFileSync(
  path.resolve(__dirname, '../app/globals.css'),
  'utf-8'
);

function extractCustomProperties(css: string): Map<string, string> {
  const props = new Map<string, string>();
  const lines = css.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('--')) {
      continue;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const semicolonIndex = line.indexOf(';', colonIndex);
    if (semicolonIndex === -1) {
      continue;
    }
    const name = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1, semicolonIndex).trim();
    props.set(name, value);
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
    const source = readSource('app/editor/RootEditorPageClient.tsx');
    expect(source).not.toMatch(/isMobileEditorLayout\s*\?\s*60\s*:\s*68/);
    expect(source).toMatch(/getComputedStyle|--metric-header-height/);
  });

  it('mobileEditorSheet reads desktop breakpoint from CSS token', () => {
    const source = readSource('lib/mobileEditorSheet.ts');
    expect(source).not.toMatch(/MOBILE_EDITOR_DESKTOP_BREAKPOINT_PX\s*=\s*1280/);
    expect(source).toMatch(/getComputedStyle|--metric-desktop-breakpoint/);
  });
});
