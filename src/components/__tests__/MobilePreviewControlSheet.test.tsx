import React, { type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MobilePreviewControlSheet from '../MobilePreviewControlSheet';
import type { MobileEditorSheetMetrics, MobileSheetAnchor } from '@/lib/mobileEditorSheet';
import { computeMobileEditorSheetMetrics } from '@/lib/mobileEditorSheet';

type MockMobileEditorBottomSheetProps = {
  activePanel: 'settings' | 'export';
  anchor: MobileSheetAnchor;
  exportPanel: ReactNode;
  metrics: MobileEditorSheetMetrics;
  onActivePanelChange: (panel: 'settings' | 'export') => void;
  onHandlePress: () => void;
  onHeightChange: (height: number) => void;
  settingsPanel: ReactNode;
};

function mockVisualViewport({
  width,
  height,
  offsetTop = 0,
}: {
  width: number;
  height: number;
  offsetTop?: number;
}) {
  const visualViewport = {
    width,
    height,
    offsetTop,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: visualViewport,
  });

  return visualViewport;
}

vi.mock('@/components/MobileEditorBottomSheet', () => ({
  default: function MockMobileEditorBottomSheet({
    activePanel,
    anchor,
    exportPanel,
    metrics,
    onActivePanelChange,
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
        <button type="button" data-testid="show-settings-panel" onClick={() => onActivePanelChange('settings')}>
          Show settings
        </button>
        <button type="button" data-testid="show-export-panel" onClick={() => onActivePanelChange('export')}>
          Show export
        </button>
        {activePanel === 'settings' ? settingsPanel : exportPanel}
      </div>
    );
  },
}));

