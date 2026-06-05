import { describe, it, expect } from 'vitest';
import {
  readGlobalsCss,
  extractCustomProperties,
  extractThemeEntries,
  expectTokensDefined,
  filterProps,
  expectNonEmptyValues,
  expectReferencePrimitive,
  expectNotPageSpecific,
} from '../test/cssTokenTestHelpers';

const globalsCss = readGlobalsCss();
const allProps = extractCustomProperties(globalsCss);

const primitiveTokenGroups = [
  {
    name: 'space scale',
    tokens: [
      '--space-0',
      '--space-1',
      '--space-1-5',
      '--space-2',
      '--space-2-5',
      '--space-3',
      '--space-4',
      '--space-5',
      '--space-6',
      '--space-8',
      '--space-10',
      '--space-12',
      '--space-16',
    ],
  },
  {
    name: 'radius scale',
    tokens: [
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--radius-xl',
      '--radius-2xl',
      '--radius-full',
    ],
  },
  {
    name: 'size scale',
    tokens: [
      '--size-icon-xs',
      '--size-icon-sm',
      '--size-icon-md',
      '--size-icon-lg',
      '--size-control-sm',
      '--size-control-md',
      '--size-control-lg',
    ],
  },
  {
    name: 'typography scale',
    tokens: [
      '--text-size-2xs',
      '--text-size-xs',
      '--text-size-sm',
      '--text-size-base',
      '--text-size-lg',
      '--text-size-xl',
      '--text-size-2xl',
      '--text-size-3xl',
      '--text-size-4xl',
      '--text-size-5xl',
      '--text-size-6xl',
      '--text-size-7xl',
    ],
  },
  {
    name: 'width scale',
    tokens: [
      '--width-panel',
      '--width-content',
    ],
  },
  {
    name: 'typography tokens',
    tokens: [
      '--type-brand-mark-size',
      '--type-display-title-size',
      '--type-page-title-size',
      '--type-document-title-size',
      '--type-section-title-size',
      '--type-overlay-title-size',
      '--type-body-lg-size',
      '--type-body-size',
      '--type-supporting-size',
      '--type-caption-size',
    ],
  },
  {
    name: 'breakpoint scale',
    tokens: [
      '--breakpoint-sm',
      '--breakpoint-md',
      '--breakpoint-lg',
      '--breakpoint-xl',
    ],
  },
];

const semanticTokenGroups = [
  {
    name: 'layout tokens',
    tokens: [
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
    ],
  },
  {
    name: 'surface tokens',
    tokens: [
      '--surface-page-padding',
      '--surface-card-padding',
      '--surface-section-gap',
      '--surface-input-height',
    ],
  },
  {
    name: 'control tokens',
    tokens: [
      '--control-height-sm',
      '--control-height-md',
      '--control-height-lg',
      '--control-icon-size',
      '--control-gap',
    ],
  },
  {
    name: 'panel tokens',
    tokens: [
      '--panel-width',
      '--panel-padding',
      '--panel-gap',
    ],
  },
];

describe('primitive design tokens', () => {
  for (const { name, tokens } of primitiveTokenGroups) {
    describe(name, () => {
      it.each(tokens)('defines %s', (token) => {
        expectTokensDefined(allProps, [token]);
      });
    });
  }

  it('all primitive tokens have non-empty values', () => {
    const primitives = filterProps(allProps, [
      '--space-',
      '--radius-',
      '--size-',
      '--breakpoint-',
    ]);
    expectNonEmptyValues(primitives);
  });
});

describe('semantic design tokens', () => {
  for (const { name, tokens } of semanticTokenGroups) {
    describe(name, () => {
      it.each(tokens)('defines %s', (token) => {
        expectTokensDefined(allProps, [token]);
      });
    });
  }

  it('semantic tokens reference primitive tokens via var()', () => {
    const semanticEntries = filterProps(allProps, [
      '--layout-',
      '--surface-',
      '--control-',
      '--panel-',
      '--type-',
    ]);
    expectReferencePrimitive(semanticEntries);
  });

  it('semantic tokens are pattern-level, not page-specific', () => {
    const semanticKeys = filterProps(allProps, [
      '--layout-',
      '--surface-',
      '--control-',
      '--panel-',
      '--type-',
    ]).map(([key]) => key);
    expectNotPageSpecific(semanticKeys);
  });
});

describe('Tailwind @theme integration', () => {
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
      '--text-label',
      '--text-brand-mark',
      '--text-display-title',
      '--text-page-title',
      '--text-document-title',
      '--text-section-title',
      '--text-overlay-title',
      '--text-body-lg',
      '--text-body',
      '--text-supporting',
      '--text-caption',
    ];
    expectTokensDefined(themeEntries, expectedThemeTokens);
  });

  it('theme entries reference CSS custom properties via var()', () => {
    const themeList = filterProps(themeEntries, [
      '--spacing-',
      '--height-',
      '--width-panel',
      '--container-',
      '--font-size-',
    ]);
    expectReferencePrimitive(themeList);
  });
});

describe('CSS helper extraction', () => {
  it('extracts custom properties correctly from css string', () => {
    const css = `
      :root {
        --test-prop-1: value1;
        --test-prop-2: value2;
      }
    `;
    const extracted = extractCustomProperties(css);
    expect(extracted.get('--test-prop-1')).toBe('value1');
    expect(extracted.get('--test-prop-2')).toBe('value2');
  });

  it('extracts theme block entries using brace boundaries', () => {
    const css = `
      @theme inline {
        --test-theme-1: theme-val1;
        --test-theme-2: theme-val2;
      }
      --test-outside: outside-val;
    `;
    const extractedTheme = extractThemeEntries(css);
    expect(extractedTheme.get('--test-theme-1')).toBe('theme-val1');
    expect(extractedTheme.get('--test-theme-2')).toBe('theme-val2');
    expect(extractedTheme.has('--test-outside')).toBe(false);
  });
});
