import NextImage from 'next/image';
import Version from '@/components/Version';

export default function SiteFooter() {
  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <NextImage
          src="/logo-192.png"
          alt="Text2Ink logo"
          width={64}
          height={64}
          className="w-16 h-16"
          priority
        />
      </div>
      <div className="flex flex-col items-center md:items-end gap-1">
        <p className="text-muted-foreground text-xs sm:text-sm">
          © {new Date().getFullYear()} Text2Ink. All rights reserved.
        </p>
        <Version />
      </div>
    </div>
  );
}
