import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportPanel from '@/components/ExportPanel';
import { DEFAULT_SETTINGS } from '@/lib/types';

type JsPdfInstance = {
  addImage: jest.Mock;
  addPage: jest.Mock;
  save: jest.Mock;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
};

const html2canvasMock = jest.fn();
let jsPdfInstance: JsPdfInstance | null = null;

jest.mock('html2canvas', () => ({
  __esModule: true,
  default: (...args: any[]) => html2canvasMock(...args),
}));

jest.mock('jspdf', () => {
  return {
    __esModule: true,
    default: function JsPDFMock() {
      jsPdfInstance = {
        addImage: jest.fn(),
        addPage: jest.fn(),
        save: jest.fn(),
        internal: {
          pageSize: {
            getWidth: () => 612,
            getHeight: () => 792,
          },
        },
      };
      return jsPdfInstance;
    },
  };
});

describe('ExportPanel', () => {
  beforeEach(() => {
    jsPdfInstance = null;
    html2canvasMock.mockReset();

    (window as any).requestAnimationFrame = (cb: any) => {
      cb(0);
      return 0;
    };

    window.alert = jest.fn();
  });

  it('disables export when no content', () => {
    const pageRefs = { current: [] as (HTMLDivElement | null)[] } as React.MutableRefObject<
      (HTMLDivElement | null)[]
    >;

    render(<ExportPanel pageRefs={pageRefs} hasContent={false} settings={DEFAULT_SETTINGS} />);

    expect(screen.getByRole('button', { name: /Export PDF/i })).toBeDisabled();
    expect(screen.getByText('Start typing to enable export')).toBeInTheDocument();
  });

  it('exports a PDF when content exists', async () => {
    const user = userEvent.setup();

    const page = document.createElement('div');
    page.style.backgroundColor = 'rgb(255, 255, 255)';

    const pageRefs = { current: [page] as (HTMLDivElement | null)[] } as React.MutableRefObject<
      (HTMLDivElement | null)[]
    >;

    html2canvasMock.mockResolvedValue({
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,xxx'),
    });

    const onExportingChange = jest.fn();

    render(
      <ExportPanel
        pageRefs={pageRefs}
        hasContent
        settings={DEFAULT_SETTINGS}
        onExportingChange={onExportingChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /Export PDF/i }));

    await waitFor(() => {
      expect(jsPdfInstance?.save).toHaveBeenCalledWith('handwritten-document.pdf');
    });

    expect(html2canvasMock).toHaveBeenCalledTimes(1);
    expect(onExportingChange).toHaveBeenCalledWith(true);
    expect(onExportingChange).toHaveBeenCalledWith(false);
  });
});
