import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeCycleButton, ThemeProvider } from '@/components/theme/ThemeProvider';
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
    document.documentElement.removeAttribute('data-theme-preference');
    mockMatchMedia(false);
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
  });

  it('cycles the header theme button through system, light, and dark while persisting locally', async () => {
    render(
      <ThemeProvider>
        <ThemeCycleButton />
      </ThemeProvider>,
    );

    expect(screen.queryByRole('combobox', { name: /theme preference/i })).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: /theme preference: system/i });
    expect(button).toHaveAttribute('title', expect.stringMatching(/system/i));

    fireEvent.click(button);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });
    expect(document.documentElement).toHaveAttribute('data-theme-preference', 'light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(screen.getByRole('button', { name: /theme preference: light/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /theme preference: light/i }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(document.documentElement).toHaveAttribute('data-theme-preference', 'dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('initializes system preference from the current OS color scheme', async () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeCycleButton />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(document.documentElement).toHaveAttribute('data-theme-preference', 'system');
    expect(screen.getByRole('button', { name: /theme preference: system/i })).toBeInTheDocument();
  });
});
