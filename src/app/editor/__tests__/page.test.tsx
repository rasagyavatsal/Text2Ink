import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import RootEditorPageClient from '../RootEditorPageClient';
import EditorPage, { metadata } from '../page';
import { productFacts } from '@/lib/seo/productFacts';
import {
  getMobileSheetAnchorHeight,
  type MobileEditorSheetChange,
  type MobileEditorSheetMetrics,
  type MobileSheetAnchor,
} from '@/lib/mobileEditorSheet';

vi.mock('next/image', () => ({
  default: (props: any) => <img alt="" {...props} />,
}));

type MockHandwritingEditorProps = {
  previewScale: number;
  onTypingFocus?: () => void;
};

vi.mock('@/components/HandwritingEditor', () => ({
  default: ({ previewScale, onTypingFocus }: MockHandwritingEditorProps) => (
    <div data-testid="handwriting-editor" data-preview-scale={previewScale}>
      <span>Handwriting Editor</span>
      <button type="button" data-testid="typing-focus" onClick={onTypingFocus}>
        Start typing
      </button>
    </div>
  ),
}));

vi.mock('@/components/SettingsPanel', () => ({
  default: ({ onClearAll }: { onClearAll: () => void }) => (
    <div data-testid="settings-panel">
      <span>Settings panel</span>
      <button type="button" data-testid="clear-all-trigger" onClick={onClearAll}>
        Mock Clear All
      </button>
    </div>
  ),
}));

vi.mock('@/components/ExportPanel', () => ({
  default: () => <div data-testid="export-panel">Export panel</div>,
}));

vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">1.0.0</span>,
}));

type MockMobileEditorBottomSheetProps = {
  anchor: MobileSheetAnchor;
  metrics: MobileEditorSheetMetrics;
  onHandlePress: () => void;
  onSheetChange: (change: MobileEditorSheetChange) => void;
  settingsPanel: ReactNode;
};

vi.mock('@/components/MobileEditorBottomSheet', () => ({
  default: function MockMobileEditorBottomSheet({
    anchor,
    metrics,
    onHandlePress,
    onSheetChange,
    settingsPanel,
  }: MockMobileEditorBottomSheetProps) {
    React.useEffect(() => {
      onSheetChange({
        anchor,
        height: getMobileSheetAnchorHeight(anchor, metrics),
        source: 'snap',
      });
    }, [anchor, metrics, onSheetChange]);

    return (
      <div data-testid="mobile-editor-bottom-sheet" data-anchor={anchor}>
        <button type="button" data-testid="sheet-handle" onClick={onHandlePress}>
          Sheet handle
        </button>
        <button
          type="button"
          data-testid="sheet-drag-expanded"
          onClick={() => onSheetChange({ anchor: 'expanded', height: metrics.maxSheetHeight, source: 'drag' })}
        >
          Drag to expanded
        </button>
        <button
          type="button"
          data-testid="sheet-drag-peek"
          onClick={() => onSheetChange({ anchor: 'peek', height: metrics.minSheetHeight, source: 'drag' })}
        >
          Drag to peek
        </button>
        {settingsPanel}
      </div>
    );
  },
}));

vi.mock('@/lib/editorPersistence', () => ({
  EDITOR_STORAGE_KEY: 'text2ink.editor.state',
  loadEditorStateV1: vi.fn(() => null),
  loadNormalizedEditorStateV1: vi.fn(() => null),
  saveEditorStateV1: vi.fn(),
}));

