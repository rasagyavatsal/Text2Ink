import { describe, it, expect } from 'vitest';
import { 
  calculatePageStartOffsets, 
  calculateLineStarts,
} from '../editorHelpers';

describe('editorHelpers', () => {
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
