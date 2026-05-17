import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BodyTextEditor from '../BodyTextEditor';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

describe('BodyTextEditor', () => {
  const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

  it('renders the page slice in a plaintext input bridge for Preview Editing', () => {
    render(
      <BodyTextEditor
        pageText="Hello"
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={vi.fn()}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    expect(editor).toHaveAttribute('contenteditable', 'plaintext-only');
    expect(editor).toHaveAttribute('data-body-input-bridge', 'true');
    expect(editor).toHaveTextContent('Hello');
    expect(editor).toHaveAttribute('spellcheck', 'false');
    expect(editor).toHaveStyle({ color: 'rgba(0, 0, 0, 0)' });
    expect((editor as HTMLElement).style.caretColor).toBe('transparent');
  });

  it('does not let React rewrite editable text while the editor is focused', () => {
    const { rerender } = render(
      <BodyTextEditor
        pageText="Hello"
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={vi.fn()}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    fireEvent.focus(editor);
    editor.textContent = 'HelXlo';

    rerender(
      <BodyTextEditor
        pageText="Different external text"
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={vi.fn()}
      />
    );

    expect(editor).toHaveTextContent('HelXlo');
  });

  it('emits plain text from contenteditable input', () => {
    const onPageTextChange = vi.fn();
    render(
      <BodyTextEditor
        pageText="Hello"
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={onPageTextChange}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    editor.innerHTML = 'One<div>Two</div>';
    fireEvent.input(editor);

    expect(onPageTextChange).toHaveBeenCalledWith('One\nTwo');
  });

  it('copies and cuts plain text from the selected body range', () => {
    const onPageTextChange = vi.fn();
    render(
      <BodyTextEditor
        pageText="Hello"
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={onPageTextChange}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    const selection = window.getSelection()!;
    const range = document.createRange();
    const textNode = editor.firstChild!;
    range.setStart(textNode, 1);
    range.setEnd(textNode, 4);
    selection.removeAllRanges();
    selection.addRange(range);

    const copyClipboard = { setData: vi.fn() };
    fireEvent.copy(editor, { clipboardData: copyClipboard });
    expect(copyClipboard.setData).toHaveBeenCalledWith('text/plain', 'ell');

    const cutClipboard = { setData: vi.fn() };
    fireEvent.cut(editor, { clipboardData: cutClipboard });
    expect(cutClipboard.setData).toHaveBeenCalledWith('text/plain', 'ell');
    expect(onPageTextChange).toHaveBeenLastCalledWith('Ho');
  });

  it('replaces the selected body range on plain-text paste', () => {
    const onPageTextChange = vi.fn();
    render(
      <BodyTextEditor
        pageText="Hello"
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={onPageTextChange}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    const selection = window.getSelection()!;
    const range = document.createRange();
    const textNode = editor.firstChild!;
    range.setStart(textNode, 1);
    range.setEnd(textNode, 4);
    selection.removeAllRanges();
    selection.addRange(range);

    fireEvent.paste(editor, {
      clipboardData: {
        getData: () => 'ipp',
      },
    });

    expect(onPageTextChange).toHaveBeenLastCalledWith('Hippo');
  });

  it('emits source updates during IME composition so Preview parity can show composition text', () => {
    const onPageTextChange = vi.fn();
    render(
      <BodyTextEditor
        pageText=""
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={onPageTextChange}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    fireEvent.compositionStart(editor);
    editor.textContent = 'あ';
    fireEvent.input(editor);
    expect(onPageTextChange).toHaveBeenCalledWith('あ');

    fireEvent.compositionEnd(editor);
    expect(onPageTextChange).toHaveBeenCalledWith('あ');
  });

  it('blocks document edits during export lock and explains why', () => {
    const onPageTextChange = vi.fn();
    const onBlockedEditAttempt = vi.fn();

    render(
      <BodyTextEditor
        pageText="Hello"
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        scale={1}
        fontFamily="Caveat"
        hasCustomBackground={false}
        onPageTextChange={onPageTextChange}
        isLocked
        onBlockedEditAttempt={onBlockedEditAttempt}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    expect(editor).toHaveAttribute('contenteditable', 'false');

    fireEvent.mouseDown(editor);
    editor.textContent = 'Blocked';
    fireEvent.input(editor);

    expect(onBlockedEditAttempt).toHaveBeenCalled();
    expect(onPageTextChange).not.toHaveBeenCalled();
  });
});
