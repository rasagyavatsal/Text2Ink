import Link from 'next/link';
import Image from 'next/image';
import ThemePicker from '../ThemePicker';

interface SiteHeaderProps {
  cta?: React.ReactNode;
  hideContactLink?: boolean;
}

export default function SiteHeader({ cta, hideContactLink }: SiteHeaderProps = {}) {
  return (
    <div className="flex items-center justify-between w-full">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-2xl sm:text-3xl font-dancing-script hover:text-brand-accent transition-colors"
      >
        <Image
          src="/logo-without-background.png"
          alt="Text2Ink Logo"
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
        />
        <div>
          <span className="text-brand-accent">Text</span>
          <span className="text-foreground">2</span>
          <span className="text-brand-accent">Ink</span>
        </div>
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
