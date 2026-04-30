import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HandwritingEditor from '../HandwritingEditor';
import type { CanvasPreviewProps } from '../CanvasPreview';
import { DEFAULT_SETTINGS, HandwritingSettings } from '../../lib/types';

vi.mock('../CanvasPreview', () => ({
  default: (props: CanvasPreviewProps) => (
    <div data-testid="canvas-preview">
      <div data-testid="preview-lines">{props.lines.length}</div>
      <div data-testid="preview-render-body">{String(props.renderBodyText)}</div>
    </div>
  ),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('HandwritingEditor DOM body editor', () => {
  const settings: HandwritingSettings = {
    ...DEFAULT_SETTINGS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the body text as a plaintext contenteditable page surface', async () => {
    render(
      <HandwritingEditor
        text="hello world"
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

    const bodyEditor = await screen.findByRole('textbox', { name: 'Handwriting body editor' });
    await waitFor(() => expect(bodyEditor).toHaveTextContent('hello world'));
    expect(bodyEditor).toHaveAttribute('contenteditable', 'plaintext-only');
    expect(bodyEditor).toHaveAttribute('spellcheck', 'false');
    expect(screen.queryByLabelText('Handwriting text input')).toBeNull();
    expect(screen.getByTestId('preview-render-body')).toHaveTextContent('false');
  });

  it('emits edited plain text through the document source text callback', async () => {
    const onTextChange = vi.fn();
    render(
      <HandwritingEditor
        text="hello"
        settings={settings}
        onTextChange={onTextChange}
        onSettingsChange={vi.fn()}
        pageSettingsByPage={[]}
        previewScale={1}
        onPreviewScaleChange={vi.fn()}
        currentPageIndex={0}
        onCurrentPageChange={vi.fn()}
        onTotalPagesChange={vi.fn()}
      />
    );

    const bodyEditor = await screen.findByRole('textbox', { name: 'Handwriting body editor' });
    await waitFor(() => expect(bodyEditor).toHaveTextContent('hello'));
    bodyEditor.innerHTML = 'hello<div>there</div>';
    fireEvent.input(bodyEditor);

    await waitFor(() => expect(onTextChange).toHaveBeenCalledWith('hello\nthere'));
  });

  it('notifies the shell when preview editing starts and ends in the body editor', async () => {
    const onPreviewEditingChange = vi.fn();
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
        onPreviewEditingChange={onPreviewEditingChange}
      />
    );

    const bodyEditor = await screen.findByRole('textbox', { name: 'Handwriting body editor' });
    fireEvent.focus(bodyEditor);
    fireEvent.blur(bodyEditor);

    expect(onPreviewEditingChange).toHaveBeenNthCalledWith(1, true);
    expect(onPreviewEditingChange).toHaveBeenNthCalledWith(2, false);
  });
});
