import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as LayoutEngine from '@/lib/layout/LayoutEngine';
import HandwritingEditor from '../HandwritingEditor';
import type { CanvasPreviewProps } from '../CanvasPreview';
import { HandwritingSettings, DEFAULT_SETTINGS } from '../../lib/types';

vi.mock('@/lib/layout/LayoutEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/layout/LayoutEngine')>();
  return {
    ...actual,
    paginateDocument: vi.fn(actual.paginateDocument),
  };
});

vi.mock('../CanvasPreview', () => ({
  default: (props: CanvasPreviewProps) => (
    <div data-testid="canvas-preview">
      <div data-testid="preview-lines">{props.lines.length}</div>
      <div data-testid="preview-cursor">{props.cursorPosition ?? 'null'}</div>
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
        data-testid="later-click"
        onClick={(e) => {
          e.stopPropagation();
          props.onCharClick?.(8, false);
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
        data-testid="backward-shift-click"
        onClick={(e) => {
          e.stopPropagation();
          props.onCharShiftClick?.(2, true);
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
        data-testid="drag-back-start"
        onMouseDown={(e) => {
          e.stopPropagation();
          props.onCharMouseDown?.(5, false);
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
        data-testid="drag-back-move"
        onMouseMove={(e) => {
          e.stopPropagation();
          props.onCharMouseMove?.(2, true);
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function installDocumentFonts(ready: Promise<unknown> = Promise.resolve(undefined)) {
  const fontSet = {
    ready,
    load: vi.fn().mockResolvedValue([]),
    add: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: fontSet,
  });
  return fontSet;
}

describe('HandwritingEditor selection behavior', () => {
  const settings: HandwritingSettings = {
    ...DEFAULT_SETTINGS,
    randomness: { enabled: false, spacing: 0, baseline: 0, rotation: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    installDocumentFonts();
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        throw new Error('HandwritingEditor should paginate without Worker');
      }),
    });
  });

  function editorProps(text = 'hello world\nSecond line', overrideSettings: HandwritingSettings = settings) {
    return {
      text,
      settings: overrideSettings,
      onTextChange: vi.fn(),
      onSettingsChange: vi.fn(),
      pageSettingsByPage: [],
      previewScale: 1,
      currentPageIndex: 0,
      onCurrentPageChange: vi.fn(),
      onTotalPagesChange: vi.fn(),
    };
  }

  function renderEditor(text = 'hello world\nSecond line', overrideSettings: HandwritingSettings = settings) {
    return render(
      <HandwritingEditor
        {...editorProps(text, overrideSettings)}
      />
    );
  }

  it('paginates on the main thread after fonts are ready without constructing a Worker', async () => {
    const ready = createDeferred<undefined>();
    const fontSet = installDocumentFonts(ready.promise);
    const paginateDocument = vi.mocked(LayoutEngine.paginateDocument);
    paginateDocument.mockClear();
    const WorkerConstructor = vi.mocked(globalThis.Worker);

    renderEditor();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(paginateDocument).not.toHaveBeenCalled();
    expect(screen.getByTestId('preview-lines')).toHaveTextContent('0');

    await act(async () => {
      ready.resolve(undefined);
      await ready.promise;
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));
    expect(WorkerConstructor).not.toHaveBeenCalled();
    expect(fontSet.load).toHaveBeenCalledWith(expect.stringContaining("'Caveat'"));
  });

  it('re-paginates when font family or randomness changes', async () => {
    const fontSet = installDocumentFonts();
    const paginateDocument = vi.mocked(LayoutEngine.paginateDocument);
    paginateDocument.mockClear();

    const { rerender } = renderEditor('abcdefghij klmnopqrst');
    await waitFor(() => expect(paginateDocument).toHaveBeenCalled());
    const initialCalls = paginateDocument.mock.calls.length;

    rerender(
      <HandwritingEditor
        {...editorProps('abcdefghij klmnopqrst', {
          ...settings,
          fontFamily: 'snake',
        })}
      />,
    );
    await waitFor(() => expect(paginateDocument.mock.calls.length).toBeGreaterThan(initialCalls));
    expect(fontSet.load).toHaveBeenCalledWith(expect.stringContaining("'Snake'"));
    const afterFontCalls = paginateDocument.mock.calls.length;

    rerender(
      <HandwritingEditor
        {...editorProps('abcdefghij klmnopqrst', {
          ...settings,
          fontFamily: 'snake',
          randomness: { enabled: true, spacing: 4, baseline: 0, rotation: 0 },
        })}
      />,
    );
    await waitFor(() => expect(paginateDocument.mock.calls.length).toBeGreaterThan(afterFontCalls));
    expect(paginateDocument.mock.calls.at(-1)?.[0].settings.randomness).toEqual({
      enabled: true,
      spacing: 4,
      baseline: 0,
      rotation: 0,
    });
  });

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

  it('keeps backward shift-click selection direction and caret focus', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));

    fireEvent.click(screen.getByTestId('later-click'));
    fireEvent.click(screen.getByTestId('backward-shift-click'));

    const textarea = screen.getByLabelText('Handwriting text input') as HTMLTextAreaElement;
    expect(screen.getByTestId('preview-selection')).toHaveTextContent('2:9');
    expect(screen.getByTestId('preview-cursor')).toHaveTextContent('2');
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(9);
    expect(textarea.selectionDirection).toBe('backward');
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

  it('keeps backward canvas drag selection direction in the hidden textarea', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));

    fireEvent.mouseDown(screen.getByTestId('drag-back-start'));
    fireEvent.mouseMove(screen.getByTestId('drag-back-move'));
    fireEvent.mouseUp(screen.getByTestId('drag-end'));

    const textarea = screen.getByLabelText('Handwriting text input') as HTMLTextAreaElement;
    expect(screen.getByTestId('preview-selection')).toHaveTextContent('2:6');
    expect(screen.getByTestId('preview-cursor')).toHaveTextContent('2');
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(6);
    expect(textarea.selectionDirection).toBe('backward');
  });

  it('disables spellcheck on the hidden textarea', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('2'));
    const textarea = screen.getByLabelText('Handwriting text input');
    expect(textarea.getAttribute('spellcheck')).toBe('false');
  });

  it('notifies the shell when main text typing starts', async () => {
    const onTypingFocus = vi.fn();
    render(
      <HandwritingEditor
        text="hello"
        settings={settings}
        onTextChange={vi.fn()}
        onSettingsChange={vi.fn()}
        pageSettingsByPage={[]}
        previewScale={1}
        currentPageIndex={0}
        onCurrentPageChange={vi.fn()}
        onTotalPagesChange={vi.fn()}
        onTypingFocus={onTypingFocus}
      />
    );
    await waitFor(() => expect(screen.getByTestId('preview-lines')).toHaveTextContent('1'));

    fireEvent.focus(screen.getByLabelText('Handwriting text input'));

    expect(onTypingFocus).toHaveBeenCalled();
  });
});
