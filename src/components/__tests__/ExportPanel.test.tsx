import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExportPanel from '../ExportPanel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

describe('ExportPanel', () => {
  const props = {
    hasContent: false,
    settings: DEFAULT_SETTINGS,
    pages: [[]],
    isPaginationComplete: true,
    pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
    totalPages: 1,
  };

  it('keeps export visible while disabled and explains how to unlock it', () => {
    render(<ExportPanel {...props} />);

    const exportButton = screen.getByRole('button', { name: /export pdf/i });

    expect(screen.getByRole('heading', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/format/i)).toBeEnabled();
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAccessibleDescription(/add text in the preview to export/i);
    expect(screen.getByText(/add text in the preview to export/i)).toBeInTheDocument();
    expect(screen.queryByText(/single pdf/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/monitor progress inside the sidebar/i)).not.toBeInTheDocument();
  });

  it('shows the format note once export is available', () => {
    render(<ExportPanel {...props} hasContent />);

    const exportButton = screen.getByRole('button', { name: /export pdf/i });

    expect(exportButton).toBeEnabled();
    expect(exportButton).not.toHaveAccessibleDescription();
    expect(screen.getByText(/single pdf/i)).toBeInTheDocument();
    expect(screen.queryByText(/add text in the preview to export/i)).not.toBeInTheDocument();
  });
});
