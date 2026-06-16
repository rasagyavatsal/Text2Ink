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

type TokenGroup = {
  name: string;
  tokens: string[];
};

const globalsCss = readGlobalsCss();
const allProps = extractCustomProperties(globalsCss);

const cssNameList = (source: string): string[] => source.trim().split(/\s+/);

const createTokenGroups = (sources: Record<string, string>): TokenGroup[] =>
  Object.entries(sources).map(([name, source]) => ({
    name,
    tokens: cssNameList(source),
  }));

function defineTokenDefinitionTests(groups: TokenGroup[]): void {
  for (const { name, tokens } of groups) {
    describe(name, () => {
      it.each(tokens)('defines %s', (token) => {
        expectTokensDefined(allProps, [token]);
      });
    });
  }
}

const primitiveTokenGroups = createTokenGroups({
  'space scale': `
    --space-0 --space-1 --space-1-5 --space-2 --space-2-5 --space-3
    --space-4 --space-5 --space-6 --space-8 --space-10 --space-12 --space-16
  `,
  'radius scale': `
    --radius-sm --radius-md --radius-lg --radius-xl --radius-2xl --radius-full
  `,
  'size scale': `
    --size-icon-xs --size-icon-sm --size-icon-md --size-icon-lg
    --size-control-sm --size-control-md --size-control-lg
  `,
  'typography scale': `
    --text-size-2xs --text-size-xs --text-size-sm --text-size-base --text-size-lg
    --text-size-xl --text-size-2xl --text-size-3xl --text-size-4xl
    --text-size-5xl --text-size-6xl --text-size-7xl
  `,
  'width scale': '--width-panel --width-content',
  'typography tokens': `
    --type-brand-mark-size --type-display-title-size --type-page-title-size
    --type-document-title-size --type-section-title-size --type-overlay-title-size
    --type-body-lg-size --type-body-size --type-supporting-size --type-caption-size
  `,
  'breakpoint scale': '--breakpoint-sm --breakpoint-md --breakpoint-lg --breakpoint-xl',
});

const semanticTokenGroups = createTokenGroups({
  'layout tokens': `
    --layout-panel-width --layout-content-width --layout-header-height
    --layout-controls-gap --layout-chrome-gap --layout-chrome-padding-y
    --layout-footer-padding-y --layout-page-padding-x --layout-page-padding-y
    --layout-section-rhythm --layout-public-gutter
  `,
  'surface tokens': `
    --surface-page-padding --surface-card-padding --surface-section-gap
    --surface-input-height
  `,
  'control tokens': `
    --control-height-sm --control-height-md --control-height-lg
    --control-icon-size --control-gap
  `,
  'panel tokens': '--panel-width --panel-padding --panel-gap',
});

const primitiveValuePrefixes = cssNameList(`
  --space- --radius- --size- --breakpoint-
`);

const semanticTokenPrefixes = cssNameList(`
  --layout- --surface- --control- --panel- --type-
`);

const expectedThemeTokens = cssNameList(`
  --spacing-panel --spacing-section --spacing-controls --spacing-chrome
  --spacing-chrome-y --spacing-footer --spacing-page-x --spacing-page-y
  --spacing-public-gutter --height-control-sm --height-control-md --height-control-lg --height-input
  --width-panel --container-content --text-label --text-brand-mark
  --text-display-title --text-page-title --text-document-title --text-section-title
  --text-overlay-title --text-body-lg --text-body --text-supporting --text-caption
`);

const themeReferencePrefixes = cssNameList(`
  --spacing- --height- --width-panel --container- --font-size-
`);

describe('primitive design tokens', () => {
  defineTokenDefinitionTests(primitiveTokenGroups);

  it('all primitive tokens have non-empty values', () => {
    const primitives = filterProps(allProps, primitiveValuePrefixes);
    expectNonEmptyValues(primitives);
  });
});

describe('semantic design tokens', () => {
  defineTokenDefinitionTests(semanticTokenGroups);

  it('semantic tokens reference primitive tokens via var()', () => {
    const semanticEntries = filterProps(allProps, semanticTokenPrefixes);
    expectReferencePrimitive(semanticEntries);
  });

  it('semantic tokens are pattern-level, not page-specific', () => {
    const semanticKeys = filterProps(allProps, semanticTokenPrefixes).map(([key]) => key);
    expectNotPageSpecific(semanticKeys);
  });
});

describe('Tailwind @theme integration', () => {
  const themeEntries = extractThemeEntries(globalsCss);

  it('maps semantic tokens into Tailwind theme', () => {
    expectTokensDefined(themeEntries, expectedThemeTokens);
  });

  it('theme entries reference CSS custom properties via var()', () => {
    const themeList = filterProps(themeEntries, themeReferencePrefixes);
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
