import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PageContent from '../PageContent';
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
});
