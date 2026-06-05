import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import './settingsPanelTestMocks';
import { renderSettingsPanel } from './settingsPanelTestUtils';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { withTestPaperSelection } from '@/test/paperTestHelpers';

describe('SettingsPanel paper styles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPanel(settings = DEFAULT_SETTINGS) {
    return renderSettingsPanel({ settings });
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

  it('renders line and ruled preview variants correctly from shared configs', () => {
    renderPanel();

    const variants = [
      { id: 'lined', transparentStop: '11px', size: '12px', isRuled: false },
      { id: 'wide-lined', transparentStop: '16px', size: '17px', isRuled: false },
      { id: 'narrow-lined', transparentStop: '8px', size: '9px', isRuled: false },
      { id: 'ruled', transparentStop: '11px', size: '12px', isRuled: true },
      { id: 'wide-ruled', transparentStop: '16px', size: '17px', isRuled: true },
      { id: 'narrow-ruled', transparentStop: '8px', size: '9px', isRuled: true },
    ];

    variants.forEach(({ id, transparentStop, size, isRuled }) => {
      const container = screen.getByTestId(`paper-style-preview-${id}`);
      // Find the element inside container that has the background gradient
      const linePreviewDiv = container.querySelector('[style*="linear-gradient"]');
      expect(linePreviewDiv).toBeInTheDocument();
      expect(linePreviewDiv).toHaveStyle({
        backgroundImage: `linear-gradient(to bottom, transparent ${transparentStop}, rgba(169, 190, 205, 0.6) ${transparentStop})`,
        backgroundSize: `100% ${size}`,
      });

      // The red margin line is represented by a div with style/class containing bg-[#f39ca6]/90
      const redMarginDiv = container.querySelector('.bg-\\[\\#f39ca6\\]\\/90');
      if (isRuled) {
        expect(redMarginDiv).toBeInTheDocument();
      } else {
        expect(redMarginDiv).not.toBeInTheDocument();
      }
    });
  });
});
