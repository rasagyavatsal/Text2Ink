import Link from 'next/link';
import ThemePicker from '../ThemePicker';
import { Button } from '@/components/ui/button';

interface SiteHeaderProps {
  cta?: React.ReactNode;
  hideContactLink?: boolean;
}

export default function SiteHeader({ cta, hideContactLink }: SiteHeaderProps = {}) {
  return (
    <div className="flex items-center justify-between w-full">
      <Link
        href="/"
        className="text-brand-mark font-bold font-dancing-script hover:text-brand-accent transition-colors"
      >
        Text2Ink
      </Link>
      <div className="flex items-center gap-chrome">
        <ThemePicker />
        {!hideContactLink && (
          <Button variant="ghost" size="chrome" asChild className="hidden sm:inline-flex text-muted-foreground hover:text-brand-accent">
            <Link href="/contact">
              Contact
            </Link>
          </Button>
        )}
        {cta}
      </div>
    </div>
  );
}
