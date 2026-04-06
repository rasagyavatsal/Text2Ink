import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import EditorPage from '../page';

// Mock components to avoid deep rendering issues and browser API dependencies
vi.mock('@/components/HandwritingEditor', () => ({
  default: (props: { previewScale: number }) => (
    <div data-testid="handwriting-editor">
      <div data-testid="preview-scale">{props.previewScale}</div>
    </div>
  ),
}));

vi.mock('@/components/SettingsPanel', () => ({
  default: (props: { 
    previewScale: number; 
    onPreviewScaleChange: (val: number) => void 
  }) => (
    <div data-testid="settings-panel">
      <button onClick={() => props.onPreviewScaleChange(props.previewScale + 0.1)} data-testid="settings-zoom-in">Zoom In</button>
      <button onClick={() => props.onPreviewScaleChange(props.previewScale - 0.1)} data-testid="settings-zoom-out">Zoom Out</button>
    </div>
  ),
}));

vi.mock('@/components/ExportPanel', () => ({
  default: () => <div data-testid="export-panel" />,
}));

vi.mock('@/components/Version', () => ({
  default: () => <div data-testid="version" />,
}));

vi.mock('@/lib/editorPersistence', () => ({
  loadEditorStateV1: vi.fn(() => ({
    text: '',
    settings: {},
    pageSettingsByPage: [],
    ui: {
      activePanel: 'settings',
      sidebarOpen: true,
      previewScale: 1,
      currentPageIndex: 0,
    },
  })),
  saveEditorStateV1: vi.fn(),
}));

describe('EditorPage Zoom Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window width to a desktop size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
  });

  it('auto-fits zoom on mobile initial load', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    
    await act(async () => {
      render(<EditorPage />);
    });
    
    // Wait for mounting
    const scaleDisplay = await screen.findByTestId('preview-scale');
    
    // availableWidth = 375 - 32 = 343
    // scale = 343 / 612 = 0.5604... -> 0.56
    expect(scaleDisplay).toHaveTextContent('0.56');
  });

  it('re-auto-fits zoom on mobile rotation (resize) if not manually adjusted', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    
    await act(async () => {
      render(<EditorPage />);
    });
    
    const scaleDisplay = await screen.findByTestId('preview-scale');
    expect(scaleDisplay).toHaveTextContent('0.56');

    // Simulate rotation to landscape
    await act(async () => {
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });

    // availableWidth = 667 - 32 = 635
    // scale = 635 / 612 = 1.037... -> 1.04
    await waitFor(() => {
      expect(scaleDisplay).toHaveTextContent('1.04');
    });
  });

  it('stops auto-fitting zoom once manually adjusted', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    
    await act(async () => {
      render(<EditorPage />);
    });
    
    const scaleDisplay = await screen.findByTestId('preview-scale');
    await waitFor(() => expect(scaleDisplay).toHaveTextContent('0.56'));

    // Manually zoom in
    fireEvent.click(screen.getByTestId('settings-zoom-in'));
    
    // 0.56 + 0.1 = 0.66
    await waitFor(() => expect(scaleDisplay).toHaveTextContent('0.66'));

    // Simulate rotation - should NOT auto-fit now
    await act(async () => {
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });

    // Should still be 0.66, not 1.04
    // Wait a bit to ensure it doesn't change
    await new Promise(r => setTimeout(r, 50));
    expect(scaleDisplay).toHaveTextContent('0.66');
  });
});
