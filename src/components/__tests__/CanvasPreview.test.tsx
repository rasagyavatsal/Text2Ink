import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CanvasPreview, { resolveCanvasInsertionPoint } from '../CanvasPreview';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import { withTestPaperSelection } from '@/test/paperTestHelpers';
import type { CharacterPosition } from '@/lib/renderer/UnifiedPagePainter';

const { renderPage, paintCursorOverlay, paintSelectionOverlay } = vi.hoisted(() => ({
  renderPage: vi.fn(),
  paintCursorOverlay: vi.fn(),
  paintSelectionOverlay: vi.fn(),
}));
const getBoundingClientRectSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect');

vi.mock('@/lib/renderer/PageRenderEngine', () => ({
  pageRenderEngine: {
    renderPage,
  },
}));

vi.mock('@/lib/renderer/UnifiedPagePainter', () => ({
  UnifiedPagePainter: {
    paintCursorOverlay,
    paintSelectionOverlay,
  },
}));

const defaultProps = {
  lines: [{ text: 'Hi', lineIndex: 0, hasNewline: false }],
  pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
  settings: DEFAULT_SETTINGS,
  pageIndex: 0,
  previewScale: 1,
  fontFamily: 'Caveat, cursive',
};

const withResolvedPaperPreset = withTestPaperSelection;

const insertionPositions: CharacterPosition[] = [
  { x: 10, y: 20, width: 10, height: 16, lineIndex: 0, charIndex: 0 },
  { x: 24, y: 20, width: 10, height: 16, lineIndex: 0, charIndex: 1 },
  { x: 10, y: 50, width: 10, height: 16, lineIndex: 1, charIndex: 0 },
  { x: 24, y: 50, width: 10, height: 16, lineIndex: 1, charIndex: 1 },
];

async function renderCanvasPreviewWithPointerHandlers(
  props: Partial<React.ComponentProps<typeof CanvasPreview>> = {}
) {
  const handlers = {
    onCharClick: vi.fn(),
    onCharMouseDown: vi.fn(),
    onCharMouseMove: vi.fn(),
  };
  const result = render(<CanvasPreview {...defaultProps} {...handlers} {...props} />);
  await waitFor(() => expect(renderPage).toHaveBeenCalled());
  const canvas = result.container.querySelector('canvas');
  expect(canvas).not.toBeNull();
  return { ...result, ...handlers, canvas: canvas! };
}

describe('resolveCanvasInsertionPoint', () => {
  it('handles text taps and character half selection', () => {
    expect(resolveCanvasInsertionPoint(insertionPositions, 12, 24)).toEqual({
      index: 0,
      isLeftHalf: true,
    });
    expect(resolveCanvasInsertionPoint(insertionPositions, 18, 24)).toEqual({
      index: 0,
      isLeftHalf: false,
    });
  });

  it('uses the nearest insertion point for whitespace on the tapped line', () => {
    expect(resolveCanvasInsertionPoint(insertionPositions, 0, 24)).toEqual({
      index: 0,
      isLeftHalf: true,
    });
    expect(resolveCanvasInsertionPoint(insertionPositions, 80, 24)).toEqual({
      index: 1,
      isLeftHalf: false,
    });
    expect(resolveCanvasInsertionPoint(insertionPositions, 80, 54)).toEqual({
      index: 3,
      isLeftHalf: false,
    });
  });

  it('maps blank space above and below the text to document bounds', () => {
    expect(resolveCanvasInsertionPoint(insertionPositions, 80, 4)).toEqual({
      index: 0,
      isLeftHalf: true,
    });
    expect(resolveCanvasInsertionPoint(insertionPositions, 80, 90)).toEqual({
      index: insertionPositions.length,
      isLeftHalf: true,
    });
  });
});

