import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, `../${relPath}`), 'utf-8');
}

interface TokenRules {
  forbidden?: (string | RegExp)[];
  required?: (string | RegExp)[];
}

function expectSourceUsesTokenRules(relPath: string, rules: TokenRules) {
  const source = readSource(relPath);
  if (rules.forbidden) {
    for (const pattern of rules.forbidden) {
      if (pattern instanceof RegExp) {
        expect(source).not.toMatch(pattern);
      } else {
        expect(source).not.toMatch(new RegExp(pattern));
      }
    }
  }
  if (rules.required) {
    for (const pattern of rules.required) {
      if (pattern instanceof RegExp) {
        expect(source).toMatch(pattern);
      } else {
        expect(source).toMatch(new RegExp(pattern));
      }
    }
  }
}

const SHARED_FRAMING_RULES: TokenRules = {
  forbidden: [
    /max-w-content\b/,
    /max-w-6xl\b/,
    'px-4 sm:px-6',
    'py-3 sm:py-4',
    'py-12 sm:py-16 md:py-20',
    /mt-12\b/,
    'px-page-x',
  ],
  required: [
    'py-chrome-y',
    'py-page-y',
    'mt-section',
    'px-public-gutter',
  ],
};

describe('shared layout consumers use token-backed framing utilities', () => {
  it.each([
    {
      name: 'HomePage',
      path: 'app/page.tsx',
    },
    {
      name: 'ContactPage',
      path: 'app/contact/page.tsx',
    },
    {
      name: 'LegalPage',
      path: 'components/patterns/LegalPage.tsx',
    },
  ])('$name consumes shared width, gutter, and rhythm tokens', ({ path }) => {
    expectSourceUsesTokenRules(path, SHARED_FRAMING_RULES);
  });

  it('SiteHeader consumes shared chrome gap tokens', () => {
    expectSourceUsesTokenRules('components/patterns/SiteHeader.tsx', {
      forbidden: ['gap-3 sm:gap-4'],
      required: ['gap-chrome'],
    });
  });

  it('HomePage consumes shared section rhythm tokens', () => {
    expectSourceUsesTokenRules('app/page.tsx', {
      forbidden: ['gap-12 sm:gap-16'],
      required: ['gap-section'],
    });
  });

  it('RootEditorPageClient consumes shared gutter, section, and chrome tokens', () => {
    expectSourceUsesTokenRules('app/editor/RootEditorPageClient.tsx', {
      forbidden: [
        'px-4 sm:px-6',
        'py-3 sm:py-4',
        'gap-3 sm:gap-4',
        'py-12 px-6',
      ],
      required: [
        'px-page-x',
        'py-chrome-y',
        'gap-chrome',
        'py-section',
      ],
    });
  });
});
