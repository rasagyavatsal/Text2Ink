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
        {header}
      </header>

      <main className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        {content}
      </main>

      <footer
        className="border-t border-border bg-background py-6 sm:py-8 px-4 sm:px-6 mt-12"
        role="contentinfo"
      >
        {footer}
      </footer>
    </div>
  );
}
