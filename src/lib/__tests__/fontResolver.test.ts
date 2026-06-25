import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { resolveHandwritingFontFamily } from '../fontResolver';

describe('fontResolver', () => {
  it.each([
    ['caveat', "'Caveat', cursive"],
    ['barokah-signature', "'Barokah Signature', cursive"],
    ['bettina-signature', "'Bettina Signature', cursive"],
    ['honey-script', "'HoneyScript', cursive"],
    ['snake', "'Snake', cursive"],
  ])('resolves %s to a concrete canvas font family', (fontFamily, expected) => {
    expect(resolveHandwritingFontFamily({ ...DEFAULT_SETTINGS, fontFamily })).toBe(expected);
    expect(resolveHandwritingFontFamily({ ...DEFAULT_SETTINGS, fontFamily })).not.toBe('cursive');
  });

  it('keeps custom fonts quoted with a cursive fallback', () => {
    expect(
      resolveHandwritingFontFamily({
        ...DEFAULT_SETTINGS,
        fontFamily: 'custom',
        customFont: {
          name: 'Uploaded Font',
          family: 'Text2InkCustom-UploadedFont-1',
          dataUrl: 'data:font/ttf;base64,font',
          format: 'truetype',
        },
      }),
    ).toBe('"Text2InkCustom-UploadedFont-1", cursive');
  });

  it('falls back only for unknown font ids', () => {
    expect(resolveHandwritingFontFamily({ ...DEFAULT_SETTINGS, fontFamily: 'missing-font' })).toBe('cursive');
  });
});
