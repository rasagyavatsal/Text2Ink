import React, { ReactNode } from 'react';

export interface StandardPageShellProps {
  header: ReactNode;
  content: ReactNode;
  footer: ReactNode;
}

export default function StandardPageShell({
  header,
  content,
  footer,
}: StandardPageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 w-full">
          {header}
        </div>
      </header>

      <main className="py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          {content}
        </div>
      </main>

      <footer
        className="border-t border-border bg-background py-6 sm:py-8 mt-12"
        role="contentinfo"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          {footer}
        </div>
      </footer>
    </div>
  );
}
