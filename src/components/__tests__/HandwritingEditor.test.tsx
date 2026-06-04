import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HandwritingEditor from '../HandwritingEditor';
import type { CanvasPreviewProps } from '../CanvasPreview';
import { HandwritingSettings, DEFAULT_SETTINGS } from '../../lib/types';

vi.mock('../CanvasPreview', () => ({
  default: (props: CanvasPreviewProps) => (
    <div data-testid="canvas-preview">
      <div data-testid="preview-lines">{props.lines.length}</div>
      <div data-testid="preview-selection">{`${props.selectionStart}:${props.selectionEnd}`}</div>
      <button
        type="button"
        data-testid="single-click"
        onClick={(e) => {
          e.stopPropagation();
          props.onCharClick?.(2, false);
        }}
      />
      <button
        type="button"
        data-testid="shift-click"
        onClick={(e) => {
          e.stopPropagation();
          props.onCharShiftClick?.(8, true);
        }}
      />
      <button
        type="button"
        data-testid="double-click"
        onClick={(e) => {
          e.stopPropagation();
          props.onCharDoubleClick?.(7, true);
        }}
      />
      <button
        type="button"
        data-testid="triple-click"
        onClick={(e) => {
          e.stopPropagation();
          props.onCharTripleClick?.(1, true);
        }}
      />
      <button
        type="button"
        data-testid="drag-start"
        onMouseDown={(e) => {
          e.stopPropagation();
          props.onCharMouseDown?.(2, false);
        }}
      />
      <button
        type="button"
        data-testid="drag-move"
        onMouseMove={(e) => {
          e.stopPropagation();
          props.onCharMouseMove?.(5, true);
        }}
      />
      <button
        type="button"
        data-testid="drag-end"
        onMouseUp={(e) => {
          e.stopPropagation();
          props.onMouseUp?.();
        }}
      />
    </div>
  ),
}));

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

function buildPagesFromText(text: string) {
  const lines = (text || '').split('\n').map((line, index, all) => ({
    text: line,
    lineIndex: index,
    hasNewline: index < all.length - 1,
  }));
  return [lines];
}

class MockWorker {
  private readonly listeners = new Set<(event: MessageEvent) => void>();

  postMessage = vi.fn((msg: { requestId?: number; text?: string; type?: string }) => {
    if (msg?.type !== 'paginate') return;
    const pages = buildPagesFromText(msg.text ?? '');
    const event = {
      data: {
        type: 'pagination-result',
        requestId: msg.requestId,
        pages,
        isPaginationComplete: true,
        totalPages: pages.length,
      },
    } as MessageEvent;
    setTimeout(() => {
      this.listeners.forEach((listener) => listener(event));
    }, 0);
  });

  terminate = vi.fn();
  addEventListener = vi.fn((type: string, listener: (event: MessageEvent) => void) => {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  });
  removeEventListener = vi.fn((type: string, listener: (event: MessageEvent) => void) => {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  });
}

globalThis.Worker = MockWorker as any;

describe('HandwritingEditor selection behavior', () => {
  const settings: HandwritingSettings = {
    ...DEFAULT_SETTINGS,
    randomness: { enabled: false, spacing: 0, baseline: 0, rotation: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderEditor(text = 'hello world\nSecond line') {
    render(
      <HandwritingEditor
        text={text}
        settings={settings}
        onTextChange={vi.fn()}
        onSettingsChange={vi.fn()}
        pageSettingsByPage={[]}
        previewScale={1}
        onPreviewScaleChange={vi.fn()}
        currentPageIndex={0}
        onCurrentPageChange={vi.fn()}
        onTotalPagesChange={vi.fn()}
      />
    );
  }

  it('uses the clicked half of a character when placing the caret', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));

    fireEvent.click(screen.getByTestId('single-click'));

    expect(screen.getByTestId('preview-selection')).toHaveTextContent('3:3');
  });

  it('extends the selection from the current cursor on shift-click', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));

    fireEvent.click(screen.getByTestId('single-click'));
    fireEvent.click(screen.getByTestId('shift-click'));

    expect(screen.getByTestId('preview-selection')).toHaveTextContent('3:8');
  });

  it('selects a word on double-click and a line on triple-click', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));

    fireEvent.click(screen.getByTestId('double-click'));
    expect(screen.getByTestId('preview-selection')).toHaveTextContent('6:11');

    fireEvent.click(screen.getByTestId('triple-click'));
    expect(screen.getByTestId('preview-selection')).toHaveTextContent('0:11');
  });

  it('selects the current page on Ctrl+A', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));

    fireEvent.keyDown(screen.getByLabelText('Handwriting text input'), {
      key: 'a',
      ctrlKey: true,
    });

    expect(screen.getByTestId('preview-selection')).toHaveTextContent('0:23');
  });

  it.each([
    ['Enter', 'Enter'],
    ['Space', ' '],
  ])('keeps %s inside the handwriting textarea', async (_label, key) => {
    const focusSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'focus').mockImplementation(() => {});

    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));
    await waitFor(() => expect(focusSpy).toHaveBeenCalled());

    focusSpy.mockClear();
    fireEvent.keyDown(screen.getByLabelText('Handwriting text input'), {
      key,
      code: key === 'Enter' ? 'Enter' : 'Space',
    });

    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it('preserves a drag selection when the page div is clicked after mouseup', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));

    fireEvent.mouseDown(screen.getByTestId('drag-start'));
    fireEvent.mouseMove(screen.getByTestId('drag-move'));
    fireEvent.mouseUp(screen.getByTestId('drag-end'));

    expect(screen.getByTestId('preview-selection')).toHaveTextContent('3:5');

    fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));

    expect(screen.getByTestId('preview-selection')).toHaveTextContent('3:5');
  });

  it('disables spellcheck on the hidden textarea', () => {
    renderEditor();
    const textarea = screen.getByLabelText('Handwriting text input');
    expect(textarea.getAttribute('spellcheck')).toBe('false');
  });

  it('notifies the shell when main text typing starts', () => {
    const onTypingFocus = vi.fn();
    render(
      <HandwritingEditor
        text="hello"
        settings={settings}
        onTextChange={vi.fn()}
        onSettingsChange={vi.fn()}
        pageSettingsByPage={[]}
        previewScale={1}
        onPreviewScaleChange={vi.fn()}
        currentPageIndex={0}
        onCurrentPageChange={vi.fn()}
        onTotalPagesChange={vi.fn()}
        onTypingFocus={onTypingFocus}
      />
    );

    fireEvent.focus(screen.getByLabelText('Handwriting text input'));

    expect(onTypingFocus).toHaveBeenCalled();
  });
});
