import { base, arbitrum, mainnet, sepolia, baseSepolia, arbitrumSepolia } from 'wagmi/chains';
import { NETWORK_MODE } from '@/lib/wagmi';
import type { Opportunity } from '@/lib/protocols/types';

export type ChainFilter = 'all' | 'base' | 'arbitrum' | 'ethereum';
export type AssetFilter = 'all' | string;
export type SortFilter = 'apy-desc' | 'apy-asc';

export interface OpportunityFilterState {
  chain: ChainFilter;
  asset: AssetFilter;
  sort: SortFilter;
}

export const DEFAULT_OPPORTUNITY_FILTERS: OpportunityFilterState = {
  chain: 'all',
  asset: 'all',
  sort: 'apy-desc',
};

const BASE_CHAIN_ID = NETWORK_MODE === 'mainnet' ? base.id : baseSepolia.id;
const ARBITRUM_CHAIN_ID = NETWORK_MODE === 'mainnet' ? arbitrum.id : arbitrumSepolia.id;
const ETHEREUM_CHAIN_ID = NETWORK_MODE === 'mainnet' ? mainnet.id : sepolia.id;

function matchesChain(chainId: number, filter: ChainFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'base') return chainId === BASE_CHAIN_ID;
  if (filter === 'arbitrum') return chainId === ARBITRUM_CHAIN_ID;
  if (filter === 'ethereum') return chainId === ETHEREUM_CHAIN_ID;
  return true;
}

export function hasActiveOpportunityFilters(filters: OpportunityFilterState): boolean {
  return filters.chain !== 'all' || filters.asset !== 'all' || filters.sort !== 'apy-desc';
}

/** Unique asset symbols present in the list, USDC/ETH first then alphabetical. */
export function assetFilterOptions(opportunities: Opportunity[]): string[] {
  const symbols = [...new Set(opportunities.map((o) => o.asset.symbol))];
  const priority = ['USDC', 'ETH'];
  return symbols.sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });
}

const CHAIN_DEFS: { id: Exclude<ChainFilter, 'all'>; label: string; chainId: number }[] = [
  { id: 'base', label: 'Base', chainId: BASE_CHAIN_ID },
  { id: 'arbitrum', label: 'Arbitrum', chainId: ARBITRUM_CHAIN_ID },
  { id: 'ethereum', label: 'Ethereum', chainId: ETHEREUM_CHAIN_ID },
];

/** Chain pills that actually appear in the current catalog — no empty Other. */
export function chainFilterOptions(
  opportunities: Opportunity[],
): { id: ChainFilter; label: string }[] {
  const present = new Set<number>(opportunities.map((o) => o.chainId));
  const chains = CHAIN_DEFS.filter((c) => present.has(c.chainId));
  if (chains.length <= 1) return [];
  return [{ id: 'all', label: 'All' }, ...chains.map(({ id, label }) => ({ id, label }))];
}

export const SORT_FILTER_OPTIONS: { id: SortFilter; label: string }[] = [
  { id: 'apy-desc', label: 'Yield high → low' },
  { id: 'apy-asc', label: 'Yield low → high' },
];

export function filterOpportunities(
  opportunities: Opportunity[],
  filters: OpportunityFilterState,
): Opportunity[] {
  const list = opportunities.filter((o) => {
    if (!matchesChain(o.chainId, filters.chain)) return false;
    if (filters.asset !== 'all' && o.asset.symbol !== filters.asset) return false;
    return true;
  });

  return [...list].sort((a, b) =>
    filters.sort === 'apy-asc' ? a.apy - b.apy : b.apy - a.apy,
  );
}
