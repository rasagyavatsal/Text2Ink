export type PreviewScrollInsetSource = 'none' | 'control-sheet' | 'keyboard';

export interface KeyboardObstructionHeightInput {
  layoutViewportHeight: number;
  visualViewportHeight?: number | null;
  visualViewportOffsetTop?: number | null;
}

export interface ResolveMobilePreviewScrollInsetInput {
  controlSheetInset: number;
  isPreviewEditing: boolean;
  keyboardObstructionHeight: number;
}

export interface MobilePreviewScrollInset {
  source: PreviewScrollInsetSource;
  inset: number;
  obstructionHeight: number;
  keyboardObstructionHeight: number;
}

function normalizeHeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function computeKeyboardObstructionHeight({
  layoutViewportHeight,
  visualViewportHeight,
  visualViewportOffsetTop = 0,
}: KeyboardObstructionHeightInput) {
  const normalizedLayoutViewportHeight = normalizeHeight(layoutViewportHeight);
  const normalizedVisualViewportHeight =
    visualViewportHeight === null || visualViewportHeight === undefined
      ? normalizedLayoutViewportHeight
      : normalizeHeight(visualViewportHeight);
  const normalizedVisualViewportOffsetTop =
    visualViewportOffsetTop === null || visualViewportOffsetTop === undefined
      ? 0
      : normalizeHeight(visualViewportOffsetTop);

  return Math.max(
    0,
    normalizedLayoutViewportHeight - normalizedVisualViewportHeight - normalizedVisualViewportOffsetTop,
  );
}

export function resolveMobilePreviewScrollInset({
  controlSheetInset,
  isPreviewEditing,
  keyboardObstructionHeight,
}: ResolveMobilePreviewScrollInsetInput): MobilePreviewScrollInset {
  const normalizedControlSheetInset = normalizeHeight(controlSheetInset);
  const normalizedKeyboardObstructionHeight = normalizeHeight(keyboardObstructionHeight);

  if (isPreviewEditing && normalizedKeyboardObstructionHeight > 0) {
    return {
      source: 'keyboard',
      inset: normalizedKeyboardObstructionHeight,
      obstructionHeight: normalizedKeyboardObstructionHeight,
      keyboardObstructionHeight: normalizedKeyboardObstructionHeight,
    };
  }

  if (normalizedControlSheetInset > 0) {
    return {
      source: 'control-sheet',
      inset: normalizedControlSheetInset,
      obstructionHeight: normalizedControlSheetInset,
      keyboardObstructionHeight: normalizedKeyboardObstructionHeight,
    };
  }

  return {
    source: 'none',
    inset: 0,
    obstructionHeight: 0,
    keyboardObstructionHeight: normalizedKeyboardObstructionHeight,
  };
}
