import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PageContent from '../PageContent';
import TextField from '../TextField/TextField';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
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
});