describe('MobilePreviewControlSheet', () => {
  it('starts with a control sheet inset that matches the default control sheet height', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(
      <MobilePreviewControlSheet
        activePanel="settings"
        exportPanel={<div data-testid="export-panel">Export panel</div>}
        headerHeight={72}
        pageHeight={1123}
        pageWidth={794}
        rawPreviewScale={1}
        onActivePanelChange={vi.fn()}
        onRawPreviewScaleChange={vi.fn()}
        Preview={({ previewScale }) => <div data-testid="preview" data-preview-scale={previewScale} />}
        SettingsPanel={({ previewScale }) => (
          <div data-testid="settings-panel" data-visible-scale={previewScale}>
            Settings panel
          </div>
        )}
      />,
    );

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const expectedMetrics = computeMobileEditorSheetMetrics({
      viewportHeight: 844,
      viewportWidth: 390,
      headerHeight: 72,
    });

    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    expect(screen.getByTestId('preview-scroll-container').style.paddingBottom).toBe(
      `${expectedMetrics.defaultSheetHeight}px`,
    );
  });

  it('keeps the preview scale stable while the control sheet height changes', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(
      <MobilePreviewControlSheet
        activePanel="settings"
        exportPanel={<div data-testid="export-panel">Export panel</div>}
        headerHeight={72}
        pageHeight={1123}
        pageWidth={794}
        rawPreviewScale={0.5}
        onActivePanelChange={vi.fn()}
        onRawPreviewScaleChange={vi.fn()}
        Preview={({ previewScale }) => <div data-testid="preview" data-preview-scale={previewScale} />}
        SettingsPanel={({ previewScale }) => (
          <div data-testid="settings-panel" data-visible-scale={previewScale}>
            Settings panel
          </div>
        )}
      />,
    );

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const previewScrollContainer = screen.getByTestId('preview-scroll-container');
    const getPreviewScale = () => Number(screen.getByTestId('preview').getAttribute('data-preview-scale'));
    const parsePadding = () => Number.parseFloat(previewScrollContainer.style.paddingBottom);
    const initialScale = getPreviewScale();
    const defaultPadding = parsePadding();

    fireEvent.click(screen.getByTestId('sheet-drag-expanded'));

    await waitFor(() => {
      expect(parsePadding()).toBeGreaterThan(defaultPadding);
    });
    expect(getPreviewScale()).toBe(initialScale);

    fireEvent.click(screen.getByTestId('sheet-drag-peek'));

    await waitFor(() => {
      expect(parsePadding()).toBeLessThan(defaultPadding);
    });
    expect(getPreviewScale()).toBe(initialScale);
  });

  it('collapses to peek when preview editing starts and stays there after editing ends', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(
      <MobilePreviewControlSheet
        activePanel="settings"
        exportPanel={<div data-testid="export-panel">Export panel</div>}
        headerHeight={72}
        pageHeight={1123}
        pageWidth={794}
        rawPreviewScale={0.5}
        onActivePanelChange={vi.fn()}
        onRawPreviewScaleChange={vi.fn()}
        Preview={({ previewScale, onPreviewEditingChange }) => (
          <div data-testid="preview" data-preview-scale={previewScale}>
            <button type="button" data-testid="preview-editing-start" onClick={() => onPreviewEditingChange(true)}>
              Start typing
            </button>
            <button type="button" data-testid="preview-editing-stop" onClick={() => onPreviewEditingChange(false)}>
              Stop typing
            </button>
          </div>
        )}
        SettingsPanel={({ previewScale }) => (
          <div data-testid="settings-panel" data-visible-scale={previewScale}>
            Settings panel
          </div>
        )}
      />,
    );

    await screen.findByTestId('mobile-editor-bottom-sheet');

    fireEvent.click(screen.getByTestId('preview-editing-start'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'peek');
    });

    fireEvent.click(screen.getByTestId('preview-editing-stop'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'peek');
    });
  });

  it('blurs the active preview editor instead of expanding the control sheet while the keyboard is open', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });
    const visualViewport = mockVisualViewport({ width: 390, height: 844 });

    render(
      <MobilePreviewControlSheet
        activePanel="settings"
        exportPanel={<div data-testid="export-panel">Export panel</div>}
        headerHeight={72}
        pageHeight={1123}
        pageWidth={794}
        rawPreviewScale={0.5}
        onActivePanelChange={vi.fn()}
        onRawPreviewScaleChange={vi.fn()}
        Preview={({ previewScale, onPreviewEditingChange }) => (
          <div data-testid="preview" data-preview-scale={previewScale}>
            <textarea
              aria-label="Preview editor"
              onFocus={() => onPreviewEditingChange(true)}
              onBlur={() => onPreviewEditingChange(false)}
            />
          </div>
        )}
        SettingsPanel={({ previewScale }) => (
          <div data-testid="settings-panel" data-visible-scale={previewScale}>
            Settings panel
          </div>
        )}
      />,
    );

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const previewEditor = screen.getByRole('textbox', { name: 'Preview editor' });
    const previewScrollContainer = screen.getByTestId('preview-scroll-container');
    const parsePadding = () => Number.parseFloat(previewScrollContainer.style.paddingBottom);

    await act(async () => {
      previewEditor.focus();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'peek');
    });

    visualViewport.height = 568;
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      expect(parsePadding()).toBe(276);
    });
    expect(previewEditor).toHaveFocus();

    fireEvent.click(screen.getByTestId('sheet-handle'));

    await waitFor(() => {
      expect(previewEditor).not.toHaveFocus();
    });
    expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'peek');
  });

  it('preserves the current control sheet height while switching between settings and export', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    function Harness() {
      const [activePanel, setActivePanel] = React.useState<'settings' | 'export'>('settings');

      return (
        <MobilePreviewControlSheet
          activePanel={activePanel}
          exportPanel={<div data-testid="export-panel">Export panel</div>}
          headerHeight={72}
          pageHeight={1123}
          pageWidth={794}
          rawPreviewScale={0.5}
          onActivePanelChange={setActivePanel}
          onRawPreviewScaleChange={vi.fn()}
          Preview={({ previewScale }) => <div data-testid="preview" data-preview-scale={previewScale} />}
          SettingsPanel={({ previewScale }) => (
            <div data-testid="settings-panel" data-visible-scale={previewScale}>
              Settings panel
            </div>
          )}
        />
      );
    }

    render(<Harness />);

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const previewScrollContainer = screen.getByTestId('preview-scroll-container');
    const parsePadding = () => Number.parseFloat(previewScrollContainer.style.paddingBottom);

    fireEvent.click(screen.getByTestId('sheet-drag-expanded'));

    await waitFor(() => {
      expect(parsePadding()).toBeGreaterThan(0);
    });
    const expandedPadding = parsePadding();

    fireEvent.click(screen.getByTestId('show-export-panel'));

    await waitFor(() => {
      expect(screen.getByTestId('export-panel')).toBeInTheDocument();
    });
    expect(parsePadding()).toBe(expandedPadding);

    fireEvent.click(screen.getByTestId('show-settings-panel'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    });
    expect(parsePadding()).toBe(expandedPadding);
  });

  it('reveals a latent raw preview scale again when the mobile clamp relaxes', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(
      <MobilePreviewControlSheet
        activePanel="settings"
        exportPanel={<div data-testid="export-panel">Export panel</div>}
        headerHeight={72}
        pageHeight={1123}
        pageWidth={794}
        rawPreviewScale={0.6}
        onActivePanelChange={vi.fn()}
        onRawPreviewScaleChange={vi.fn()}
        Preview={({ previewScale }) => <div data-testid="preview" data-preview-scale={previewScale} />}
        SettingsPanel={({ previewScale }) => (
          <div data-testid="settings-panel" data-visible-scale={previewScale}>
            Settings panel
          </div>
        )}
      />,
    );

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const getPreviewScale = () => Number(screen.getByTestId('preview').getAttribute('data-preview-scale'));

    expect(getPreviewScale()).toBeLessThan(0.6);

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 768 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 1024 });
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      expect(getPreviewScale()).toBe(0.6);
    });
  });

  it('keeps the current mobile overwrite quirk when zoom is changed while clamped', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    function Harness() {
      const [rawPreviewScale, setRawPreviewScale] = React.useState(0.6);

      return (
        <MobilePreviewControlSheet
          activePanel="settings"
          exportPanel={<div data-testid="export-panel">Export panel</div>}
          headerHeight={72}
          pageHeight={1123}
          pageWidth={794}
          rawPreviewScale={rawPreviewScale}
          onActivePanelChange={vi.fn()}
          onRawPreviewScaleChange={setRawPreviewScale}
          Preview={({ previewScale }) => <div data-testid="preview" data-preview-scale={previewScale} />}
          SettingsPanel={({ onPreviewScaleChange, previewScale }) => (
            <div data-testid="settings-panel" data-visible-scale={previewScale}>
              <button type="button" data-testid="set-preview-scale-to-one" onClick={() => onPreviewScaleChange(1)}>
                Set preview scale to 1
              </button>
            </div>
          )}
        />
      );
    }

    render(<Harness />);

    await screen.findByTestId('mobile-editor-bottom-sheet');

    const getPreviewScale = () => Number(screen.getByTestId('preview').getAttribute('data-preview-scale'));
    const clampedScale = getPreviewScale();

    fireEvent.click(screen.getByTestId('set-preview-scale-to-one'));

    await waitFor(() => {
      expect(getPreviewScale()).toBe(clampedScale);
    });

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 768 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 1024 });
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      expect(getPreviewScale()).toBe(clampedScale);
    });
  });
});
