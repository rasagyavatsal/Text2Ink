import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BodyTextEditor from '../BodyTextEditor';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import { createExportPageElement } from '@/lib/domExport';

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

  it('uses the same printable body coordinates as export at logical scale', () => {
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

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' }) as HTMLElement;
    const exportPage = createExportPageElement({
      pageIndex: 0,
      pageText: 'Hello',
      pageSettings,
      settings: DEFAULT_SETTINGS,
      fontFamily: 'Caveat',
    });
    const exportBody = exportPage.querySelector<HTMLElement>('[data-export-layer="body"]');

    expect(editor.dataset.printableLayer).toBe('body');
    expect(exportBody?.style.left).toBe(editor.style.left);
    expect(exportBody?.style.top).toBe(editor.style.top);
    expect(exportBody?.style.width).toBe(editor.style.width);
    expect(exportBody?.style.height).toBe(editor.style.height);
    expect(exportBody?.style.fontSize).toBe(editor.style.fontSize);
    expect(exportBody?.style.lineHeight).toBe(editor.style.lineHeight);
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
});
