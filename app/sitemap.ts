import type { MetadataRoute } from 'next';
import { FOOTER_LINKS, SITE_URL } from '@/lib/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = FOOTER_LINKS.map((link) => ({
    url: `${SITE_URL}${link.href}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/move`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${SITE_URL}/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
    ...pages,
  ];
}
