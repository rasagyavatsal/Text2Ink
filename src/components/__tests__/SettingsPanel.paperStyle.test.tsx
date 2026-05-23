import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPanel from '../SettingsPanel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';
import { withTestPaperSelection } from '@/test/paperTestHelpers';

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

vi.mock('next/image', () => ({
  default: ({ unoptimized: _unoptimized, ...props }: any) => <img {...props} />,
}));

describe('SettingsPanel paper styles', () => {
  const mockOnSettingsChange = vi.fn();
  const mockOnPageSettingsChange = vi.fn();
  const mockOnPreviewScaleChange = vi.fn();
  const mockOnCurrentPageChange = vi.fn();
  const mockOnClearAll = vi.fn();
  const mockOnApplyToAllPages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPanel(settings = DEFAULT_SETTINGS) {
    return render(
      <SettingsPanel
        settings={settings}
        onSettingsChange={mockOnSettingsChange}
        pageSettings={defaultPageSettingsFromHandwritingSettings(settings)}
        onPageSettingsChange={mockOnPageSettingsChange}
        currentPageIndex={0}
        onApplyToAllPages={mockOnApplyToAllPages}
        previewScale={1}
        onPreviewScaleChange={mockOnPreviewScaleChange}
        onCurrentPageChange={mockOnCurrentPageChange}
        totalPages={1}
        isPaginationComplete
        pages={[[]] as any}
        onClearAll={mockOnClearAll}
      />,
    );
  }

  it('keeps paper color controls available for built-in paper styles', () => {
    renderPanel(withTestPaperSelection({ paperPresetId: 'lined-letter-portrait' }));

    expect(screen.getByText('Paper Color')).toBeInTheDocument();
  });

  it('renders every paper-style preview on the selected paper color', () => {
    renderPanel({
      ...DEFAULT_SETTINGS,
      paperColor: '#f5f0e1',
    });

    expect(screen.getByTestId('paper-style-preview-blank')).toHaveStyle({ backgroundColor: '#f5f0e1' });
    expect(screen.getByTestId('paper-style-preview-lined')).toHaveStyle({ backgroundColor: '#f5f0e1' });
    expect(screen.getByTestId('paper-style-preview-ruled')).toHaveStyle({ backgroundColor: '#f5f0e1' });
    expect(screen.getByTestId('paper-style-preview-grid')).toHaveStyle({ backgroundColor: '#f5f0e1' });
  });
});
