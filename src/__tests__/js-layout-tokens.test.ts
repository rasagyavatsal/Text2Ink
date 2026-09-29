import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { readGlobalsCss, extractCustomProperties } from '../test/cssTokenTestHelpers';

const globalsCss = readGlobalsCss();
const allProps = extractCustomProperties(globalsCss);

function readSource(relPath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, `../${relPath}`),
    'utf-8'
  );
}

describe('JS layout tokens as CSS custom properties', () => {
  it('defines mobile sheet metric tokens', () => {
    expect(allProps.has('--metric-sheet-handle-height')).toBe(true);
    expect(allProps.has('--metric-desktop-breakpoint')).toBe(true);
  });

});

describe('JS sources consume CSS tokens', () => {
  it('RootEditorPageClient spans the viewport without a page header', () => {
    const source = readSource('app/(editor)/RootEditorPageClient.tsx');
    expect(source).toMatch(/const headerHeight = 0/);
  });

  it('mobileEditorSheet reads desktop breakpoint from CSS token', () => {
    const source = readSource('lib/mobileEditorSheet.ts');
    expect(source).not.toMatch(/MOBILE_EDITOR_DESKTOP_BREAKPOINT_PX\s*=\s*1280/);
    expect(source).toMatch(/getComputedStyle|--metric-desktop-breakpoint/);
  });
});
