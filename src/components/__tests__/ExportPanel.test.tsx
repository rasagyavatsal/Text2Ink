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

  it('keeps export actions inside a minimal inspector section and explains disabled export', () => {
    render(<ExportPanel {...props} />);

    expect(screen.getByRole('heading', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/start typing to enable export/i);
    expect(screen.queryByText(/monitor progress inside the sidebar/i)).not.toBeInTheDocument();
  });
});
