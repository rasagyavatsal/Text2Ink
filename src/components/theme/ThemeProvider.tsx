'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  loadThemePreference,
  persistThemePreference,
  resolveThemePreference,
  sanitizeThemePreference,
  type ThemePreference,
} from '@/lib/themePreference';
import type { ChromeTheme } from '@/lib/designSystem';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ChromeTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolvedTheme: 'light',
  setPreference: () => {},
});

function getSystemDark() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function getLocalStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => loadThemePreference(getLocalStorage()));
  const [systemDark, setSystemDark] = useState(() => getSystemDark());

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return;

    const update = () => setSystemDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const resolvedTheme = resolveThemePreference(preference, systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference: (nextPreference) => {
        const sanitized = sanitizeThemePreference(nextPreference);
        setPreferenceState(sanitized);
        persistThemePreference(getLocalStorage(), sanitized);
      },
    }),
    [preference, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeModeSelect({ className }: { className?: string }) {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <label className={cn('inline-flex items-center gap-2 text-sm font-medium text-[var(--t2i-content-muted)]', className)}>
      <span className="sr-only">Theme</span>
      <select
        aria-label="Theme preference"
        suppressHydrationWarning
        className="h-9 rounded-full border border-[var(--t2i-border-default)] bg-[var(--t2i-surface-panel)] px-3 text-xs font-semibold text-[var(--t2i-content-normal)] shadow-sm outline-none transition focus-visible:border-[var(--t2i-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)]"
        value={preference}
        onChange={(event) => setPreference(sanitizeThemePreference(event.target.value))}
        title={`Chrome theme: ${resolvedTheme}`}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
