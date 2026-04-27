import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExportPanel from '../ExportPanel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

vi.mock('../FeedbackDialog', () => ({
  default: () => null,
}));

describe('ExportPanel', () => {
  const props = {
    hasContent: false,
    settings: DEFAULT_SETTINGS,
    pages: [[]],
    isPaginationComplete: true,
    pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
    totalPages: 1,
    currentPageIndex: 0,
    onCurrentPageChange: vi.fn(),
  };

  it('keeps export actions inside a structured sidebar section and explains disabled export', () => {
    render(<ExportPanel {...props} />);

    expect(screen.getByRole('heading', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/start typing to enable export/i);
  });
});
