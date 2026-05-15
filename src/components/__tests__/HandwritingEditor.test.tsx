import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HandwritingEditor from '../HandwritingEditor';
import { DEFAULT_SETTINGS, HandwritingSettings } from '../../lib/types';
import * as pageLayoutModule from '@/lib/pageLayout';

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
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Handwriting text input')).toBeNull();
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

  it('blocks ruled-margin dragging during export lock', async () => {
    const onSettingsChange = vi.fn();
    const onBlockedEditAttempt = vi.fn();
    const originalResolvePageLayout = pageLayoutModule.resolvePageLayout;
    const resolvePageLayout = vi.spyOn(pageLayoutModule, 'resolvePageLayout');
    resolvePageLayout.mockImplementation((opts) => {
      const actual = originalResolvePageLayout(opts);
      return {
        ...actual,
        controls: {
          ...actual.controls,
          showMarginControls: true,
        },
      };
    });

    render(
      <HandwritingEditor
        text="hello"
        settings={{ ...settings, paperStyle: 'ruled' }}
        onTextChange={vi.fn()}
        onSettingsChange={onSettingsChange}
        pageSettingsByPage={[]}
        previewScale={1}
        onPreviewScaleChange={vi.fn()}
        currentPageIndex={0}
        onCurrentPageChange={vi.fn()}
        onTotalPagesChange={vi.fn()}
        isExportLocked
        onBlockedEditAttempt={onBlockedEditAttempt}
      />
    );

    const marginHandle = await screen.findByLabelText(/drag to reposition margin line/i);
    fireEvent.pointerDown(marginHandle, { pointerId: 1, clientX: 80, clientY: 80 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 120, clientY: 80 });

    expect(onBlockedEditAttempt).toHaveBeenCalled();
    expect(onSettingsChange).not.toHaveBeenCalled();

    resolvePageLayout.mockRestore();
  });
});
