import { describe, it, expect } from 'vitest';
import { 
  seededRandom, 
  calculateRandomStyle, 
  calculatePageStartOffsets, 
  calculateLineStarts,
} from '../editorHelpers';

describe('editorHelpers', () => {
  describe('seededRandom', () => {
    it('returns consistent values for same seed', () => {
      expect(seededRandom(1)).toBe(seededRandom(1));
      expect(seededRandom(2)).not.toBe(seededRandom(1));
    });

    it('returns values between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const val = seededRandom(i);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('calculateRandomStyle', () => {
    const randomness = {
      enabled: true,
      spacing: 2,
      baseline: 1,
      rotation: 0.5,
    };

    it('returns none when disabled', () => {
      const result = calculateRandomStyle(0, 0, { ...randomness, enabled: false });
      expect(result.style.transform).toBe('none');
      expect(result.style.marginLeft).toBe('0px');
    });

    it('returns variation when enabled', () => {
      const result = calculateRandomStyle(0, 0, randomness);
      expect(result.style.transform).toContain('translateY');
      expect(result.style.transform).toContain('rotate');
      expect(result.style.marginLeft).not.toBe('0px');
    });
  });

  describe('page offsets', () => {
    const pages = [
      [
        { text: 'abc', lineIndex: 0, hasNewline: true },
        { text: 'def', lineIndex: 1, hasNewline: false },
      ],
      [
        { text: 'ghi', lineIndex: 2, hasNewline: false },
      ]
    ];

    it('calculatePageStartOffsets returns correct offsets', () => {
      // Page 0: "abc\ndef" (3 + 1 + 3 = 7 chars)
      // Page 1: "ghi" (3 chars)
      const offsets = calculatePageStartOffsets(pages);
      expect(offsets).toEqual([0, 7, 10]);
    });

    it('calculateLineStarts returns correct starts', () => {
      const starts = calculateLineStarts(pages[0], 0);
      expect(starts).toEqual([0, 4]); // "abc\n" (4 chars) then "def"
    });
  });

});
