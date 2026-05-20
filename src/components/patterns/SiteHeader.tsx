import Link from 'next/link';
import ThemePicker from '../ThemePicker';

interface SiteHeaderProps {
  cta?: React.ReactNode;
  hideContactLink?: boolean;
}

export default function SiteHeader({ cta, hideContactLink }: SiteHeaderProps = {}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
      <Link
        href="/"
        className="font-bold text-2xl sm:text-3xl font-dancing-script hover:text-brand-accent transition-colors"
      >
        <span className="text-brand-accent">Text</span>
        <span className="text-foreground">2</span>
        <span className="text-brand-accent">Ink</span>
      </Link>
      <div className="flex items-center gap-3 sm:gap-4">
        <ThemePicker />
        {!hideContactLink && (
          <Link
            href="/contact"
            className="text-sm sm:text-base font-medium text-muted-foreground hover:text-brand-accent transition-colors"
          >
            Contact
          </Link>
        )}
        {cta}
      </div>
    </div>
  );
}
