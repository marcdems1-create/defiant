import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/move`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${SITE_URL}/dashboard`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
  ];
}
