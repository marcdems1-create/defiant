import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config/site';
import { getCatalog, opportunityPath } from '@/lib/protocols/catalog';
import { fetchAllOpportunitiesMemoized } from '@/lib/protocols/aggregate';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = new Set(getCatalog().map((entry) => entry.id));
  try {
    const live = await fetchAllOpportunitiesMemoized();
    for (const opportunity of live) ids.add(opportunity.id);
  } catch {
    // Catalog URLs still ship; Yearn vaults that only exist when the API
    // parses are omitted until the next successful build/revalidate.
  }

  const now = new Date();
  const opportunityEntries: MetadataRoute.Sitemap = [...ids].sort().map((id) => ({
    url: `${SITE_URL}${opportunityPath(id)}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    {
      url: `${SITE_URL}/move`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    ...opportunityEntries,
  ];
}
