import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditorPage from '@/app/editor/page';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

jest.mock('next/link', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ href, children, ...props }: any) => React.createElement('a', { href, ...props }, children),
  };
});

describe('EditorPage (integration)', () => {
  const storageKey = 'text2ink.editor.state';

  const readLastSaved = (spy: jest.SpyInstance) => {
    const calls = spy.mock.calls.filter(([key]) => key === storageKey);
    expect(calls.length).toBeGreaterThan(0);
    const [, value] = calls[calls.length - 1];
    return JSON.parse(value as string);
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('loads persisted state on mount', async () => {
    const persisted = {
      version: 1 as const,
      updatedAt: 123,
      text: 'Persisted text',
      settings: DEFAULT_SETTINGS,
      pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
      textFields: [],
      ui: {
        activePanel: 'export' as const,
        sidebarOpen: false,
        previewScale: 1.5,
        currentPageIndex: 0,
      },
    };

    window.localStorage.setItem(storageKey, JSON.stringify(persisted));

    render(<EditorPage />);

    expect(await screen.findByDisplayValue('Persisted text')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Export PDF' })).toBeEnabled();
    expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();
  });

  it('saves updated text to localStorage after debounce', async () => {
    jest.useFakeTimers();

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<EditorPage />);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    setItemSpy.mockClear();

    const input = screen.getByLabelText('Handwriting text input');
    await user.type(input, 'Hello');

    act(() => {
      jest.advanceTimersByTime(450);
    });

    const saved = readLastSaved(setItemSpy);
    expect(saved.text).toBe('Hello');
  });

  it('saves current state on beforeunload', async () => {
    jest.useFakeTimers();

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<EditorPage />);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    setItemSpy.mockClear();

    const input = screen.getByLabelText('Handwriting text input');
    await user.type(input, 'Z');

    expect(await screen.findByDisplayValue('Z')).toBeInTheDocument();

    window.dispatchEvent(new Event('beforeunload'));

    const saved = readLastSaved(setItemSpy);
    expect(saved.text).toBe('Z');
  });

  it('persists ui state changes (active panel, sidebar)', async () => {
    jest.useFakeTimers();

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<EditorPage />);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    setItemSpy.mockClear();

    await user.click(screen.getByRole('button', { name: /export/i }));
    expect(await screen.findByText('Format')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Close sidebar'));
    expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(450);
    });

    const saved = readLastSaved(setItemSpy);
    expect(saved.ui.activePanel).toBe('export');
    expect(saved.ui.sidebarOpen).toBe(false);
  });

  it('shows desktop-only screen on likely mobile devices', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'userAgent', {
      value: 'iPhone',
      configurable: true,
    });

    window.matchMedia = ((query: string) => {
      return {
        matches: query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    }) as any;

    render(<EditorPage />);

    expect(screen.getByText('Editor is desktop-only')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeInTheDocument();
  });
});
