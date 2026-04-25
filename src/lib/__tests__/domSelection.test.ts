import { describe, expect, it } from 'vitest';
import {
  getSelectionOffsets,
  pageToGlobalOffsets,
  restoreSelectionFromOffsets,
} from '../domSelection';

describe('domSelection', () => {
  it('maps native selection to page-local plain text offsets', () => {
    const root = document.createElement('div');
    root.innerHTML = 'One<div>Two</div>';
    document.body.appendChild(root);

    const textNode = root.querySelector('div')!.firstChild!;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 3);
    selection.removeAllRanges();
    selection.addRange(range);

    expect(getSelectionOffsets(root)).toEqual({ anchor: 5, focus: 7 });
    root.remove();
  });

  it('restores selection from page-local plain text offsets', () => {
    const root = document.createElement('div');
    root.innerHTML = 'One<div>Two</div>';
    document.body.appendChild(root);

    restoreSelectionFromOffsets(root, 5, 7);
    expect(getSelectionOffsets(root)).toEqual({ anchor: 5, focus: 7 });
    root.remove();
  });

  it('converts page-local offsets to global offsets', () => {
    expect(pageToGlobalOffsets(10, { anchor: 2, focus: 5 })).toEqual({ anchor: 12, focus: 15 });
  });
});
