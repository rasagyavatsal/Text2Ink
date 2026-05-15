import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RootEditorPageClient from '../../RootEditorPageClient';

type MockHandwritingEditorProps = {
  isExportLocked?: boolean;
};

type MockSettingsPanelProps = {
  isExportLocked?: boolean;
};

type MockExportPanelProps = {
  onExportingChange?: (isExporting: boolean) => void;
};

vi.mock('@/components/HandwritingEditor', () => ({
  default: ({ isExportLocked }: MockHandwritingEditorProps) => (
    <div data-testid="handwriting-editor" data-export-locked={String(isExportLocked)}>
      Handwriting Editor
    </div>
  ),
}));

vi.mock('@/components/SettingsPanel', () => ({
  default: ({ isExportLocked }: MockSettingsPanelProps) => (
    <div data-testid="settings-panel" data-export-locked={String(isExportLocked)}>
      Settings panel
    </div>
  ),
}));

vi.mock('@/components/ExportPanel', () => ({
  default: ({ onExportingChange }: MockExportPanelProps) => (
    <div data-testid="export-panel">
      <button type="button" onClick={() => onExportingChange?.(true)}>
        Start export
      </button>
      <button type="button" onClick={() => onExportingChange?.(false)}>
        Stop export
      </button>
    </div>
  ),
}));

vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">1.0.0</span>,
}));

vi.mock('@/lib/editorPersistence', () => ({
  loadEditorStateV1: vi.fn(() => null),
  saveEditorStateV1: vi.fn(),
}));

describe('Editor export lock wiring', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('locks the preview and settings surfaces while export is in progress', () => {
    render(<RootEditorPageClient />);

    expect(screen.getByTestId('handwriting-editor')).toHaveAttribute('data-export-locked', 'false');
    expect(screen.getByTestId('settings-panel')).toHaveAttribute('data-export-locked', 'false');

    fireEvent.click(screen.getByRole('tab', { name: /export/i }));
    fireEvent.click(screen.getByRole('button', { name: /start export/i }));

    expect(screen.getByTestId('handwriting-editor')).toHaveAttribute('data-export-locked', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }));
    expect(screen.getByTestId('settings-panel')).toHaveAttribute('data-export-locked', 'true');

    fireEvent.click(screen.getByRole('tab', { name: /export/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop export/i }));

    expect(screen.getByTestId('handwriting-editor')).toHaveAttribute('data-export-locked', 'false');
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }));
    expect(screen.getByTestId('settings-panel')).toHaveAttribute('data-export-locked', 'false');
  });
});
