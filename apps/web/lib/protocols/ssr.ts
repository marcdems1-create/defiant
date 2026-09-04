import type { Opportunity } from './types';
import { fetchAllOpportunities } from './aggregate';

const SSR_TIMEOUT_MS = 6_000;

/**
 * Best-effort catalog for the first HTML. Time out rather than hang a KYB crawl.
 * Never invent APYs — an empty list is shown as “live rates load in the browser.”
 */
export async function fetchOpportunitiesForSsr(): Promise<Opportunity[]> {
  try {
    return await Promise.race([
      fetchAllOpportunities(),
      new Promise<Opportunity[]>((resolve) => {
        setTimeout(() => resolve([]), SSR_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return [];
  }
}
