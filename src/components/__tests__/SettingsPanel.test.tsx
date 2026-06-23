import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import './settingsPanelTestMocks';
import { renderSettingsPanel, createSettingsPanelProps } from './settingsPanelTestUtils';
import SettingsPanel from '../SettingsPanel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../../lib/types';
import { withTestPaperSelection } from '@/test/paperTestHelpers';

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the compact inspector sections with "Add Text Box" button', () => {
    renderSettingsPanel();

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

    // Check if new headings exist
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Paper')).toBeInTheDocument();
    expect(screen.getByText('Alignment')).toBeInTheDocument();
    expect(screen.getByText('Realism')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check if "Add Text Box" button is in the document
    const addTextBoxButton = screen.getByRole('button', { name: /Add Text Box/i });
    expect(addTextBoxButton).toBeInTheDocument();
  });

  it('can hide the home logo link', () => {
    renderSettingsPanel({ showHomeLink: false });

    expect(screen.queryByRole('link', { name: /text2ink home/i })).not.toBeInTheDocument();
    expect(screen.queryByAltText(/text2ink logo/i)).not.toBeInTheDocument();
  });

  it('calls onPageSettingsChange when "Add Text Box" is clicked', () => {
    const { props } = renderSettingsPanel();
    
    const addTextBoxButton = screen.getByRole('button', { name: /Add Text Box/i });
    fireEvent.click(addTextBoxButton);
    
    expect(props.onPageSettingsChange).toHaveBeenCalledWith(expect.objectContaining({
      textFields: expect.arrayContaining([
        expect.objectContaining({
          text: '',
        })
      ])
    }));
    
    // Verify it has an id (UUID)
    const calledWith = (props.onPageSettingsChange as any).mock.calls[0][0];
    expect(calledWith.textFields[0].id).toBeDefined();
    expect(typeof calledWith.textFields[0].id).toBe('string');
    expect(calledWith.textFields[0].id.length).toBeGreaterThan(0);
  });

  it('does not have a separate "Text Fields" heading', () => {
    renderSettingsPanel();
    
    // We expect "Text Fields" heading to be gone
    const headings = screen.queryAllByRole('heading', { level: 3 });
    const textFieldHeading = headings.find(h => h.textContent === 'Text Fields');
    expect(textFieldHeading).toBeUndefined();
  });

  it('uses semantic tokens instead of hardcoded gray/white/hex colors', () => {
    const { container } = renderSettingsPanel();
    
    // Select elements that still use hardcoded classes we want to eliminate
    // Note: We're looking for common hardcoded classes mentioned in the issue
    const hardcodedElements = container.querySelectorAll(
      String.raw`.bg-gray-100, .bg-white, .text-gray-400, .text-gray-500, .text-gray-700, .border-gray-200, .bg-\[\#E0A32A\], .text-\[\#E0A32A\]`
    );
    
    if (hardcodedElements.length > 0) {
      hardcodedElements.forEach(el => console.log(el.outerHTML));
    }
    
    // The test should fail initially because these classes exist
    expect(hardcodedElements.length).toBe(0);
  });

  it('uses canonical primitives for layout and styling', () => {
    const settingsWithBg = {
      ...DEFAULT_SETTINGS,
      customBackgroundImage: 'data:image/png;base64,123',
    };
    renderSettingsPanel({ settings: settingsWithBg, isMobileLayout: true });

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

    // Page and zoom controls belong to the mobile bottom sheet footer, not the settings panel.
    expect(screen.queryByRole('button', { name: /zoom in/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Zoom')).not.toBeInTheDocument();
    expect(screen.queryByText('Page Navigation')).not.toBeInTheDocument();
  });

  it('renders paper style buttons for the built-in paper presets', () => {
    renderSettingsPanel();
    
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
    renderSettingsPanel();

    expect(screen.getByRole('button', { name: /blank paper style/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^lined \(medium\) paper style$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Size$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Orientation$/i })).toBeInTheDocument();
  });

  it('keeps explicit control IDs unique when desktop and mobile panels are mounted together', () => {
    const desktopProps = createSettingsPanelProps({ idPrefix: 'desktop-settings' });
    const mobileProps = createSettingsPanelProps({
      idPrefix: 'mobile-settings',
      isMobileLayout: true,
      showHomeLink: false,
    });
    const { container } = render(
      <>
        <SettingsPanel {...desktopProps as any} />
        <SettingsPanel {...mobileProps as any} />
      </>
    );

    const explicitControlIds = Array.from(container.querySelectorAll<HTMLElement>('[id]'))
      .map((element) => element.id)
      .filter((id) => id.endsWith('paper-format') || id.endsWith('paper-orientation'));

    expect(explicitControlIds).toContain('desktop-settings-paper-format');
    expect(explicitControlIds).toContain('mobile-settings-paper-format');
    expect(explicitControlIds).toContain('desktop-settings-paper-orientation');
    expect(explicitControlIds).toContain('mobile-settings-paper-orientation');
    expect(new Set(explicitControlIds).size).toBe(explicitControlIds.length);
  });

  it('hides preset-owned alignment controls for preset-backed built-in papers', () => {
    renderSettingsPanel();

    expect(screen.queryByText('Line Height')).not.toBeInTheDocument();
    expect(screen.queryByText('Top Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Bottom Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Left Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Right Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Margin Line Offset')).not.toBeInTheDocument();
  });

  it('keeps blank-paper line height controls available without upload-only margin sliders', () => {
    renderSettingsPanel({
      settings: withTestPaperSelection({
        ...DEFAULT_SETTINGS,
        paperPresetId: null,
        paperStyle: 'blank',
      }),
    });

    expect(screen.getByText('Line Height')).toBeInTheDocument();
    expect(screen.queryByText('Top Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Bottom Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Left Margin')).not.toBeInTheDocument();
    expect(screen.queryByText('Right Margin')).not.toBeInTheDocument();
  });

  it('keeps custom background upload visible and only shows line detection when a background exists', () => {
    // First render with no custom background
    const { rerender, props } = renderSettingsPanel();
    
    expect(screen.getByText(/Upload PNG or JPG/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Auto-Detect Lines/i })).not.toBeInTheDocument();

    // Now render with a custom background
    const settingsWithBg = {
      ...DEFAULT_SETTINGS,
      customBackgroundImage: 'data:image/png;base64,mock',
      customBackgroundImages: ['data:image/png;base64,mock'],
    };
    const newProps = createSettingsPanelProps({
      ...props,
      settings: settingsWithBg,
    });
    rerender(<SettingsPanel {...newProps as any} />);
    
    // Should show Auto-Detect Lines in Custom mode since we have a background
    expect(screen.getByRole('button', { name: /Auto-Detect Lines/i })).toBeInTheDocument();
  });

  it('treats page-specific background uploads as upload-backed paper for alignment controls', () => {
    renderSettingsPanel({
      settings: {
        ...DEFAULT_SETTINGS,
        customBackgroundImage: null,
        customBackgroundImages: [],
      },
      pageSettings: {
        ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
        customBackgroundImage: 'data:image/png;base64,page-only-background',
      },
    });

    expect(screen.getByText('Top Margin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Auto-Detect Lines/i })).toBeInTheDocument();
    expect(screen.getByText('Line Color')).toBeInTheDocument();
  });

  it('shows paper color and hides line color for preset-backed built-in papers', () => {
    renderSettingsPanel();

    expect(screen.getByText('Paper Color')).toBeInTheDocument();
    expect(screen.queryByText('Line Color')).not.toBeInTheDocument();
  });

  it('renders mobile jump controls when isMobileLayout is true and scrolls to sections', () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const { container } = renderSettingsPanel({ isMobileLayout: true });

    // Verify compact jump controls are rendered
    const textButton = screen.getByRole('button', { name: /^text$/i });
    const paperButton = screen.getByRole('button', { name: /^paper$/i });
    const alignButton = screen.getByRole('button', { name: /^align$/i });
    const realismButton = screen.getByRole('button', { name: /^realism$/i });

    expect(textButton).toBeInTheDocument();
    expect(paperButton).toBeInTheDocument();
    expect(alignButton).toBeInTheDocument();
    expect(realismButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^more$/i })).not.toBeInTheDocument();
    expect(textButton.parentElement?.className).toContain('pt-2');
    expect(textButton.parentElement?.className).not.toContain('pt-6');
    expect(screen.queryByText('Zoom')).not.toBeInTheDocument();
    expect(screen.queryByText('Page Navigation')).not.toBeInTheDocument();

    // Verify clicking Realism still scrolls to the existing "more" section.
    const realismSection = container.querySelector('[data-section="more"]');
    expect(realismSection).toBeInTheDocument();

    fireEvent.click(realismButton);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('renders carousel arrow buttons only in mobile layout', () => {
    const desktop = renderSettingsPanel();

    expect(screen.queryByRole('button', { name: /next fonts/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous fonts/i })).not.toBeInTheDocument();
    desktop.unmount();

    renderSettingsPanel({ isMobileLayout: true });

    expect(screen.getByRole('button', { name: /next fonts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous fonts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next paper styles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous paper styles/i })).toBeInTheDocument();
  });

  it('verifies rebalanced document actions in the Actions section (resolves #273)', () => {
    renderSettingsPanel();

    // Verify all three actions are present
    const applyButton = screen.getByRole('button', { name: /Apply to all pages/i });
    const addTextBoxButton = screen.getByRole('button', { name: /Add Text Box/i });
    const clearEverythingButton = screen.getByRole('button', { name: /Clear Everything/i });

    expect(applyButton).toBeInTheDocument();
    expect(addTextBoxButton).toBeInTheDocument();
    expect(clearEverythingButton).toBeInTheDocument();

    // Verify helper copy below "Add Text Box" does not exist
    expect(screen.queryByText(/Add draggable text boxes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dates, names, or signatures/i)).not.toBeInTheDocument();

    // Verify Clear Everything button uses secondary styling (outline variant) and is destructive
    expect(clearEverythingButton).toHaveAttribute('data-variant', 'outline');
    expect(clearEverythingButton.className).toContain('text-destructive');
  });
});
