import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CanvasPreview from '../CanvasPreview';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

const { paintPage, computeCharacterPositions, paintCursorOverlay, paintSelectionOverlay } = vi.hoisted(() => ({
  paintPage: vi.fn(),
  computeCharacterPositions: vi.fn(),
  paintCursorOverlay: vi.fn(),
  paintSelectionOverlay: vi.fn(),
}));
const getBoundingClientRectSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect');

vi.mock('@/lib/renderer/UnifiedPagePainter', () => ({
  UnifiedPagePainter: {
    paintPage,
    computeCharacterPositions,
    paintCursorOverlay,
    paintSelectionOverlay,
  },
}));

const defaultProps = {
  lines: [{ text: 'Hi', lineIndex: 0, hasNewline: false }],
  pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
  settings: DEFAULT_SETTINGS,
  textFields: [],
  pageIndex: 0,
  previewScale: 1,
  fontFamily: 'Caveat, cursive',
};

describe('CanvasPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    computeCharacterPositions.mockReturnValue({
      mainPositions: [
        { x: 0, y: 0, width: 10, height: 20, lineIndex: 0, charIndex: 0 },
        { x: 10, y: 0, width: 10, height: 20, lineIndex: 0, charIndex: 1 },
      ],
      textFieldPositions: new Map(),
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
    } as DOMRect);
  });

  it('renders a canvas element', () => {
    render(<CanvasPreview {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeDefined();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('sets the canvas aria-label for accessibility', () => {
    render(<CanvasPreview {...defaultProps} pageIndex={2} />);
    const canvas = screen.getByRole('img');
    expect(canvas.getAttribute('aria-label')).toContain('Page 3');
  });

  it('stops mouse down from bubbling to the parent', async () => {
    const parentMouseDown = vi.fn();
    render(
      <div onMouseDown={parentMouseDown}>
        <CanvasPreview {...defaultProps} />
      </div>
    );

    fireEvent.mouseDown(screen.getByRole('img'));

    expect(parentMouseDown).not.toHaveBeenCalled();
  });

  it('does not fire char click after a drag selection', async () => {
    const onCharClick = vi.fn();
    const onCharMouseDown = vi.fn();
    const onCharMouseMove = vi.fn();

    render(
      <CanvasPreview
        {...defaultProps}
        onCharClick={onCharClick}
        onCharMouseDown={onCharMouseDown}
        onCharMouseMove={onCharMouseMove}
      />
    );

    const canvas = screen.getByRole('img');
    fireEvent.mouseDown(canvas, { clientX: 4, clientY: 5 });
    fireEvent.mouseMove(canvas, { clientX: 14, clientY: 5 });
    fireEvent.mouseUp(canvas);
    fireEvent.click(canvas, { clientX: 14, clientY: 5 });

    expect(onCharMouseDown).toHaveBeenCalledWith(0, true);
    expect(onCharMouseMove).toHaveBeenCalledWith(1, true);
    expect(onCharClick).not.toHaveBeenCalled();
  });

  it('routes double and triple clicks to the selection handlers', async () => {
    const onCharDoubleClick = vi.fn();
    const onCharTripleClick = vi.fn();

    render(
      <CanvasPreview
        {...defaultProps}
        onCharDoubleClick={onCharDoubleClick}
        onCharTripleClick={onCharTripleClick}
      />
    );

    const canvas = screen.getByRole('img');
    fireEvent.doubleClick(canvas, { clientX: 4, clientY: 5 });
    fireEvent.click(canvas, { clientX: 4, clientY: 5, detail: 3 });

    await waitFor(() => expect(onCharDoubleClick).toHaveBeenCalledWith(0, true));
    expect(onCharTripleClick).toHaveBeenCalledWith(0, true);
  });

  it('clears drag state when mouseup happens outside the canvas', () => {
    const onCharClick = vi.fn();

    render(<CanvasPreview {...defaultProps} onCharClick={onCharClick} onCharMouseMove={vi.fn()} onCharMouseDown={vi.fn()} />);

    const canvas = screen.getByRole('img');
    fireEvent.mouseDown(canvas, { clientX: 4, clientY: 5 });
    fireEvent.mouseMove(canvas, { clientX: 14, clientY: 5 });
    fireEvent.mouseUp(window);
    fireEvent.click(canvas, { clientX: 4, clientY: 5 });

    expect(onCharClick).toHaveBeenCalledWith(0, true);
  });

  it('paints the focused text field cursor and selection using computed character positions', () => {
    const textFieldPositions = new Map([
      [
        'tf1',
        [
          { x: 100, y: 120, width: 10, height: 20, lineIndex: 10000, charIndex: 0, selectionX: 100, selectionY: 122, selectionWidth: 10, selectionHeight: 18 },
          { x: 110, y: 120, width: 10, height: 20, lineIndex: 10000, charIndex: 1, selectionX: 110, selectionY: 122, selectionWidth: 10, selectionHeight: 18 },
        ],
      ],
    ]);

    computeCharacterPositions.mockReturnValue({
      mainPositions: [
        { x: 0, y: 0, width: 10, height: 20, lineIndex: 0, charIndex: 0 },
      ],
      textFieldPositions,
    });

    render(
      <CanvasPreview
        {...defaultProps}
        textFields={[{ id: 'tf1', x: 100, y: 120, text: 'ab', pageIndex: 0 }]}
        focusedTextFieldId="tf1"
        textFieldSelectionStart={0}
        textFieldSelectionEnd={2}
        textFieldCursorPosition={2}
        isTextFieldFocused
      />
    );

    expect(computeCharacterPositions).toHaveBeenCalled();
    expect(paintSelectionOverlay).toHaveBeenCalledWith(
      expect.anything(),
      textFieldPositions.get('tf1'),
      0,
      2,
      expect.any(String),
    );
    expect(paintCursorOverlay).toHaveBeenCalledWith(
      expect.anything(),
      textFieldPositions.get('tf1'),
      2,
      expect.any(String),
    );
  });
});
