import { describe, expect, it } from 'vitest';
import {
  computeKeyboardObstructionHeight,
  resolveMobilePreviewScrollInset,
} from '@/lib/mobilePreviewScrollInset';

describe('mobile preview scroll inset', () => {
  it('derives keyboard obstruction height from the visible viewport overlap', () => {
    expect(
      computeKeyboardObstructionHeight({
        layoutViewportHeight: 844,
        visualViewportHeight: 568,
        visualViewportOffsetTop: 0,
      }),
    ).toBe(276);
  });

  it('ignores focus-only viewport readings that do not report a bottom overlap', () => {
    expect(
      computeKeyboardObstructionHeight({
        layoutViewportHeight: 844,
        visualViewportHeight: 794,
        visualViewportOffsetTop: 50,
      }),
    ).toBe(0);
  });

  it('keeps using the control sheet inset when preview editing has no keyboard overlap', () => {
    expect(
      resolveMobilePreviewScrollInset({
        controlSheetInset: 312,
        isPreviewEditing: true,
        keyboardObstructionHeight: 0,
      }),
    ).toEqual({
      source: 'control-sheet',
      inset: 312,
      obstructionHeight: 312,
      keyboardObstructionHeight: 0,
    });
  });

  it('uses the keyboard scroll inset even when the control sheet contributes no inset', () => {
    expect(
      resolveMobilePreviewScrollInset({
        controlSheetInset: 0,
        isPreviewEditing: true,
        keyboardObstructionHeight: 276,
      }),
    ).toEqual({
      source: 'keyboard',
      inset: 276,
      obstructionHeight: 276,
      keyboardObstructionHeight: 276,
    });
  });

  it('replaces the control sheet inset with a keyboard scroll inset during preview editing', () => {
    expect(
      resolveMobilePreviewScrollInset({
        controlSheetInset: 312,
        isPreviewEditing: true,
        keyboardObstructionHeight: 276,
      }),
    ).toEqual({
      source: 'keyboard',
      inset: 276,
      obstructionHeight: 276,
      keyboardObstructionHeight: 276,
    });
  });

  it('tracks live keyboard overlap updates by returning the latest obstruction height', () => {
    const firstInset = resolveMobilePreviewScrollInset({
      controlSheetInset: 40,
      isPreviewEditing: true,
      keyboardObstructionHeight: 276,
    });
    const nextInset = resolveMobilePreviewScrollInset({
      controlSheetInset: 40,
      isPreviewEditing: true,
      keyboardObstructionHeight: 224,
    });

    expect(firstInset.inset).toBe(276);
    expect(nextInset.inset).toBe(224);
  });
});
