import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportPanel from '../ExportPanel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

const { capturePageElementToCanvasMock, captureSnapshots, settlePageElementForCaptureMock } = vi.hoisted(() => ({
  captureSnapshots: [] as Array<{ mode: string | null; text: string; hostAll: string; pageAll: string }>,
  capturePageElementToCanvasMock: vi.fn(async ({ page }: { page: HTMLElement }) => {
    const renderedPage = page.querySelector<HTMLElement>('[data-page-content-mode]');
    captureSnapshots.push({
      mode: renderedPage?.getAttribute('data-page-content-mode') ?? null,
      text: page.textContent ?? '',
      hostAll: page.style.all,
      pageAll: renderedPage?.style.all ?? '',
    });
    const canvas = document.createElement('canvas');
    canvas.toBlob = ((callback: BlobCallback) => callback(new Blob(['page']))) as HTMLCanvasElement['toBlob'];
    return canvas;
  }),
  settlePageElementForCaptureMock: vi.fn(async () => {}),
}));

vi.mock('@/lib/domExport', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domExport')>('@/lib/domExport');
  return {
    ...actual,
    capturePageElementToCanvas: capturePageElementToCanvasMock,
    settlePageElementForCapture: settlePageElementForCaptureMock,
  };
});

describe('ExportPanel', () => {
  const props = {
    hasContent: false,
    settings: DEFAULT_SETTINGS,
    pages: [[]],
    isPaginationComplete: true,
    pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
    totalPages: 1,
  };

  beforeEach(() => {
    capturePageElementToCanvasMock.mockClear();
    captureSnapshots.length = 0;
    settlePageElementForCaptureMock.mockClear();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    class MockWorker {
      private listeners = new Set<(event: MessageEvent) => void>();

      addEventListener(_type: string, listener: (event: MessageEvent) => void) {
        this.listeners.add(listener);
      }

      removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
        this.listeners.delete(listener);
      }

      postMessage(message: { type: string }) {
        if (message.type === 'init') {
          setTimeout(() => this.emit({ type: 'initialized' }), 0);
          return;
        }

        if (message.type === 'generate') {
          setTimeout(() => this.emit({ type: 'generated', payload: new ArrayBuffer(8) }), 0);
        }
      }

      terminate() {}

      private emit(data: unknown) {
        const event = { data } as MessageEvent;
        this.listeners.forEach((listener) => listener(event));
      }
    }

    vi.stubGlobal('Worker', MockWorker);
  });

  it('keeps export visible while disabled and explains how to unlock it', () => {
    render(<ExportPanel {...props} />);

    const exportButton = screen.getByRole('button', { name: /export pdf/i });

    expect(screen.getByRole('heading', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/format/i)).toBeEnabled();
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAccessibleDescription(/add text in the preview to export/i);
    expect(screen.getByText(/add text in the preview to export/i)).toBeInTheDocument();
    expect(screen.queryByText(/single pdf/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/monitor progress inside the sidebar/i)).not.toBeInTheDocument();
  });

  it('shows the format note once export is available', () => {
    render(<ExportPanel {...props} hasContent />);

    const exportButton = screen.getByRole('button', { name: /export pdf/i });

    expect(exportButton).toBeEnabled();
    expect(exportButton).not.toHaveAccessibleDescription();
    expect(screen.getByText(/single pdf/i)).toBeInTheDocument();
    expect(screen.queryByText(/add text in the preview to export/i)).not.toBeInTheDocument();
  });

  it('captures hidden export-mode page instances from the shared DOM renderer', async () => {
    const onExportingChange = vi.fn();

    render(
      <ExportPanel
        {...props}
        hasContent
        pages={[
          [{ text: 'First page', lineIndex: 0, hasNewline: false }],
          [{ text: 'Second page', lineIndex: 1, hasNewline: false }],
        ]}
        pageSettingsByPage={[
          defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
          defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
        ]}
        totalPages={2}
        onExportingChange={onExportingChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(capturePageElementToCanvasMock).toHaveBeenCalledTimes(2);
    });

    expect(captureSnapshots).toHaveLength(2);
    expect(captureSnapshots[0].mode).toBe('export');
    expect(captureSnapshots[1].mode).toBe('export');
    expect(captureSnapshots[0].hostAll).toBe('initial');
    expect(captureSnapshots[1].hostAll).toBe('initial');
    expect(captureSnapshots[0].pageAll).toBe('initial');
    expect(captureSnapshots[1].pageAll).toBe('initial');
    expect(captureSnapshots[0].text).toContain('First page');
    expect(captureSnapshots[1].text).toContain('Second page');
    expect(settlePageElementForCaptureMock).toHaveBeenCalledTimes(2);
    expect(onExportingChange).toHaveBeenNthCalledWith(1, true);
    expect(onExportingChange).toHaveBeenLastCalledWith(false);
  });
});
