import { cache } from 'react';
import { fetchAllOpportunitiesMemoized } from './aggregate';
import { catalogFromOpportunity, getCatalogEntry, type CatalogEntry } from './catalog';
import type { Opportunity } from './types';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/** Dedupe live fetches within a single RSC request (metadata + page). */
export const loadLiveOpportunities = cache(async (): Promise<Opportunity[]> => {
  return withTimeout(fetchAllOpportunitiesMemoized().catch(() => []), 8_000, []);
});

export interface OpportunityPageData {
  catalog: CatalogEntry;
  live: Opportunity | null;
}

export async function loadOpportunityPage(id: string): Promise<OpportunityPageData | null> {
  const liveList = await loadLiveOpportunities();
  const live = liveList.find((o) => o.id === id) ?? null;
  const catalog = getCatalogEntry(id) ?? (live ? catalogFromOpportunity(live) : undefined);
  if (!catalog) return null;
  return { catalog, live };
}
