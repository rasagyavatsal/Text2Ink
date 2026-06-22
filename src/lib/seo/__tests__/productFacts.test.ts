import { describe, expect, it } from 'vitest';
import {
  HANDWRITING_FONTS,
  PAPER_FORMATS,
  PAPER_ORIENTATIONS,
  PAPER_STYLES,
} from '@/lib/types';
import { productFacts, siteFacts } from '../productFacts';

describe('SEO product facts', () => {
  it('derives built-in handwriting fonts from the editor font catalog', () => {
    const builtInFonts = HANDWRITING_FONTS
      .filter((font) => font.value !== 'custom')
      .map((font) => font.name);

    expect(productFacts.handwritingFonts.map((font) => font.name)).toEqual(builtInFonts);
    expect(productFacts.customFontUpload.formats).toEqual(['.ttf', '.otf']);
  });

  it('derives paper options from the editor paper catalog', () => {
    expect(productFacts.paper.styles.map((style) => style.name)).toEqual(
      PAPER_STYLES.map((style) => style.name),
    );
    expect(productFacts.paper.formats.map((format) => format.name)).toEqual(
      PAPER_FORMATS.map((format) => format.name),
    );
    expect(productFacts.paper.orientations.map((orientation) => orientation.name)).toEqual(
      PAPER_ORIENTATIONS.map((orientation) => orientation.name),
    );
  });

  it('keeps export, persistence, contact, and canonical facts centralized', () => {
    expect(productFacts.exportFormats.map((format) => format.label)).toEqual([
      'PDF Document',
      'PNG Image',
      'JPG Image',
    ]);
    expect(productFacts.browserDraft.storageKey).toBe('text2ink.editor.state');
    expect(siteFacts.contactEmail).toBe('rasagyavatsal16@gmail.com');
    expect(siteFacts.canonicalBaseUrl).toBe('https://text2ink.com');
  });
});
