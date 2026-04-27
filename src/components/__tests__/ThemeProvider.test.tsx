import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeModeSelect, ThemeProvider } from '@/components/theme/ThemeProvider';
import { THEME_STORAGE_KEY } from '@/lib/themePreference';

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

function installMemoryLocalStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    mockMatchMedia(false);
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('lets users choose a dark chrome theme and persists that preference locally', async () => {
    render(
      <ThemeProvider>
        <ThemeModeSelect />
      </ThemeProvider>,
    );

    const selector = screen.getByRole('combobox', { name: /theme preference/i });
    expect(selector).toHaveValue('system');

    fireEvent.change(selector, { target: { value: 'dark' } });

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('initializes system preference from the current OS color scheme', async () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeModeSelect />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(screen.getByRole('combobox', { name: /theme preference/i })).toHaveValue('system');
  });
});
