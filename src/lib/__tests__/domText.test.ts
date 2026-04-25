import { describe, expect, it } from 'vitest';
import {
  extractPlainTextFromContentEditable,
  normalizePastedPlainText,
  replaceSourceTextSlice,
} from '../domText';

describe('domText', () => {
  it('extracts plain text from common contenteditable DOM shapes', () => {
    const root = document.createElement('div');
    root.innerHTML = 'One<div>Two<br>Three</div><div><br></div>';

    expect(extractPlainTextFromContentEditable(root)).toBe('One\nTwo\nThree\n');
  });

  it('normalizes non-breaking spaces and line endings', () => {
    const root = document.createElement('div');
    root.textContent = 'A\u00a0B\r\nC';

    expect(extractPlainTextFromContentEditable(root)).toBe('A B\nC');
  });

  it('keeps paste text plain while normalizing line endings', () => {
    expect(normalizePastedPlainText('A\r\nB\rC')).toBe('A\nB\nC');
  });

  it('replaces only the requested source text slice', () => {
    expect(replaceSourceTextSlice('first\nsecond', 6, 12, 'changed')).toBe('first\nchanged');
  });
});
