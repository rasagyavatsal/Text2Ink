import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface WorkspaceShellProps {
  topControls: ReactNode;
  settings: ReactNode;
  canvas: ReactNode;
  mobileControlsSheet?: ReactNode;
  isMobileTopControlsVisible?: boolean;
}

export default function WorkspaceShell({
  topControls,
  settings,
  canvas,
  mobileControlsSheet,
  isMobileTopControlsVisible = true,
}: WorkspaceShellProps) {
  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-20 transition-transform xl:left-96",
          !isMobileTopControlsVisible && "hidden xl:block"
        )}
      >
        {topControls}
      </div>

      <div className="flex h-full min-h-0 box-border overflow-hidden bg-muted">
        <aside className="hidden xl:flex flex-col w-96 shrink-0 bg-background border-r border-border overflow-y-auto overscroll-contain">
          {settings}
        </aside>

        <main className="flex-1 min-h-0 relative">
          {canvas}
        </main>
      </div>

      {mobileControlsSheet && (
        <div className="xl:hidden">
          {mobileControlsSheet}
        </div>
      )}
    </div>
  );
}
