'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-control-md aspect-square rounded-lg border border-border bg-background animate-pulse" />;
  }

  const currentTheme = theme || 'system';
  const Icon = currentTheme === 'light' ? Sun : currentTheme === 'dark' ? Moon : Monitor;
  const label = currentTheme === 'light' ? 'Light theme' : currentTheme === 'dark' ? 'Dark theme' : 'System theme';

  const cycleTheme = () => {
    if (currentTheme === 'light') setTheme('dark');
    else if (currentTheme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className="flex items-center justify-center h-control-md aspect-square rounded-lg border border-border bg-background shadow-sm text-brand-accent transition-colors hover:text-foreground hover:bg-muted"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
