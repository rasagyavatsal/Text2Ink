import { isValidElement, cloneElement } from 'react';
import Link from 'next/link';
import ThemePicker from '../ThemePicker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SiteHeaderProps {
  cta?: React.ReactNode;
  hideContactLink?: boolean;
}

export default function SiteHeader({ cta, hideContactLink }: SiteHeaderProps = {}) {
  const ctaElement = isValidElement(cta) ? (cta as React.ReactElement<{ className?: string }>) : null;
  const clonedCta = ctaElement
    ? cloneElement(ctaElement, {
        className: cn(
          ctaElement.props.className,
          "px-4 lg:px-3 text-sm font-medium"
        )
      })
    : cta;

  return (
    <div className="flex items-center justify-between w-full [--control-height-md:2.75rem] lg:[--control-height-md:2.25rem]">
      <Link
        href="/"
        className="shrink-0 text-brand-mark font-bold font-dancing-script hover:text-brand-accent transition-colors flex items-center min-h-11 py-1 px-2 -ml-2 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring lg:min-h-0 lg:py-0"
      >
        Text2Ink
      </Link>
      <div className="flex items-center gap-chrome">
        <ThemePicker />
        {!hideContactLink && (
          <Button variant="ghost" size="chrome" asChild className="hidden sm:inline-flex text-muted-foreground hover:text-brand-accent px-4 lg:px-3">
            <Link href="/contact">
              Contact
            </Link>
          </Button>
        )}
        {clonedCta}
      </div>
    </div>
  );
}

