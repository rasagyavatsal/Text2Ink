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

describe('primitive design tokens', () => {
  describe('space scale', () => {
    it.each([
      '--space-0', '--space-1', '--space-1-5', '--space-2', '--space-2-5',
      '--space-3', '--space-4', '--space-5', '--space-6', '--space-8',
      '--space-10', '--space-12', '--space-16',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  describe('radius scale', () => {
    it.each([
      '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl', '--radius-full',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  describe('size scale', () => {
    it.each([
      '--size-icon-xs', '--size-icon-sm', '--size-icon-md', '--size-icon-lg',
      '--size-control-sm', '--size-control-md', '--size-control-lg',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  describe('width scale', () => {
    it.each([
      '--width-panel',
      '--width-content',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  describe('breakpoint scale', () => {
    it.each([
      '--breakpoint-sm', '--breakpoint-md', '--breakpoint-lg', '--breakpoint-xl',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  it('all primitive tokens have non-empty values', () => {
    const primitives = [...allProps.entries()].filter(([key]) =>
      key.startsWith('--space-') ||
      key.startsWith('--radius-') ||
      key.startsWith('--size-') ||
      key.startsWith('--breakpoint-')
    );
    expect(primitives.length).toBeGreaterThan(0);
    for (const [key, value] of primitives) {
      expect(value).not.toBe('');
    }
  });
});

describe('semantic design tokens', () => {
  describe('layout tokens', () => {
    it.each([
      '--layout-panel-width',
      '--layout-content-width',
      '--layout-header-height',
      '--layout-controls-gap',
      '--layout-chrome-gap',
      '--layout-chrome-padding-y',
      '--layout-footer-padding-y',
      '--layout-page-padding-x',
      '--layout-page-padding-y',
      '--layout-section-rhythm',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  describe('surface tokens', () => {
    it.each([
      '--surface-page-padding',
      '--surface-card-padding',
      '--surface-section-gap',
      '--surface-input-height',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  describe('control tokens', () => {
    it.each([
      '--control-height-sm',
      '--control-height-md',
      '--control-height-lg',
      '--control-icon-size',
      '--control-gap',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  describe('panel tokens', () => {
    it.each([
      '--panel-width',
      '--panel-padding',
      '--panel-gap',
    ])('defines %s', (token) => {
      expect(allProps.has(token)).toBe(true);
    });
  });

  it('semantic tokens reference primitive tokens via var()', () => {
    const semanticEntries = [...allProps.entries()].filter(([key]) =>
      key.startsWith('--layout-') ||
      key.startsWith('--surface-') ||
      key.startsWith('--control-') ||
      key.startsWith('--panel-')
    );
    expect(semanticEntries.length).toBeGreaterThan(0);
    for (const [key, value] of semanticEntries) {
      expect(value).toMatch(/var\(--/);
    }
  });

  it('semantic tokens are pattern-level, not page-specific', () => {
    const semanticKeys = [...allProps.keys()].filter((key) =>
      key.startsWith('--layout-') ||
      key.startsWith('--surface-') ||
      key.startsWith('--control-') ||
      key.startsWith('--panel-')
    );
    for (const key of semanticKeys) {
      expect(key).not.toMatch(/--(?:layout|surface|control|panel)-editor-/);
      expect(key).not.toMatch(/--(?:layout|surface|control|panel)-contact-/);
    }
  });
});

describe('Tailwind @theme integration', () => {
  function extractThemeEntries(css: string): Map<string, string> {
    const themeBlock = css.match(/@theme\s+inline\s*\{([\s\S]*?)\}/);
    if (!themeBlock) return new Map();
    const props = new Map<string, string>();
    const regex = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = regex.exec(themeBlock[1])) !== null) {
      props.set(match[1], match[2].trim());
    }
    return props;
  }

  const themeEntries = extractThemeEntries(globalsCss);

  it('maps semantic tokens into Tailwind theme', () => {
    const expectedThemeTokens = [
      '--spacing-panel',
      '--spacing-section',
      '--spacing-controls',
      '--spacing-chrome',
      '--spacing-chrome-y',
      '--spacing-footer',
      '--spacing-page-x',
      '--spacing-page-y',
      '--height-control-sm',
      '--height-control-md',
      '--height-control-lg',
      '--height-input',
      '--width-panel',
      '--container-content',
    ];
    for (const token of expectedThemeTokens) {
      expect(themeEntries.has(token)).toBe(true);
    }
  });

  it('theme entries reference CSS custom properties via var()', () => {
    for (const [key, value] of themeEntries) {
      if (
        key.startsWith('--spacing-') ||
        key.startsWith('--height-') ||
        key.startsWith('--width-panel') ||
        key.startsWith('--container-')
      ) {
        expect(value).toMatch(/var\(--/);
      }
    }
  });
});
