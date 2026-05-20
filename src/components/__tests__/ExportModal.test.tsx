import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportModal from '../ExportModal';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../../lib/types';

vi.mock('@/lib/canvasRenderer', () => ({
  renderPageToCanvas: vi.fn().mockResolvedValue(true),
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
    hasContent: true,
    settings: DEFAULT_SETTINGS,
    pages: [[{ text: 'test', lineIndex: 0, hasNewline: false }]],
    isPaginationComplete: true,
    pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
    totalPages: 1,
    currentPageIndex: 0,
    onCurrentPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses canonical primitives for layout and styling', () => {
    render(<ExportModal {...defaultProps} />);
    
    // 1. Export button uses brand variant
    const exportButton = screen.getByRole('button', { name: /export pdf/i });
    expect(exportButton).toHaveAttribute('data-variant', 'brand');
    
    // 2. Select trigger uses h-control-lg
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger.className).toContain('h-control-lg');
    expect(selectTrigger.className).not.toContain('h-11');
    
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
});
