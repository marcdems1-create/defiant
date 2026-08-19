import type { Opportunity } from '@/lib/protocols/types';

/**
 * Public catalog is USDC-only for now (no ETH, CRV, frxUSD, etc.).
 * Adapters for other assets stay in the repo; they are not fetched or listed
 * until this allowlist is expanded.
 */
export const CATALOG_ASSET_SYMBOLS = ['USDC'] as const;

export function isListedCatalogAsset(symbol: string): boolean {
  return symbol.trim().toUpperCase() === 'USDC';
}

export function listedCatalogOpportunities(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.filter((o) => isListedCatalogAsset(o.asset.symbol));
}
