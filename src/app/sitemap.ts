import type { MetadataRoute } from 'next';
import { canonicalUrl, publicRoutes } from '@/lib/seo/productFacts';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: canonicalUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
