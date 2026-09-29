import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo/productFacts';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/editor',
    },
    sitemap: canonicalUrl('/sitemap.xml'),
    host: canonicalUrl('/').replace(/\/$/, ''),
  };
}
