import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';

export function readGlobalsCss(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../app/globals.css'),
    'utf-8'
  );
}

export function extractCustomProperties(css: string): Map<string, string> {
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

export function extractThemeEntries(css: string): Map<string, string> {
  const themeIndex = css.indexOf('@theme');
  if (themeIndex === -1) return new Map();

  const openBraceIndex = css.indexOf('{', themeIndex);
  if (openBraceIndex === -1) return new Map();

  let braceCount = 1;
  let closeBraceIndex = -1;
  for (let i = openBraceIndex + 1; i < css.length; i++) {
    if (css[i] === '{') {
      braceCount++;
    } else if (css[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        closeBraceIndex = i;
        break;
      }
    }
  }

  if (closeBraceIndex === -1) return new Map();

  const themeBlockContent = css.substring(openBraceIndex + 1, closeBraceIndex);
  return extractCustomProperties(themeBlockContent);
}

export function expectTokensDefined(allProps: Map<string, string>, tokens: string[]): void {
  for (const token of tokens) {
    expect(allProps.has(token)).toBe(true);
  }
}

export function filterProps(allProps: Map<string, string>, prefixes: string[]): [string, string][] {
  return [...allProps.entries()].filter(([key]) =>
    prefixes.some((prefix) => key.startsWith(prefix))
  );
}

export function expectNonEmptyValues(entries: [string, string][]): void {
  expect(entries.length).toBeGreaterThan(0);
  for (const [, value] of entries) {
    expect(value).not.toBe('');
  }
}

export function expectReferencePrimitive(entries: [string, string][]): void {
  expect(entries.length).toBeGreaterThan(0);
  for (const [, value] of entries) {
    expect(value).toMatch(/var\(--/);
  }
}

export function expectNotPageSpecific(keys: string[]): void {
  for (const key of keys) {
    expect(key).not.toMatch(/--(?:layout|surface|control|panel)-editor-/);
    expect(key).not.toMatch(/--(?:layout|surface|control|panel)-contact-/);
    expect(key).not.toMatch(/--type-(?:home|landing|contact|footer|modal|privacy|terms)-/);
  }
}
