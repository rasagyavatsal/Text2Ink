import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import RootEditorPageClient from '../RootEditorPageClient';
import { metadata } from '../page';
import type { MobileEditorSheetMetrics, MobileSheetAnchor } from '@/lib/mobileEditorSheet';

type MockHandwritingEditorProps = {
  previewScale: number;
  onTypingFocus?: () => void;
};

vi.mock('@/components/HandwritingEditor', () => ({
  default: ({ previewScale, onTypingFocus }: MockHandwritingEditorProps) => (
    <div data-testid="handwriting-editor" data-preview-scale={previewScale}>
      Handwriting Editor
      <button type="button" data-testid="typing-focus" onClick={onTypingFocus}>
        Start typing
      </button>
    </div>
  ),
}));

vi.mock('@/components/SettingsPanel', () => ({
  default: () => <div data-testid="settings-panel">Settings panel</div>,
}));

vi.mock('@/components/ExportPanel', () => ({
  default: () => <div data-testid="export-panel">Export panel</div>,
}));

vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">1.0.0</span>,
}));

type MockMobileEditorBottomSheetProps = {
  activePanel: 'settings' | 'export';
  anchor: MobileSheetAnchor;
  exportPanel: ReactNode;
  metrics: MobileEditorSheetMetrics;
  onHandlePress: () => void;
  onHeightChange: (height: number) => void;
  settingsPanel: ReactNode;
};

vi.mock('@/components/MobileEditorBottomSheet', () => ({
  default: function MockMobileEditorBottomSheet({
    activePanel,
    anchor,
    exportPanel,
    metrics,
    onHandlePress,
    onHeightChange,
    settingsPanel,
  }: MockMobileEditorBottomSheetProps) {
    React.useEffect(() => {
      const anchorHeight =
        anchor === 'peek'
          ? metrics.minSheetHeight
          : anchor === 'expanded'
            ? metrics.maxSheetHeight
            : metrics.defaultSheetHeight;
      onHeightChange(anchorHeight);
    }, [anchor, metrics.defaultSheetHeight, metrics.maxSheetHeight, metrics.minSheetHeight, onHeightChange]);

    return (
      <div data-testid="mobile-editor-bottom-sheet" data-anchor={anchor}>
        <button type="button" data-testid="sheet-handle" onClick={onHandlePress}>
          Sheet handle
        </button>
        <button type="button" data-testid="sheet-drag-expanded" onClick={() => onHeightChange(metrics.maxSheetHeight)}>
          Drag to expanded
        </button>
        <button type="button" data-testid="sheet-drag-peek" onClick={() => onHeightChange(metrics.minSheetHeight)}>
          Drag to peek
        </button>
        {activePanel === 'settings' ? settingsPanel : exportPanel}
      </div>
    );
  },
}));

vi.mock('@/lib/editorPersistence', () => ({
  loadEditorStateV1: vi.fn(() => null),
  saveEditorStateV1: vi.fn(),
}));

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('Root editor page', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
  });

  it('renders editor shell and contact navigation on root route', () => {
    render(<RootEditorPageClient />);

    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    expect(screen.getByTestId('handwriting-editor')).toBeInTheDocument();
  });

  it('removes legacy landing and mobile-blocker copy from root route', () => {
    render(<RootEditorPageClient />);

    expect(screen.queryByText(/transform your text into/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/editor is desktop-only/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /back to home/i })).not.toBeInTheDocument();
  });

  it('uses root canonical editor metadata', () => {
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/');
    expect(metadata.openGraph?.url).toBe('https://text2ink.com/');
  });

  it('uses semantic theme tokens instead of hardcoded colors', () => {
    const { container } = render(<RootEditorPageClient />);
    const html = container.innerHTML;
    
    // Forbidden hardcoded classes
    expect(html).not.toMatch(/bg-white/);
    expect(html).not.toMatch(/bg-gray-100/);
    expect(html).not.toMatch(/bg-gray-50\/50/);
    expect(html).not.toMatch(/border-gray-200/);
    expect(html).not.toMatch(/border-gray-100/);
    expect(html).not.toMatch(/text-gray-500/);
    expect(html).not.toMatch(/text-gray-400/);
    expect(html).not.toMatch(/text-\[#E0A32A\]/);
    expect(html).not.toMatch(/border-\[#E0A32A\]/);
    expect(html).not.toMatch(/bg-\[#E0A32A\]\/5/);
  });

  it('keeps preview scale stable when the mobile sheet collapses and reopens', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(<RootEditorPageClient />);

    const sheet = await screen.findByTestId('mobile-editor-bottom-sheet');
    const getPreviewScale = () => Number(screen.getByTestId('handwriting-editor').getAttribute('data-preview-scale'));
    const previewScrollContainer = screen.getByTestId('preview-scroll-container');

    expect(sheet).toHaveAttribute('data-anchor', 'default');
    const previewScaleBeforeCollapse = getPreviewScale();
    const defaultPadding = previewScrollContainer.style.paddingBottom;

    fireEvent.click(screen.getByTestId('typing-focus'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'peek');
    });
    const previewScaleAfterCollapse = getPreviewScale();
    const collapsedPadding = previewScrollContainer.style.paddingBottom;

    expect(previewScaleAfterCollapse).toBe(previewScaleBeforeCollapse);
    expect(collapsedPadding).not.toBe(defaultPadding);

    fireEvent.click(screen.getByTestId('sheet-handle'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'default');
    });

    expect(getPreviewScale()).toBe(previewScaleBeforeCollapse);
    expect(previewScrollContainer.style.paddingBottom).toBe(defaultPadding);
  });

  it('updates preview bottom scroll space as sheet height changes without changing preview scale', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(<RootEditorPageClient />);

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const getPreviewScale = () => Number(screen.getByTestId('handwriting-editor').getAttribute('data-preview-scale'));
    const previewScrollContainer = screen.getByTestId('preview-scroll-container');
    const parsePadding = () => Number.parseFloat(previewScrollContainer.style.paddingBottom);
    const initialScale = getPreviewScale();
    const defaultPadding = parsePadding();

    fireEvent.click(screen.getByTestId('sheet-drag-expanded'));

    await waitFor(() => {
      expect(parsePadding()).toBeGreaterThan(defaultPadding);
    });
    const expandedPadding = parsePadding();
    expect(getPreviewScale()).toBe(initialScale);

    fireEvent.click(screen.getByTestId('sheet-drag-peek'));

    await waitFor(() => {
      expect(parsePadding()).toBeLessThan(expandedPadding);
    });
    expect(getPreviewScale()).toBe(initialScale);
  });
});
