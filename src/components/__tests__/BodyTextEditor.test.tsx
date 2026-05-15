import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BodyTextEditor from '../BodyTextEditor';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

describe('BodyTextEditor', () => {
  const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);

  it('renders the page slice in a plaintext contenteditable editor', () => {
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
    expect(editor).toHaveTextContent('Hello');
    expect(editor).toHaveAttribute('spellcheck', 'false');
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

  it('defers source updates during IME composition until compositionend', () => {
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
    expect(onPageTextChange).not.toHaveBeenCalled();

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
