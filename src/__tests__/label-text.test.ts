import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('.label-text CSS utility', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/globals.css'),
    'utf-8'
  );

  it('defines .label-text class inside @layer components', () => {
    const componentsLayerMatch = source.match(/@layer components\s*{([\s\S]*)}/);
    expect(componentsLayerMatch).toBeTruthy();
    expect(componentsLayerMatch![1]).toMatch(/\.label-text\s*{/);
  });

  it('.label-text applies the canonical label pattern styles', () => {
    const componentsLayerMatch = source.match(/@layer components\s*{([\s\S]*)}/);
    expect(componentsLayerMatch).toBeTruthy();
    const labelTextBlock = componentsLayerMatch![1];
    expect(labelTextBlock).toMatch(/font-size:\s*var\(--text-size-2xs\)/);
    expect(labelTextBlock).toMatch(/font-weight:\s*700/);
    expect(labelTextBlock).toMatch(/color:\s*var\(--color-muted-foreground\)/);
    expect(labelTextBlock).toMatch(/text-transform:\s*uppercase/);
    expect(labelTextBlock).toMatch(/letter-spacing:/);
  });
});
