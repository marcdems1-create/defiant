import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/move`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${SITE_URL}/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
  ];
}
