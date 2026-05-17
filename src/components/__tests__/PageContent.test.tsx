import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PageContent from '../PageContent';
import TextField from '../TextField/TextField';
import { DEFAULT_SETTINGS, type PageSettings, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import { resolvePageLayout } from '@/lib/pageLayout';

describe('PageContent', () => {
  it('renders committed body lines from app-owned line data', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const layout = resolvePageLayout({
      settings: DEFAULT_SETTINGS,
      pageSettings,
      pageIndex: 0,
    });

    const { container } = render(
      <PageContent
        pageIndex={0}
        pageText={'Alpha Beta'}
        pageLines={[
          { text: 'Alpha ', lineIndex: 0, hasNewline: false },
          { text: 'Beta', lineIndex: 1, hasNewline: false },
        ]}
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
      />
    );

    const bodyLines = Array.from(container.querySelectorAll<HTMLElement>('[data-page-layer="body-line"]'));

    expect(bodyLines).toHaveLength(2);
    expect(bodyLines[0]).toHaveTextContent('Alpha');
    expect(bodyLines[0]).toHaveStyle({ top: '0px' });
    expect(bodyLines[1]).toHaveTextContent('Beta');
    expect(bodyLines[1]).toHaveStyle({ top: `${layout.lineSpacing}px` });
  });

  it('keeps visible body Document Content in the Preview while the body input bridge is focused', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const { container } = render(
      <PageContent
        pageIndex={0}
        pageText={'Alpha Beta'}
        pageLines={[
          { text: 'Alpha ', lineIndex: 0, hasNewline: false },
          { text: 'Beta', lineIndex: 1, hasNewline: false },
        ]}
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
        editable
        bodyEditorVisible
        showCommittedBody
        onPageTextChange={vi.fn()}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Handwriting body editor' });
    fireEvent.focus(editor);

    const bodyLines = Array.from(container.querySelectorAll<HTMLElement>('[data-page-layer="body-line"]'));
    expect(bodyLines).toHaveLength(2);
    expect(editor).toHaveAttribute('data-body-input-bridge', 'true');
    expect(editor).toHaveStyle({ color: 'rgba(0, 0, 0, 0)' });
    expect((editor as HTMLElement).style.caretColor).toBe('transparent');
  });

  it('renders body editing chrome in the Preview and excludes it from export', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const preview = render(
      <PageContent
        pageIndex={0}
        pageText={'Alpha Beta'}
        pageLines={[
          { text: 'Alpha ', lineIndex: 0, hasNewline: false },
          { text: 'Beta', lineIndex: 1, hasNewline: false },
        ]}
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
        editable
        isBodyPreviewEditing
        bodySelection={{ anchor: 0, focus: 7 }}
        onPageTextChange={vi.fn()}
      />
    );
    const exportRender = render(
      <PageContent
        mode="export"
        pageIndex={0}
        pageText={'Alpha Beta'}
        pageLines={[
          { text: 'Alpha ', lineIndex: 0, hasNewline: false },
          { text: 'Beta', lineIndex: 1, hasNewline: false },
        ]}
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
        isBodyPreviewEditing
        bodySelection={{ anchor: 0, focus: 7 }}
      />
    );

    expect(preview.container.querySelector('[data-page-layer="body-selection-highlight"]')).toBeInTheDocument();
    expect(exportRender.container.querySelector('[data-page-layer="body-caret"]')).not.toBeInTheDocument();
    expect(exportRender.container.querySelector('[data-page-layer="body-selection-highlight"]')).not.toBeInTheDocument();
  });

  it('renders a visible body Caret during collapsed Preview selection', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const { container } = render(
      <PageContent
        pageIndex={0}
        pageText={'Alpha Beta'}
        pageLines={[
          { text: 'Alpha ', lineIndex: 0, hasNewline: false },
          { text: 'Beta', lineIndex: 1, hasNewline: false },
        ]}
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
        editable
        isBodyPreviewEditing
        bodySelection={{ anchor: 2, focus: 2 }}
        onPageTextChange={vi.fn()}
      />
    );

    expect(container.querySelector('[data-page-layer="body-caret"]')).toBeInTheDocument();
  });

  it('positions body editing chrome by page-local line order rather than document-global line indexes', () => {
    const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const { container } = render(
      <PageContent
        pageIndex={1}
        pageText={'Alpha Beta'}
        pageLines={[
          { text: 'Alpha ', lineIndex: 18, hasNewline: false },
          { text: 'Beta', lineIndex: 19, hasNewline: false },
        ]}
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
        editable
        isBodyPreviewEditing
        bodySelection={{ anchor: 2, focus: 2 }}
        onPageTextChange={vi.fn()}
      />
    );

    expect(container.querySelector('[data-page-layer="body-caret"]')).toHaveStyle({ top: '0px' });
  });

  it('keeps locked preview text fields hit-testable so export lock can be explained', () => {
    const onBlockedEditAttempt = vi.fn();

    render(
      <PageContent
        pageIndex={0}
        pageText=""
        pageSettings={{
          ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
          textFields: [
            {
              id: 'field-1',
              text: 'Locked field',
              x: 100,
              y: 100,
              width: 160,
              height: 48,
              color: '#123456',
              fontSize: 24,
            },
          ],
        }}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
        isLocked
        onBlockedEditAttempt={onBlockedEditAttempt}
      />
    );

    const lockedField = screen.getByText('Locked field').closest('[data-page-layer="text-field"]');
    expect(lockedField).not.toBeNull();
    expect(lockedField).not.toHaveStyle({ pointerEvents: 'none' });

    fireEvent.mouseDown(lockedField!);

    expect(onBlockedEditAttempt).toHaveBeenCalledTimes(1);
  });

  it('keeps committed text box line layout aligned between preview and export while excluding export chrome', () => {
    const field = {
      id: 'field-1',
      text: 'abcdefghij',
      x: 580,
      y: 100,
      width: 30,
      height: 60,
      color: '#123456',
      fontSize: 10,
    };
    const pageSettings = {
      ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      textFields: [field],
    };
    const preview = render(
      <TextField
        field={field}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        scale={1}
        fontFamily="Caveat"
      />
    );
    const exportRender = render(
      <PageContent
        mode="export"
        pageIndex={0}
        pageText=""
        pageSettings={pageSettings}
        settings={DEFAULT_SETTINGS}
        fontFamily="Caveat"
        scale={1}
      />
    );

    const previewLines = Array.from(
      preview.container.querySelectorAll<HTMLElement>('[data-text-field-layer="committed-line"]'),
    );
    const exportLines = Array.from(
      exportRender.container.querySelectorAll<HTMLElement>('[data-page-layer="text-field-line"]'),
    );
    const previewLineTexts = previewLines.map((line) => line.textContent);
    const exportLineTexts = exportLines.map((line) => line.textContent);
    const exportWithin = within(exportRender.container);

    expect(previewLineTexts.length).toBeGreaterThan(1);
    expect(previewLineTexts).toEqual(exportLineTexts);
    expect(previewLines.map((line) => line.style.top)).toEqual(exportLines.map((line) => line.style.top));
    expect(exportWithin.queryByLabelText('Move text box')).not.toBeInTheDocument();
    expect(exportWithin.queryByLabelText('Text box settings')).not.toBeInTheDocument();
  });

  it('keeps active text box Document Content aligned between Preview editing and export while excluding editing chrome', async () => {
    const field = {
      id: 'field-1',
      text: 'abcdefghij',
      x: 580,
      y: 100,
      width: 30,
      height: 60,
      color: '#123456',
      fontSize: 10,
    };

    function Harness() {
      const [pageSettings, setPageSettings] = React.useState<PageSettings>({
        ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
        textFields: [field],
      });

      return (
        <>
          <PageContent
            pageIndex={0}
            pageText=""
            pageSettings={pageSettings}
            settings={DEFAULT_SETTINGS}
            fontFamily="Caveat"
            scale={1}
            editable
            onPageTextChange={vi.fn()}
            onPageSettingsChange={(nextPageSettings) => setPageSettings(nextPageSettings)}
          />
          <PageContent
            mode="export"
            pageIndex={0}
            pageText=""
            pageSettings={pageSettings}
            settings={DEFAULT_SETTINGS}
            fontFamily="Caveat"
            scale={1}
          />
        </>
      );
    }

    const { container } = render(<Harness />);
    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });

    act(() => {
      fireEvent.focus(editor);
      const selection = window.getSelection()!;
      const range = document.createRange();
      const textNode = editor.firstChild!;
      range.setStart(textNode, 1);
      range.setEnd(textNode, 4);
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    const preview = container.querySelector('[data-page-content-mode="preview"]') as HTMLElement;
    const exportRender = container.querySelector('[data-page-content-mode="export"]') as HTMLElement;

    expect(preview.querySelector('[data-text-field-layer="selection-highlight"]')).toBeInTheDocument();
    expect(exportRender.querySelector('[data-text-field-layer="selection-highlight"]')).not.toBeInTheDocument();
    expect(exportRender.querySelector('[data-text-field-layer="caret"]')).not.toBeInTheDocument();
    const previewLines = Array.from(
      preview.querySelectorAll<HTMLElement>('[data-text-field-layer="committed-line"]'),
    ).map((line) => line.textContent);
    const exportLines = Array.from(
      exportRender.querySelectorAll<HTMLElement>('[data-page-layer="text-field-line"]'),
    ).map((line) => line.textContent);

    expect(previewLines).toEqual(exportLines);
    expect(within(exportRender).queryByLabelText('Move text box')).not.toBeInTheDocument();
    expect(within(exportRender).queryByLabelText('Text box settings')).not.toBeInTheDocument();
  });
});
