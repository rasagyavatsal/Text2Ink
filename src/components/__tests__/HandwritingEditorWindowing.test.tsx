import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HandwritingEditor from '../HandwritingEditor';
import { DEFAULT_SETTINGS, type HandwritingSettings } from '@/lib/types';

describe('HandwritingEditor page windowing', () => {
  const settings: HandwritingSettings = {
    ...DEFAULT_SETTINGS,
  };

  it('mounts only the previous, current, and next pages while keeping preview editing on the current page', async () => {
    const text = Array.from({ length: 120 }, (_, index) => `Line ${index + 1}`).join('\n');

    render(
      <HandwritingEditor
        text={text}
        settings={settings}
        onTextChange={vi.fn()}
        onSettingsChange={vi.fn()}
        pageSettingsByPage={[]}
        previewScale={1}
        onPreviewScaleChange={vi.fn()}
        currentPageIndex={2}
        onCurrentPageChange={vi.fn()}
        onTotalPagesChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Page 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Page 5')).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'Handwriting body editor' })).toHaveLength(1);
  });
});
