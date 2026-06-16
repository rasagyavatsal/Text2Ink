import Link from 'next/link';
import Image from 'next/image';
import Version from '@/components/Version';

export default function SiteFooter() {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
      <Link
        href="/"
        className="flex items-center gap-2 text-brand-mark font-bold font-dancing-script hover:text-brand-accent transition-colors"
      >
        <Image
          src="/logo-without-background.png"
          alt="Text2Ink Logo"
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
        />
      </Link>
      <div className="flex flex-col items-center md:items-end gap-2">
        <nav aria-label="Legal">
          <ul className="flex items-center gap-4 text-supporting text-muted-foreground">
            <li>
              <Link
                href="/terms-of-service"
                className="transition-colors hover:text-brand-accent"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                href="/privacy-policy"
                className="transition-colors hover:text-brand-accent"
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-caption text-muted-foreground">
          © {new Date().getFullYear()} Text2Ink. All rights reserved.
        </p>
        <Version />
      </div>
    </div>
  );
}
