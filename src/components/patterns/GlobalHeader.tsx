'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeCycleButton } from '@/components/theme/ThemeProvider';
import { getGlobalHeaderGutterClassName } from '@/lib/headerLayout';
import { cn } from '@/lib/utils';

type HeaderAction = {
  href: string;
  label: string;
  tone?: 'primary' | 'ghost';
};

type GlobalHeaderProps = {
  action?: HeaderAction;
  className?: string;
};

const actionClassName = (tone: HeaderAction['tone'] = 'ghost') =>
  cn(
    'inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)]',
    tone === 'primary'
      ? 'bg-[var(--t2i-brand-primary)] text-[var(--t2i-brand-on-primary)] shadow-sm hover:bg-[var(--t2i-brand-hover)]'
      : 'text-[var(--t2i-content-normal)] hover:bg-[var(--t2i-state-hover)] hover:text-[var(--t2i-content-strong)]',
  );

const GlobalHeader = React.forwardRef<HTMLElement, GlobalHeaderProps>(function GlobalHeader(
  { action = { href: '/contact', label: 'Contact', tone: 'ghost' }, className },
  ref,
) {
  return (
    <header ref={ref} className={cn('t2i-global-header shrink-0', className)} role="banner">
      <div data-testid="global-header-inner" className={getGlobalHeaderGutterClassName()}>
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full text-lg font-bold tracking-tight text-[var(--t2i-content-strong)] transition hover:text-[var(--t2i-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)] sm:text-xl"
          aria-label="Text2Ink"
        >
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg border border-[var(--t2i-border-subtle)] bg-[var(--t2i-surface-raised)]">
            <Image src="/logo-without-background.png" alt="Text2Ink logo" width={32} height={32} className="h-7 w-7 object-contain" priority />
          </span>
          <span>Text2Ink</span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Primary navigation">
          <ThemeCycleButton />
          <Link href={action.href} className={actionClassName(action.tone)}>
            {action.label}
          </Link>
        </nav>
      </div>
    </header>
  );
});

export default GlobalHeader;
