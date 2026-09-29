import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo/productFacts';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: canonicalUrl('/'),
    changeFrequency: 'weekly',
    priority: 1,
  }];
}
