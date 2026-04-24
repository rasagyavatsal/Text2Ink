import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import RootEditorPageClient from '../RootEditorPageClient';
import { metadata } from '../page';

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
  anchor: string;
  exportPanel: ReactNode;
  onHandlePress: () => void;
  settingsPanel: ReactNode;
};

vi.mock('@/components/MobileEditorBottomSheet', () => ({
  default: ({ activePanel, anchor, exportPanel, onHandlePress, settingsPanel }: MockMobileEditorBottomSheetProps) => (
    <div data-testid="mobile-editor-bottom-sheet" data-anchor={anchor}>
      <button type="button" data-testid="sheet-handle" onClick={onHandlePress}>
        Sheet handle
      </button>
      {activePanel === 'settings' ? settingsPanel : exportPanel}
    </div>
  ),
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

  it('uses the persistent bottom sheet on mobile and collapses it while typing', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

    render(<RootEditorPageClient />);

    const sheet = await screen.findByTestId('mobile-editor-bottom-sheet');
    expect(sheet).toHaveAttribute('data-anchor', 'default');
    expect(Number(screen.getByTestId('handwriting-editor').getAttribute('data-preview-scale'))).toBeLessThan(1);

    fireEvent.click(screen.getByTestId('typing-focus'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'peek');
    });

    fireEvent.click(screen.getByTestId('sheet-handle'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-bottom-sheet')).toHaveAttribute('data-anchor', 'default');
    });
  });
});
