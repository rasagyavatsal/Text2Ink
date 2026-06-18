import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import MobileEditorBottomSheet from '../MobileEditorBottomSheet';

const { sheetMock } = vi.hoisted(() => ({
  sheetMock: vi.fn(({ children }: any) => children),
}));

vi.mock('react-modal-sheet', () => ({
  Sheet: Object.assign(
    sheetMock,
    {
      Container: ({ children, className, style }: any) => <div className={className} style={style}>{children}</div>,
      Header: ({ children, className }: any) => <div className={className}>{children}</div>,
      Content: ({ children, className }: any) => <div className={className}>{children}</div>,
    }
  ),
}));

vi.mock('@/components/Version', () => ({
  default: () => <span>Version</span>,
}));

const DEFAULT_MOBILE_SHEET_METRICS = {
  viewportHeight: 800,
  viewportWidth: 400,
  headerHeight: 60,
  minSheetHeight: 100,
  defaultSheetHeight: 400,
  maxSheetHeight: 700,
  minPreviewHeight: 200,
};

const renderMobileEditorBottomSheet = (
  overrides?: Partial<React.ComponentProps<typeof MobileEditorBottomSheet>>
) => {
  const defaultProps = {
    anchor: 'default' as const,
    metrics: DEFAULT_MOBILE_SHEET_METRICS,
    settingsPanel: <div>Settings</div>,
    onAnchorChange: () => {},
    onHandlePress: () => {},
    onHeightChange: () => {},
    currentPageIndex: 0,
    totalPages: 1,
    isPaginationComplete: true,
    pages: [[]],
    previewScale: 1.0,
    onCurrentPageChange: () => {},
    onPreviewScaleChange: () => {},
  };
  return render(<MobileEditorBottomSheet {...defaultProps} {...overrides} />);
};

describe('MobileEditorBottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses semantic theme tokens instead of hardcoded colors', () => {
    const { container } = renderMobileEditorBottomSheet();
    
    const html = container.innerHTML;
    
    // Forbidden hardcoded classes
    expect(html).not.toMatch(/bg-white/);
    expect(html).not.toMatch(/bg-gray-100/);
    expect(html).not.toMatch(/bg-gray-200/);
    expect(html).not.toMatch(/bg-gray-300/);
    expect(html).not.toMatch(/bg-gray-50\/70/);
    expect(html).not.toMatch(/border-gray-200/);
    expect(html).not.toMatch(/border-gray-100/);
    expect(html).not.toMatch(/text-gray-500/);
    expect(html).not.toMatch(/text-\[#E0A32A\]/);
    expect(html).not.toMatch(/border-\[#E0A32A\]/);
    expect(html).not.toMatch(/bg-\[#E0A32A\]\/5/);
    expect(html).not.toMatch(/ring-\[#E0A32A\]/);
  });

  it('uses theme-adaptive ring offset backgrounds for focus states', () => {
    const { container } = renderMobileEditorBottomSheet();
    
    // Any element with focus-visible:ring-offset-2 should also have focus-visible:ring-offset-background
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      if (button.className.includes('focus-visible:ring-offset-2')) {
        expect(button.className).toContain('focus-visible:ring-offset-background');
      }
    });
  });

  it('starts by reporting the peek anchor height instead of the default height', async () => {
    const onHeightChange = vi.fn();

    renderMobileEditorBottomSheet({
      anchor: 'peek',
      onHeightChange,
    });

    const sheetProps = sheetMock.mock.calls[0]?.[0];

    expect(sheetProps.initialSnap).toBeUndefined();

    await waitFor(() => {
      expect(onHeightChange).toHaveBeenCalledWith(DEFAULT_MOBILE_SHEET_METRICS.minSheetHeight);
    });
    expect(onHeightChange).not.toHaveBeenCalledWith(DEFAULT_MOBILE_SHEET_METRICS.defaultSheetHeight);
  });

  it('renders page and zoom controls in peek state and hides settings content', () => {
    const onCurrentPageChange = vi.fn();
    const onPreviewScaleChange = vi.fn();
    const { container, getByText, queryByText, getByLabelText } = renderMobileEditorBottomSheet({
      anchor: 'peek',
      currentPageIndex: 0,
      totalPages: 3,
      isPaginationComplete: true,
      pages: [[], [], []],
      previewScale: 1.2,
      onCurrentPageChange,
      onPreviewScaleChange,
      settingsPanel: <div data-testid="settings-panel">Settings Content</div>,
    });

    // Handle is rendered
    expect(getByLabelText('Open editor controls')).toBeDefined();

    // Page controls are rendered below handle
    expect(getByText('Page 1 of 3')).toBeDefined();
    expect(getByLabelText('Previous page')).toBeDefined();
    expect(getByLabelText('Next page')).toBeDefined();

    // Zoom controls are rendered beside/below
    expect(getByText('120%')).toBeDefined();
    expect(getByLabelText('Zoom out')).toBeDefined();
    expect(getByLabelText('Zoom in')).toBeDefined();

    const header = container.querySelector('.mobile-editor-sheet__header');
    const footer = container.querySelector('.mobile-editor-sheet__footer');
    expect(header?.textContent).not.toContain('Page 1 of 3');
    expect(header?.textContent).not.toContain('120%');
    expect(footer?.textContent).toContain('Page 1 of 3');
    expect(footer?.textContent).toContain('120%');

    // Settings content is hidden in peek state
    expect(queryByText('Settings Content')).toBeNull();
  });

  it('shows settings content and renders page/zoom controls in default state', () => {
    const { getByText, getByLabelText } = renderMobileEditorBottomSheet({
      anchor: 'default',
      currentPageIndex: 0,
      totalPages: 3,
      isPaginationComplete: true,
      pages: [[], [], []],
      previewScale: 1.2,
      onCurrentPageChange: vi.fn(),
      onPreviewScaleChange: vi.fn(),
      settingsPanel: <div>Settings Content</div>,
    });

    // Settings content is visible
    expect(getByText('Settings Content')).toBeDefined();

    // Compact page and zoom controls are rendered in default state (inside the footer)
    expect(getByText('Page 1 of 3')).toBeDefined();
    expect(getByText('120%')).toBeDefined();
  });

  it('passes max and peek sheet heights via CSS custom variables to Sheet.Container', () => {
    const { container } = renderMobileEditorBottomSheet({
      anchor: 'default',
      metrics: DEFAULT_MOBILE_SHEET_METRICS,
    });

    const sheetContainer = container.querySelector('.mobile-editor-sheet__container');
    expect(sheetContainer).not.toBeNull();
    const styles = (sheetContainer as HTMLElement).style;
    expect(styles.getPropertyValue('--mobile-editor-sheet-max-height')).toBe(`${DEFAULT_MOBILE_SHEET_METRICS.maxSheetHeight}px`);
    expect(styles.getPropertyValue('--mobile-editor-sheet-peek-height')).toBe(`${DEFAULT_MOBILE_SHEET_METRICS.minSheetHeight}px`);
    expect(styles.getPropertyValue('--mobile-editor-sheet-current-height')).toBe('');
  });
});
