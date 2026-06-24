import Link from 'next/link';
import Version from '@/components/Version';

export default function SiteFooter() {
  return (
    <div className="w-full flex flex-col gap-6 md:gap-8 py-4 md:py-6">
      {/* Level 1: Main Content Row */}
      <div className="flex flex-col md:flex-row md:justify-between items-start gap-6 md:gap-8 w-full">
        {/* Brand/Logo Column */}
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-brand-mark font-bold font-dancing-script hover:text-brand-accent transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Lazy static footer logo avoids loading the next/image runtime on the landing page. */}
            <img
              src="/logo-without-background.avif"
              alt="Text2Ink Logo"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              className="w-14 h-14 md:w-16 md:h-16 object-contain"
            />
          </Link>
        </div>

        {/* Columns for Navigation */}
        <div className="flex flex-row gap-12 sm:gap-16">
          {/* Product Navigation Column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-supporting font-semibold text-foreground">Product</h4>
            <nav aria-label="Product">
              <ul className="flex flex-col gap-1 text-supporting text-muted-foreground">
                <li>
                  <Link
                    href="/editor"
                    className="block py-2 md:py-1 transition-colors hover:text-brand-accent"
                  >
                    Open Editor
                  </Link>
                </li>

                <li>
                  <Link
                    href="/contact"
                    className="block py-2 md:py-1 transition-colors hover:text-brand-accent"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Legal Navigation Column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-supporting font-semibold text-foreground">Legal</h4>
            <nav aria-label="Legal">
              <ul className="flex flex-col gap-1 text-supporting text-muted-foreground">
                <li>
                  <Link
                    href="/terms-of-service"
                    className="block py-2 md:py-1 transition-colors hover:text-brand-accent"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="block py-2 md:py-1 transition-colors hover:text-brand-accent"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-t border-border w-full" />

      {/* Level 2: Metadata Row */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 w-full">
        <p className="text-caption text-muted-foreground break-words max-w-[280px] xs:max-w-none">
          © {new Date().getFullYear()} Text2Ink. All rights reserved.
        </p>
        <Version />
      </div>
    </div>
  );
}
