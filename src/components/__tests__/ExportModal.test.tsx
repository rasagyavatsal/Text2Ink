import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportModal from '../ExportModal';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../../lib/types';

const { exportDocumentMock } = vi.hoisted(() => ({
  exportDocumentMock: vi.fn(),
}));

vi.mock('@/lib/export/ExportEngine', () => ({
  exportEngine: {
    exportDocument: exportDocumentMock,
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => <div {...props} data-testid={`icon-${props.className}`} />;
  return {
    Download: MockIcon,
    FileImage: MockIcon,
    FileText: MockIcon,
    Loader2: MockIcon,
    CheckCircle2: MockIcon,
    AlertCircle: MockIcon,
    X: MockIcon,
    ChevronDownIcon: MockIcon,
    ChevronUpIcon: MockIcon,
    CheckIcon: MockIcon,
  };
});

describe('ExportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    text: 'test',
    settings: DEFAULT_SETTINGS,
    pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    exportDocumentMock.mockResolvedValue({
      status: 'success',
      format: 'pdf',
      pageCount: 1,
      files: [{ fileName: 'handwritten-document.pdf', mimeType: 'application/pdf' }],
    });
  });

  it('uses canonical primitives for layout and styling', () => {
    render(<ExportModal {...defaultProps} />);
    
    // 1. Export button uses brand variant
    const exportButton = screen.getByRole('button', { name: /export pdf/i });
    expect(exportButton).toHaveAttribute('data-variant', 'brand');
    
    // 2. Select trigger uses h-control-lg and w-full
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger.className).toContain('h-control-lg');
    expect(selectTrigger.className).not.toContain('h-11');
    expect(selectTrigger.className).toContain('w-full');
    expect(selectTrigger.className).not.toContain('w-fit');
    
    // 3. Labels use label-text class
    const formatLabel = screen.getByText('Format');
    expect(formatLabel.className).toContain('label-text');
    expect(formatLabel.className).not.toContain('text-label font-bold text-muted-foreground uppercase tracking-widest');
  });

  it('uses canonical primitives in success state', async () => {
    render(<ExportModal {...defaultProps} />);
    
    // Switch to PNG to avoid Web Worker mock complexity
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    
    // Select PNG
    const pngOption = await screen.findByText(/png image/i);
    fireEvent.click(pngOption);
    
    // Click Export
    const exportButton = screen.getByRole('button', { name: /export png/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
        format: 'png',
        document: expect.objectContaining({
          text: 'test',
          settings: DEFAULT_SETTINGS,
          pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
        }),
        onProgress: expect.any(Function),
        signal: expect.any(AbortSignal),
      }));
    });
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    });
    
    // 4. Close button uses brand variant
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    const successCloseButton = closeButtons.find(btn => btn.textContent === 'Close')!;
    expect(successCloseButton).toHaveAttribute('data-variant', 'brand');

    // 5. Success icon uses text-success
    const checkIcon = screen.getByTestId('icon-w-12 h-12 text-success');
    expect(checkIcon).toBeInTheDocument();
    expect(screen.queryByTestId('icon-w-12 h-12 text-green-500')).not.toBeInTheDocument();
  });

  it('renders custom error state when export fails, retry clears it and does not call window.alert', async () => {
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    exportDocumentMock
      .mockRejectedValueOnce(new Error('Canvas rendering error'))
      .mockResolvedValueOnce({
        status: 'success',
        format: 'png',
        pageCount: 1,
        files: [{ fileName: 'handwritten-page-1.png', mimeType: 'image/png' }],
      });

    render(<ExportModal {...defaultProps} />);
    
    // Switch to PNG to trigger standard rendering flow
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    
    const pngOption = await screen.findByText(/png image/i);
    fireEvent.click(pngOption);
    
    // Click Export
    const exportButton = screen.getByRole('button', { name: /export png/i });
    fireEvent.click(exportButton);
    
    // Wait for error state to render
    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument();
      expect(screen.getByText('Canvas rendering error')).toBeInTheDocument();
    });
    
    // Confirm window.alert was NOT called
    expect(alertMock).not.toHaveBeenCalled();
    
    // Verify custom buttons (Cancel/Retry) are present
    const retryButton = screen.getByRole('button', { name: /retry/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(retryButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
    
    // Click Retry
    fireEvent.click(retryButton);
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    });
    
    alertMock.mockRestore();
    consoleErrorMock.mockRestore();
  });
});
