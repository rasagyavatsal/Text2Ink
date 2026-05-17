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
    return <div className="h-[34px] w-[100px] bg-muted rounded-lg animate-pulse" />;
  }

  return (
    <div className="flex bg-muted p-1 rounded-lg border border-border" role="group" aria-label="Theme preference">
      <button
        onClick={() => setTheme('light')}
        aria-label="Light theme"
        title="Light theme"
        className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-background shadow-sm text-brand-accent' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        aria-label="Dark theme"
        title="Dark theme"
        className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-background shadow-sm text-brand-accent' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        aria-label="System theme"
        title="System theme"
        className={`p-1.5 rounded-md transition-colors ${theme === 'system' ? 'bg-background shadow-sm text-brand-accent' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