describe('CanvasPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderPage.mockResolvedValue({
      layout: {} as never,
      characterPositions: [
        { x: 0, y: 0, width: 10, height: 20, lineIndex: 0, charIndex: 0 },
        { x: 10, y: 0, width: 10, height: 20, lineIndex: 0, charIndex: 1 },
      ],
      pendingBackground: null,
    });
    getBoundingClientRectSpy.mockReturnValue({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  it('renders a canvas element', () => {
    const { container } = render(<CanvasPreview {...defaultProps} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.tagName).toBe('CANVAS');
  });

  it('sets the canvas aria-label for accessibility', () => {
    const { container } = render(<CanvasPreview {...defaultProps} pageIndex={2} />);
    const canvas = container.querySelector('canvas');
    expect(canvas?.getAttribute('aria-label')).toContain('Page 3');
  });

  it('stops pointer and mouse down from bubbling to the parent', async () => {
    const parentMouseDown = vi.fn();
    const parentPointerDown = vi.fn();
    const { container } = render(
      <button
        type="button"
        onMouseDown={parentMouseDown}
        onPointerDown={parentPointerDown}
        aria-label="Parent container"
      >
        <CanvasPreview {...defaultProps} />
      </button>
    );
    await waitFor(() => expect(renderPage).toHaveBeenCalled());

    const canvas = container.querySelector('canvas')!;
    fireEvent.pointerDown(canvas, { pointerId: 1 });
    fireEvent.mouseDown(canvas);

    expect(parentPointerDown).not.toHaveBeenCalled();
    expect(parentMouseDown).not.toHaveBeenCalled();
  });

  it('does not fire char click after a drag selection', async () => {
    const { canvas, onCharClick, onCharMouseDown, onCharMouseMove } =
      await renderCanvasPreviewWithPointerHandlers();
    fireEvent.pointerDown(canvas, { clientX: 4, clientY: 5, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 14, clientY: 5, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.click(canvas, { clientX: 14, clientY: 5 });

    expect(onCharMouseDown).toHaveBeenCalledWith(0, true);
    expect(onCharMouseMove).toHaveBeenCalledWith(1, true);
    expect(onCharClick).not.toHaveBeenCalled();
  });

  it('keeps small pointer movement below the drag threshold as a caret click', async () => {
    const { canvas, onCharClick, onCharMouseDown, onCharMouseMove } =
      await renderCanvasPreviewWithPointerHandlers();
    fireEvent.pointerDown(canvas, { clientX: 4, clientY: 5, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 8, clientY: 7, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.click(canvas, { clientX: 4, clientY: 5 });

    expect(onCharMouseDown).toHaveBeenCalledWith(0, true);
    expect(onCharMouseMove).not.toHaveBeenCalled();
    expect(onCharClick).toHaveBeenCalledWith(0, true);
  });

  it('routes double and triple clicks to the selection handlers', async () => {
    const onCharDoubleClick = vi.fn();
    const onCharTripleClick = vi.fn();

    const { container } = render(
      <CanvasPreview
        {...defaultProps}
        onCharDoubleClick={onCharDoubleClick}
        onCharTripleClick={onCharTripleClick}
      />
    );
    await waitFor(() => expect(renderPage).toHaveBeenCalled());

    const canvas = container.querySelector('canvas')!;
    fireEvent.doubleClick(canvas, { clientX: 4, clientY: 5 });
    fireEvent.click(canvas, { clientX: 4, clientY: 5, detail: 3 });

    await waitFor(() => expect(onCharDoubleClick).toHaveBeenCalledWith(0, true));
    expect(onCharTripleClick).toHaveBeenCalledWith(0, true);
  });

  it('clears drag state when mouseup happens outside the canvas', () => {
    return renderCanvasPreviewWithPointerHandlers().then(({ canvas, onCharClick }) => {
      fireEvent.pointerDown(canvas, { clientX: 4, clientY: 5, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 14, clientY: 5, pointerId: 1 });
      fireEvent.pointerUp(globalThis as unknown as Window, { pointerId: 1 });
      fireEvent.click(canvas, { clientX: 4, clientY: 5 });

      expect(onCharClick).toHaveBeenCalledWith(0, true);
    });
  });

  it('sizes the preview canvas from the resolved document paper geometry', () => {
    const { container } = render(
      <CanvasPreview
        {...defaultProps}
        previewScale={1}
        settings={withResolvedPaperPreset({
          paperFormat: 'a4',
          paperOrientation: 'landscape',
        })}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveStyle({
      width: '841.89px',
      height: '595.28px',
    });
  });

});
