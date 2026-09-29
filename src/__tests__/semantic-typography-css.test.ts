import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const globalsCss = fs.readFileSync(
  path.resolve(__dirname, '../app/globals.css'),
  'utf-8'
);

async function compileCssFor(classes: string[]): Promise<string> {
  const result = await postcss([tailwindcss()]).process(
    `${globalsCss}\n@source inline("${classes.join(' ')}");`,
    { from: path.resolve(__dirname, '../app/globals.css') }
  );

  return result.css;
}

function getClassRule(css: string, className: string): string | null {
  const escapedClassName = className.replaceAll('-', String.raw`\-`);
  const match = new RegExp(String.raw`\.${escapedClassName}\s*\{([\s\S]*?)\}`, 'm').exec(css);

  return match?.[0] ?? null;
}

describe('semantic typography utilities', () => {
  it('emits editor section heading and supporting-copy utilities into compiled CSS', async () => {
    const css = await compileCssFor(['text-section-title', 'text-body-lg']);

    const displayTitleRule = getClassRule(css, 'text-section-title');
    const bodyLgRule = getClassRule(css, 'text-body-lg');

    expect(displayTitleRule).toBeTruthy();
    expect(bodyLgRule).toBeTruthy();
    expect(displayTitleRule).toMatch(/font-size:/);
    expect(bodyLgRule).toMatch(/font-size:/);
    expect(displayTitleRule).not.toEqual(bodyLgRule);
  });

  it('emits the issue-defined semantic typography classes with their intended tokens', async () => {
    const classesByToken = new Map([
      ['text-section-title', '--type-section-title-size'],
      ['text-overlay-title', '--type-overlay-title-size'],
      ['text-body-lg', '--type-body-lg-size'],
      ['text-body', '--type-body-size'],
      ['text-supporting', '--type-supporting-size'],
      ['text-caption', '--type-caption-size'],
    ]);

    const css = await compileCssFor([...classesByToken.keys()]);

    for (const [className, tokenName] of classesByToken) {
      expect(getClassRule(css, className)).toContain(`font-size: var(${tokenName})`);
    }
  });
});
