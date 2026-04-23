import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootEditorPageClient from '../RootEditorPageClient';
import { metadata } from '../page';

vi.mock('@/components/HandwritingEditor', () => ({
  default: () => <div data-testid="handwriting-editor">Handwriting Editor</div>,
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

vi.mock('@/lib/editorPersistence', () => ({
  loadEditorStateV1: vi.fn(() => null),
  saveEditorStateV1: vi.fn(),
}));

describe('Root editor page', () => {
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
});
