import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PageContent from '../PageContent';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

describe('PageContent', () => {
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
