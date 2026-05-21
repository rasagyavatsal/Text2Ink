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
  const frameClasses = 'mx-auto w-full max-w-content px-page-x';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background" role="banner">
        <div className={`${frameClasses} py-chrome-y`}>
          {header}
        </div>
      </header>

      <main className="py-page-y">
        <div className={frameClasses}>
          {content}
        </div>
      </main>

      <footer
        className="border-t border-border bg-background py-footer mt-section"
        role="contentinfo"
      >
        <div className={frameClasses}>
          {footer}
        </div>
      </footer>
    </div>
  );
}
