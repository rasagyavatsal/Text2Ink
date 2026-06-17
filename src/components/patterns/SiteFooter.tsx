import Link from 'next/link';
import Image from 'next/image';
import Version from '@/components/Version';

export default function SiteFooter() {
  return (
    <div className="w-full flex flex-col gap-8 py-4">
      {/* Level 1: Main Content Row */}
      <div className="flex flex-col md:flex-row md:justify-between items-start gap-8 w-full">
        {/* Brand/Logo Column */}
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-brand-mark font-bold font-dancing-script hover:text-brand-accent transition-colors"
          >
            <Image
              src="/logo-without-background.png"
              alt="Text2Ink Logo"
              width={64}
              height={64}
              className="w-14 h-14 md:w-16 md:h-16 object-contain"
            />
          </Link>
        </div>

        {/* Columns for Navigation */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
          {/* Product Navigation Column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-supporting font-semibold text-foreground">Product</h4>
            <nav aria-label="Product">
              <ul className="flex flex-col gap-2 text-supporting text-muted-foreground">
                <li>
                  <Link
                    href="/editor"
                    className="transition-colors hover:text-brand-accent"
                  >
                    Open Editor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="transition-colors hover:text-brand-accent"
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
              <ul className="flex flex-col gap-2 text-supporting text-muted-foreground">
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
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-t border-border w-full" />

      {/* Level 2: Metadata Row */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 w-full">
        <p className="text-caption text-muted-foreground">
          © {new Date().getFullYear()} Text2Ink. All rights reserved.
        </p>
        <Version />
      </div>
    </div>
  );
}

