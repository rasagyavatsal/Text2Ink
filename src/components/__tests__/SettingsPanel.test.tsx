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
  default: (props: any) => <img {...props} />,
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
    
    // Check if General heading exists
    expect(screen.getByText('General')).toBeInTheDocument();
    
    // Check if "Add Text Box" button is in the document
    const addTextBoxButton = screen.getByRole('button', { name: /Add Text Box/i });
    expect(addTextBoxButton).toBeInTheDocument();
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
});
