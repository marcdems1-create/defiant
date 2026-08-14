import { base, arbitrum, mainnet, sepolia, baseSepolia, arbitrumSepolia } from 'wagmi/chains';
import { NETWORK_MODE } from '@/lib/wagmi';
import type { Opportunity } from '@/lib/protocols/types';

export type ChainFilter = 'all' | 'base' | 'arbitrum' | 'ethereum' | 'other';
export type RiskFilter = 'all' | 'established' | 'emerging';
export type AssetFilter = 'all' | string;

export interface OpportunityFilterState {
  chain: ChainFilter;
  risk: RiskFilter;
  asset: AssetFilter;
}

export const DEFAULT_OPPORTUNITY_FILTERS: OpportunityFilterState = {
  chain: 'all',
  risk: 'all',
  asset: 'all',
};

const BASE_CHAIN_ID = NETWORK_MODE === 'mainnet' ? base.id : baseSepolia.id;
const ARBITRUM_CHAIN_ID = NETWORK_MODE === 'mainnet' ? arbitrum.id : arbitrumSepolia.id;
const ETHEREUM_CHAIN_ID = NETWORK_MODE === 'mainnet' ? mainnet.id : sepolia.id;
const L2_CHAIN_IDS = new Set<number>([BASE_CHAIN_ID, ARBITRUM_CHAIN_ID]);

function matchesChain(chainId: number, filter: ChainFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'base') return chainId === BASE_CHAIN_ID;
  if (filter === 'arbitrum') return chainId === ARBITRUM_CHAIN_ID;
  if (filter === 'ethereum') return chainId === ETHEREUM_CHAIN_ID;
  if (filter === 'other') return !L2_CHAIN_IDS.has(chainId) && chainId !== ETHEREUM_CHAIN_ID;
  return true;
}

export function hasActiveOpportunityFilters(filters: OpportunityFilterState): boolean {
  return (
    filters.chain !== 'all' || filters.risk !== 'all' || filters.asset !== 'all'
  );
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

export function filterOpportunities(
  opportunities: Opportunity[],
  filters: OpportunityFilterState,
  options?: { sortL2First?: boolean },
): Opportunity[] {
  let list = opportunities.filter((o) => {
    if (!matchesChain(o.chainId, filters.chain)) return false;
    if (filters.risk !== 'all' && o.riskTier !== filters.risk) return false;
    if (filters.asset !== 'all' && o.asset.symbol !== filters.asset) return false;
    return true;
  });

  if (options?.sortL2First && filters.chain === 'all') {
    list = [...list].sort((a, b) => {
      const aL2 = L2_CHAIN_IDS.has(a.chainId) ? 0 : 1;
      const bL2 = L2_CHAIN_IDS.has(b.chainId) ? 0 : 1;
      if (aL2 !== bL2) return aL2 - bL2;
      return b.apy - a.apy;
    });
  }

  return list;
}

export const CHAIN_FILTER_OPTIONS: { id: ChainFilter; label: string }[] = [
  { id: 'all', label: 'All chains' },
  { id: 'base', label: 'Base' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'ethereum', label: NETWORK_MODE === 'mainnet' ? 'Ethereum' : 'Sepolia' },
  { id: 'other', label: 'Other' },
];

export const RISK_FILTER_OPTIONS: { id: RiskFilter; label: string }[] = [
  { id: 'all', label: 'All risk' },
  { id: 'established', label: 'Established' },
  { id: 'emerging', label: 'Emerging' },
];
