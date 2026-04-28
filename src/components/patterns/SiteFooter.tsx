import Version from '@/components/Version';
import { cn } from '@/lib/utils';

type SiteFooterProps = {
  className?: string;
};

export default function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={cn('border-t border-[var(--t2i-border-subtle)] px-4 py-4 sm:px-6', className)}
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-[var(--t2i-content-muted)] sm:flex-row">
        <p>© {new Date().getFullYear()} Text2Ink. All rights reserved.</p>
        <Version />
      </div>
    </footer>
  );
}
