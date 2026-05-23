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
  default: ({ unoptimized: _unoptimized, ...props }: any) => <img {...props} />,
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

  it('renders the General section with "Add Text Box" button', () => {
    render(<SettingsPanel {...defaultProps} />);

    const homeLink = screen.getByRole('link', { name: /text2ink home/i });
    const logo = screen.getByAltText(/text2ink logo/i);

    expect(homeLink).toBeInTheDocument();
    expect(homeLink.className).toContain('h-16');
    expect(homeLink.className).toContain('w-16');
    expect(homeLink.className).not.toContain('ring-border');
    expect(logo).toBeInTheDocument();
    expect(logo.className).toContain('h-14');
    expect(logo.className).toContain('w-14');
    expect(screen.queryByText(/editor controls/i)).not.toBeInTheDocument();

    // Check if General heading exists
    expect(screen.getByText('General')).toBeInTheDocument();

    // Check if "Add Text Box" button is in the document
    const addTextBoxButton = screen.getByRole('button', { name: /Add Text Box/i });
    expect(addTextBoxButton).toBeInTheDocument();
  });

  it('can hide the home logo link', () => {
    render(<SettingsPanel {...defaultProps} showHomeLink={false} />);

    expect(screen.queryByRole('link', { name: /text2ink home/i })).not.toBeInTheDocument();
    expect(screen.queryByAltText(/text2ink logo/i)).not.toBeInTheDocument();
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

  it('uses semantic tokens instead of hardcoded gray/white/hex colors', () => {
    const { container } = render(<SettingsPanel {...defaultProps} />);
    
    // Select elements that still use hardcoded classes we want to eliminate
    // Note: We're looking for common hardcoded classes mentioned in the issue
    const hardcodedElements = container.querySelectorAll(
      '.bg-gray-100, .bg-white, .text-gray-400, .text-gray-500, .text-gray-700, .border-gray-200, .bg-\\[\\#E0A32A\\], .text-\\[\\#E0A32A\\]'
    );
    
    if (hardcodedElements.length > 0) {
      hardcodedElements.forEach(el => console.log(el.outerHTML));
    }
    
    // The test should fail initially because these classes exist
    expect(hardcodedElements.length).toBe(0);
  });

  it('uses canonical primitives for layout and styling', () => {
    const settingsWithBg = {
      ...defaultProps.settings,
      customBackgroundImage: 'data:image/png;base64,123',
    };
    const { container } = render(<SettingsPanel {...defaultProps} settings={settingsWithBg} />);

    // Check action buttons use canonical variants
    const detectLinesButton = screen.getByRole('button', { name: /detect lines/i });
    expect(detectLinesButton).toHaveAttribute('data-variant', 'brand');

    const addTextBoxButton = screen.getByRole('button', { name: /add text box/i });
    expect(addTextBoxButton).toHaveAttribute('data-variant', 'outline');

    const clearAllButton = screen.getByRole('button', { name: /clear everything/i });
    // Outline variant with destructive class
    expect(clearAllButton).toHaveAttribute('data-variant', 'outline');

    const applyAllButton = screen.getByRole('button', { name: /apply to all pages/i });
    expect(applyAllButton).toHaveAttribute('data-variant', 'brand');

    // Zoom buttons should be ghost
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
    expect(zoomInButton).toHaveAttribute('data-variant', 'ghost');
    expect(zoomInButton).toHaveAttribute('data-size', 'icon');

  });

  it('renders paper style buttons for the built-in paper presets', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const blankStyle = screen.getByRole('button', { name: /blank paper style/i });
    const linedStyle = screen.getByRole('button', { name: /^lined \(medium\) paper style$/i });
    const ruledStyle = screen.getByRole('button', { name: /^ruled \(medium\) paper style$/i });
    const gridStyle = screen.getByRole('button', { name: /^grid paper style$/i });
    
    expect(blankStyle).toBeInTheDocument();
    expect(linedStyle).toBeInTheDocument();
    expect(ruledStyle).toBeInTheDocument();
    expect(gridStyle).toBeInTheDocument();
  });

  it('keeps paper style, size, and orientation controls available in the layout section', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /blank paper style/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^lined \(medium\) paper style$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Orientation/i)).toBeInTheDocument();
  });

  it('hides preset-owned alignment controls for preset-backed built-in papers', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.queryByText('Line Height')).not.toBeInTheDocument();
    expect(screen.queryByText('Top Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Bottom Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Left Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Right Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Margin Line Offset')).not.toBeInTheDocument();
  });

  it('keeps blank-paper line height controls available without upload-only margin sliders', () => {
    render(
      <SettingsPanel
        {...defaultProps}
        settings={{ ...defaultProps.settings, paperStyle: 'blank', paperPresetId: null }}
      />,
    );

    expect(screen.getByText('Line Height')).toBeInTheDocument();
    expect(screen.queryByText('Top Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Bottom Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Left Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Right Margin')).not.toBeInTheDocument();
  });

  it('keeps custom background upload visible and only shows line detection when a background exists', () => {
    // First render with no custom background
    const { rerender } = render(<SettingsPanel {...defaultProps} />);
    
    expect(screen.getByText(/Upload PNG or JPG/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Auto-Detect Lines/i })).not.toBeInTheDocument();

    // Now render with a custom background
    const settingsWithBg = {
      ...defaultProps.settings,
      customBackgroundImage: 'data:image/png;base64,mock',
      customBackgroundImages: ['data:image/png;base64,mock'],
    };
    rerender(<SettingsPanel {...defaultProps} settings={settingsWithBg} />);
    
    // Should show Auto-Detect Lines in Custom mode since we have a background
    expect(screen.getByRole('button', { name: /Auto-Detect Lines/i })).toBeInTheDocument();
  });

  it('shows paper color and hides line color for preset-backed built-in papers', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByText('Paper Color')).toBeInTheDocument();
    expect(screen.queryByText('Line Color')).not.toBeInTheDocument();
  });
});
