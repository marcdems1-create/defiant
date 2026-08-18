import { base, arbitrum, mainnet, sepolia, baseSepolia, arbitrumSepolia } from 'wagmi/chains';
import { NETWORK_MODE } from '@/lib/wagmi';
import { getCardRiskLevel, type CardRiskLevel } from '@/lib/protocols/cardBadges';
import type { Opportunity, ProtocolId } from '@/lib/protocols/types';

export type ChainFilter = 'all' | 'base' | 'arbitrum' | 'ethereum';
export type AssetFilter = 'all' | string;
export type SortFilter = 'apy-desc' | 'apy-asc';
export type RiskFilter = 'all' | CardRiskLevel;
export type KindFilter = 'all' | 'lending' | 'options' | 'fixed-term' | 'credit';

export interface OpportunityFilterState {
  chain: ChainFilter;
  asset: AssetFilter;
  sort: SortFilter;
  risk: RiskFilter;
  kind: KindFilter;
}

export const DEFAULT_OPPORTUNITY_FILTERS: OpportunityFilterState = {
  chain: 'all',
  asset: 'all',
  sort: 'apy-desc',
  risk: 'all',
  kind: 'all',
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

/** Catalog type — hide/reorder only, never a recommendation. */
export function getOpportunityKind(protocol: ProtocolId): Exclude<KindFilter, 'all'> | 'other' {
  switch (protocol) {
    case 'panoptic':
      return 'options';
    case 'pendle':
      return 'fixed-term';
    case 'maple':
      return 'credit';
    case 'aave-v3':
    case 'compound-v3':
    case 'morpho':
    case 'fluid':
    case 'moonwell':
    case 'sky':
    case 'yearn-v3':
    case 'frax-sfrxusd':
      return 'lending';
    default:
      return 'other';
  }
}

export function hasActiveOpportunityFilters(filters: OpportunityFilterState): boolean {
  return (
    filters.chain !== 'all' ||
    filters.asset !== 'all' ||
    filters.sort !== 'apy-desc' ||
    filters.risk !== 'all' ||
    filters.kind !== 'all'
  );
}

/** Unique asset symbols present in the list, USDC/ETH/WETH first then alphabetical. */
export function assetFilterOptions(opportunities: Opportunity[]): string[] {
  const symbols = [...new Set(opportunities.map((o) => o.asset.symbol))];
  const priority = ['USDC', 'ETH', 'WETH'];
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
  { id: 'apy-desc', label: 'High to low' },
  { id: 'apy-asc', label: 'Low to high' },
];

const RISK_DEFS: { id: CardRiskLevel; label: string }[] = [
  { id: 'lower', label: 'Lower' },
  { id: 'medium', label: 'Medium' },
  { id: 'higher', label: 'Higher' },
];

const KIND_DEFS: { id: Exclude<KindFilter, 'all'>; label: string }[] = [
  { id: 'lending', label: 'Lending' },
  { id: 'options', label: 'Options' },
  { id: 'fixed-term', label: 'Fixed-term' },
  { id: 'credit', label: 'Credit' },
];

/** Risk pills that actually appear in the current catalog. */
export function riskFilterOptions(
  opportunities: Opportunity[],
): { id: RiskFilter; label: string }[] {
  const present = new Set(opportunities.map(getCardRiskLevel));
  const levels = RISK_DEFS.filter((d) => present.has(d.id));
  if (levels.length <= 1) return [];
  return [{ id: 'all', label: 'All' }, ...levels];
}

/** Type pills that actually appear — Lido/Curve/Convex stay on All only. */
export function kindFilterOptions(
  opportunities: Opportunity[],
): { id: KindFilter; label: string }[] {
  const present = new Set(opportunities.map((o) => getOpportunityKind(o.protocol)));
  const kinds = KIND_DEFS.filter((d) => present.has(d.id));
  if (kinds.length <= 1) return [];
  return [{ id: 'all', label: 'All' }, ...kinds];
}

export function filterOpportunities(
  opportunities: Opportunity[],
  filters: OpportunityFilterState,
): Opportunity[] {
  const list = opportunities.filter((o) => {
    if (!matchesChain(o.chainId, filters.chain)) return false;
    if (filters.asset !== 'all' && o.asset.symbol !== filters.asset) return false;
    if (filters.risk !== 'all' && getCardRiskLevel(o) !== filters.risk) return false;
    if (filters.kind !== 'all' && getOpportunityKind(o.protocol) !== filters.kind) {
      return false;
    }
    return true;
  });

  return [...list].sort((a, b) =>
    filters.sort === 'apy-asc' ? a.apy - b.apy : b.apy - a.apy,
  );
}
