'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button, type buttonVariants } from '@/components/ui/button';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface ThemePickerProps {
  className?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
}

const subscribeClientReady = () => () => {};
const getClientReadySnapshot = () => true;
const getServerReadySnapshot = () => false;

export default function ThemePicker({ className, variant = 'outline' }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );

  if (!mounted) {
    return <div className={cn("h-control-md aspect-square rounded-lg border border-border bg-background animate-pulse", className)} />;
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
    <Button
      variant={variant}
      size="chrome"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className={cn("text-brand-accent hover:text-foreground hover:bg-muted", className)}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}
