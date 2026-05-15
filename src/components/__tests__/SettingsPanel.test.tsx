import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPanel from '../SettingsPanel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../../lib/types';

// Mock lucide-react icons with a standard object mock
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => <div {...props} />;
  return {
    Type: MockIcon,
    Palette: MockIcon,
    FileText: MockIcon,
    Wand2: MockIcon,
    Upload: MockIcon,
    X: MockIcon,
    Minus: MockIcon,
    Plus: MockIcon,
    ChevronLeft: MockIcon,
    ChevronRight: MockIcon,
    ChevronDownIcon: MockIcon,
    ChevronUpIcon: MockIcon,
    CheckIcon: MockIcon,
    Trash2: MockIcon,
    Settings2: MockIcon,
    Grid: MockIcon,
  };
});

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    const imageProps = { ...props };
    delete imageProps.unoptimized;
    delete imageProps.priority;
    return React.createElement('img', imageProps);
  },
}));

describe('SettingsPanel', () => {
  const settings = DEFAULT_SETTINGS;
  const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);
  
  const mockOnSettingsChange = vi.fn();
  const mockOnPageSettingsChange = vi.fn();
  const mockOnPreviewScaleChange = vi.fn();
  const mockOnCurrentPageChange = vi.fn();
  const mockOnClearAll = vi.fn();
  const mockOnApplyToAllPages = vi.fn();

  const defaultProps = {
    settings,
    onSettingsChange: mockOnSettingsChange,
    pageSettings,
    onPageSettingsChange: mockOnPageSettingsChange,
    currentPageIndex: 0,
    onApplyToAllPages: mockOnApplyToAllPages,
    previewScale: 1,
    onPreviewScaleChange: mockOnPreviewScaleChange,
    onCurrentPageChange: mockOnCurrentPageChange,
    totalPages: 1,
    isPaginationComplete: true,
    pages: [[]] as any,
    onClearAll: mockOnClearAll,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a minimal inspector ordered around user-facing control groups', () => {
    render(<SettingsPanel {...defaultProps} />);

    const sectionNames = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim());

    expect(sectionNames).toEqual([
      'General',
      'Typography',
      'Page Layout',
      'Background Calibration',
      'Colors',
      'Destructive Actions',
    ]);
    expect(screen.getByRole('button', { name: /Add Text Box/i })).toBeInTheDocument();
    expect(screen.queryByText(/Workspace controls/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add draggable text boxes/i)).not.toBeInTheDocument();
  });

  it('calls onPageSettingsChange when "Add Text Box" is clicked', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const addTextBoxButton = screen.getByRole('button', { name: /Add Text Box/i });
    fireEvent.click(addTextBoxButton);
    
    expect(mockOnPageSettingsChange).toHaveBeenCalledWith(expect.objectContaining({
      textFields: expect.arrayContaining([
        expect.objectContaining({
          text: '',
        })
      ])
    }));
    
    // Verify it has an id (UUID)
    const calledWith = mockOnPageSettingsChange.mock.calls[0][0];
    expect(calledWith.textFields[0].id).toBeDefined();
    expect(typeof calledWith.textFields[0].id).toBe('string');
    expect(calledWith.textFields[0].id.length).toBeGreaterThan(0);
  });

  it('does not have a separate "Text Fields" heading', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    // We expect "Text Fields" heading to be gone
    const headings = screen.queryAllByRole('heading', { level: 3 });
    const textFieldHeading = headings.find(h => h.textContent === 'Text Fields');
    expect(textFieldHeading).toBeUndefined();
  });

  it('uses font paging without a separate all-fonts popup', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByText('Fonts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /see all/i })).not.toBeInTheDocument();
    expect(screen.queryByText('All Handwriting Fonts')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous fonts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next fonts/i })).toBeInTheDocument();
  });

  it('shows paper template cards and separates custom background calibration from page layout', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByText('Paper Templates')).toBeInTheDocument();
    expect(screen.getByText('Page Format')).toBeInTheDocument();
    expect(screen.getByText('Orientation')).toBeInTheDocument();
    expect(screen.getByText('Custom Background Image')).toBeInTheDocument();
    expect(screen.queryByText('Top Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Line Height')).not.toBeInTheDocument();
    expect(screen.queryByText('Paper Color')).not.toBeInTheDocument();
    expect(screen.queryByText('Line Color')).not.toBeInTheDocument();
    expect(screen.getByText('Ink Color')).toBeInTheDocument();
  });

  it('keeps custom background calibration controls visible', () => {
    render(
      <SettingsPanel
        {...defaultProps}
        settings={{
          ...DEFAULT_SETTINGS,
          customBackgroundImages: ['data:image/png;base64,abc'],
          customBackgroundImage: 'data:image/png;base64,abc',
        }}
      />
    );

    expect(screen.getByText('Top Margin')).toBeInTheDocument();
    expect(screen.getByText('Auto-Detect Lines')).toBeInTheDocument();
    expect(screen.getByText('Line Offset (Y Position)')).toBeInTheDocument();
    expect(screen.getByText('Custom Line Spacing')).toBeInTheDocument();
    expect(screen.getByText('Paper Color')).toBeInTheDocument();
  });

  it('shows export lock guidance and blocks document-changing actions during export', () => {
    render(
      <SettingsPanel
        {...defaultProps}
        isExportLocked
        exportLockMessage="Export in progress. Editing is temporarily disabled until capture finishes."
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Text Box/i }));
    fireEvent.click(screen.getByRole('button', { name: /Apply settings to all pages/i }));
    fireEvent.click(screen.getByRole('button', { name: /Clear Everything/i }));

    expect(screen.getByText(/editing is temporarily disabled until capture finishes/i)).toBeInTheDocument();
    expect(mockOnPageSettingsChange).not.toHaveBeenCalled();
    expect(mockOnApplyToAllPages).not.toHaveBeenCalled();
    expect(mockOnClearAll).not.toHaveBeenCalled();
  });

  it('keeps zoom and page navigation available during export lock for inspection', () => {
    render(
      <SettingsPanel
        {...defaultProps}
        currentPageIndex={1}
        totalPages={3}
        pages={[[], [], []] as any}
        isExportLocked
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /decrease zoom/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase zoom/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));

    expect(mockOnPreviewScaleChange).toHaveBeenNthCalledWith(1, 0.9);
    expect(mockOnPreviewScaleChange).toHaveBeenNthCalledWith(2, 1.1);
    expect(mockOnCurrentPageChange).toHaveBeenNthCalledWith(1, 0);
    expect(mockOnCurrentPageChange).toHaveBeenNthCalledWith(2, 2);
  });
});
