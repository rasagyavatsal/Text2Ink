import Link from 'next/link';
import Image from 'next/image';
import Version from '@/components/Version';

export default function SiteFooter() {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
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
      <div className="flex flex-col items-center md:items-end gap-1">
        <p className="text-muted-foreground text-xs sm:text-sm">
          © {new Date().getFullYear()} Text2Ink. All rights reserved.
        </p>
        <Version />
      </div>
    </div>
  );
}