function mockMatchMedia(matches: boolean) {
  globalThis.matchMedia = vi.fn().mockImplementation((query) => ({
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
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, writable: true, value: 1280 });
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, writable: true, value: 900 });
  });

  it('renders editor shell and contact navigation on root route', () => {
    render(<RootEditorPageClient />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toHaveAttribute('data-size', 'chrome');
    expect(exportButton.className).toContain('h-control-md');
    expect(exportButton.className).toContain('min-w-[7.5rem]');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('data-size', 'chrome');
    expect(screen.queryByRole('link', { name: /text2ink home/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    expect(screen.getByTestId('handwriting-editor')).toBeInTheDocument();
  });

  it('keeps page-level top controls out of a banner on the editor route', () => {
    const { container } = render(<RootEditorPageClient />);

    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(container.querySelector('header')).not.toBeInTheDocument();
  });

  it('renders the desktop settings rail beside the preview and keeps controls in a fixed top lane', () => {
    const { container } = render(<RootEditorPageClient />);

    const settingsRail = screen.getByTestId('settings-panel').closest('aside');
    const fixedTopLane = container.querySelector('.fixed');

    expect(settingsRail).toBeInTheDocument();
    expect(settingsRail?.className).toContain('w-panel');
    expect(fixedTopLane).toContainElement(screen.getByRole('button', { name: /export/i }));
    expect(container.querySelector('main')).toContainElement(screen.getByTestId('preview-scroll-container'));
  });

  it('keeps the home logo in mobile page-level top controls', async () => {
    mockMatchMedia(true);
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(<RootEditorPageClient />);

    const homeLink = await screen.findByRole('link', { name: /text2ink home/i });

    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink.className).not.toContain('ring-border');
    expect(homeLink.className).not.toContain('bg-background/90');
    expect(screen.getByAltText(/text2ink logo/i)).toBeInTheDocument();
  });

  it('removes legacy landing and mobile-blocker copy from root route', () => {
    render(<RootEditorPageClient />);

    expect(screen.queryByText(/transform your text into/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/editor is desktop-only/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /back to home/i })).not.toBeInTheDocument();
  });

  it('publishes self-canonical editor metadata', () => {
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/editor');
    expect(metadata.openGraph?.url).toBe('https://text2ink.com/editor');
  });

  it('renders an accessible H1 and intro in the editor route HTML', () => {
    render(<EditorPage />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Text2Ink Handwriting Editor',
    });
    expect(heading).toHaveClass('sr-only');
    expect(screen.getByText(/type text, choose handwriting and paper controls/i)).toHaveClass('sr-only');
  });

  it('emits WebApplication JSON-LD without unsupported review ratings', () => {
    const { container } = render(<EditorPage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const structuredData = JSON.parse(script?.innerHTML ?? '{}');
    expect(structuredData.url).toBe('https://text2ink.com/editor');
    expect(structuredData.featureList).toEqual(expect.arrayContaining([
      `${productFacts.handwritingFonts.length} built-in handwriting fonts`,
      'Custom .ttf and .otf font upload',
      'PDF, PNG, and JPG exports',
    ]));
    expect(structuredData.aggregateRating).toBeUndefined();
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

  it('keeps preview scale stable when the mobile sheet expands and collapses', async () => {
    mockMatchMedia(true);
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(<RootEditorPageClient />);

    const sheet = await screen.findByTestId('mobile-editor-bottom-sheet');
    const getPreviewScale = () => Number(screen.getByTestId('handwriting-editor').dataset.previewScale);
    const previewScrollContainer = screen.getByTestId('preview-scroll-container');

    expect(sheet).toHaveAttribute('data-anchor', 'peek');
    const previewScaleInitial = getPreviewScale();
    const peekPadding = previewScrollContainer.style.paddingBottom;

    fireEvent.click(screen.getByTestId('sheet-handle'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'default');
    });
    const previewScaleExpanded = getPreviewScale();
    const expandedPadding = previewScrollContainer.style.paddingBottom;

    expect(previewScaleExpanded).toBe(previewScaleInitial);
    expect(expandedPadding).not.toBe(peekPadding);

    fireEvent.click(screen.getByTestId('typing-focus'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'peek');
    });

    expect(getPreviewScale()).toBe(previewScaleInitial);
    expect(previewScrollContainer.style.paddingBottom).toBe(peekPadding);
  });

  it('updates preview bottom scroll space as sheet height changes without changing preview scale', async () => {
    mockMatchMedia(true);
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(<RootEditorPageClient />);

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const getPreviewScale = () => Number(screen.getByTestId('handwriting-editor').dataset.previewScale);
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

  it('does not recompute layout or scale during pinch zoom', async () => {
    mockMatchMedia(true);
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, writable: true, value: 844 });
    
    const visualViewport = new EventTarget() as any;
    visualViewport.width = 390;
    visualViewport.height = 844;
    visualViewport.scale = 1;
    Object.defineProperty(globalThis, 'visualViewport', { configurable: true, writable: true, value: visualViewport });

    render(<RootEditorPageClient />);

    await screen.findByTestId('mobile-editor-bottom-sheet');
    const getPreviewScale = () => Number(screen.getByTestId('handwriting-editor').dataset.previewScale);
    const initialScale = getPreviewScale();

    const previewScrollContainer = screen.getByTestId('preview-scroll-container');
    const parsePadding = () => Number.parseFloat(previewScrollContainer.style.paddingBottom);
    const initialPadding = parsePadding();

    await act(async () => {
      visualViewport.width = 195;
      visualViewport.height = 422;
      visualViewport.scale = 2;
      visualViewport.dispatchEvent(new Event('resize'));
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getPreviewScale()).toBe(initialScale);
    expect(parsePadding()).toBe(initialPadding);
  });

  it('opens custom confirmation dialog when clear all is triggered and resets state on confirm', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm');
    render(<RootEditorPageClient />);

    // Click the Mock Clear All button inside mocked SettingsPanel
    const clearAllTrigger = screen.getByTestId('clear-all-trigger');
    fireEvent.click(clearAllTrigger);

    // Verify custom Dialog is opened
    expect(await screen.findByText('Clear Everything')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove all text/i)).toBeInTheDocument();

    // Verify window.confirm was not called
    expect(confirmSpy).not.toHaveBeenCalled();

    // Verify Cancel and Clear buttons exist
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(cancelButton).toBeInTheDocument();
    expect(clearButton).toBeInTheDocument();

    // Clicking cancel closes the dialog
    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(screen.queryByText('Clear Everything')).not.toBeInTheDocument();
    });

    // Reopen and click clear to verify
    fireEvent.click(clearAllTrigger);
    const clearButtonSecond = await screen.findByRole('button', { name: /clear/i });
    fireEvent.click(clearButtonSecond);

    await waitFor(() => {
      expect(screen.queryByText('Clear Everything')).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('renders canvas toolbar on desktop and wires zoom controls correctly', () => {
    render(<RootEditorPageClient />);

    const canvasToolbar = screen.getByTestId('canvas-toolbar');
    expect(canvasToolbar).toBeInTheDocument();

    const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });
    const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
    expect(zoomOutBtn).toBeInTheDocument();
    expect(zoomInBtn).toBeInTheDocument();

    const editor = screen.getByTestId('handwriting-editor');
    const initialScale = Number(editor.dataset.previewScale);

    fireEvent.click(zoomOutBtn);
    expect(Number(editor.dataset.previewScale)).toBe(Number((initialScale - 0.1).toFixed(2)));

    fireEvent.click(zoomInBtn);
    expect(Number(editor.dataset.previewScale)).toBe(initialScale);
  });

  it('does not render canvas toolbar on mobile', () => {
    mockMatchMedia(true);
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(<RootEditorPageClient />);
    expect(screen.queryByTestId('canvas-toolbar')).not.toBeInTheDocument();
  });
});
