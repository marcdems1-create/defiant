import { MORPHO } from '@/lib/config/addresses';
import type { Opportunity } from './types';
import { findDefiLlamaPool, fetchDefiLlamaApyHistory, type ApyHistoryPoint } from './defillama';

export type { ApyHistoryPoint };

interface LlamaLookup {
  projects: string[];
  chain: string;
  matchesSymbol: (symbol: string) => boolean;
  matchesMeta?: (meta: string) => boolean;
  preferBase: boolean;
}

function llamaChain(chainId: number): string | null {
  if (chainId === 1) return 'Ethereum';
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

function usdcSymbol(s: string): boolean {
  return s === 'USDC' || s.includes('USDC');
}

/** Map a live opportunity to the DeFiLlama pool we can chart. Skip if unsure. */
function lookupFor(opportunity: Opportunity): LlamaLookup | null {
  const chain = llamaChain(opportunity.chainId);
  if (!chain) return null;

  switch (opportunity.protocol) {
    case 'moonwell':
      return {
        projects: ['moonwell-lending', 'moonwell'],
        chain,
        matchesSymbol: usdcSymbol,
        preferBase: true,
      };
    case 'aave-v3':
      return { projects: ['aave-v3'], chain, matchesSymbol: usdcSymbol, preferBase: true };
    case 'compound-v3':
      return { projects: ['compound-v3'], chain, matchesSymbol: usdcSymbol, preferBase: true };
    case 'lido':
      return {
        projects: ['lido'],
        chain: 'Ethereum',
        matchesSymbol: (s) => s.includes('STETH') || s === 'ETH',
        preferBase: true,
      };
    case 'yearn-v3':
      return { projects: ['yearn-finance'], chain, matchesSymbol: usdcSymbol, preferBase: false };
    case 'fluid':
      return {
        projects: ['fluid-lending', 'fluid', 'instadapp'],
        chain,
        matchesSymbol: usdcSymbol,
        preferBase: true,
      };
    case 'frax-sfrxusd':
      return {
        projects: ['frax'],
        chain: 'Ethereum',
        matchesSymbol: (s) => s.includes('FRXUSD') || s.includes('SFRAX'),
        preferBase: false,
      };
    case 'convex-cvxcrv':
      return {
        projects: ['convex-finance'],
        chain: 'Ethereum',
        matchesSymbol: (s) => s.includes('CVXCRV'),
        preferBase: false,
      };
    case 'curve':
      return { projects: ['curve-dex'], chain: 'Ethereum', matchesSymbol: usdcSymbol, preferBase: true };
    case 'morpho': {
      const vaults = (MORPHO as Record<number, readonly { id: string; defiLlamaSymbol: string }[]>)[
        opportunity.chainId
      ];
      const vault = vaults?.find((v) => opportunity.id.includes(v.id));
      if (!vault) return null;
      return {
        projects: ['morpho-blue'],
        chain,
        matchesSymbol: (s) => s === vault.defiLlamaSymbol,
        preferBase: false,
      };
    }
    case 'sky':
      return {
        projects: ['sky-lending', 'makerdao', 'spark'],
        chain,
        matchesSymbol: (s) => s.includes('SUSDS') || s === 'USDS' || s.includes('SSR'),
        preferBase: true,
      };
    case 'maple':
      return {
        projects: ['maple', 'syrup'],
        chain: 'Ethereum',
        matchesSymbol: (s) => s.includes('SYRUPUSDC') || s.includes('SYRUP'),
        preferBase: false,
      };
    case 'panoptic': {
      const vault = opportunity.panoptic?.vault;
      if (vault === 'plp-weth') {
        return {
          projects: ['panoptic', 'panoptic-v2'],
          chain: 'Ethereum',
          matchesSymbol: (s) => s.includes('PLP'),
          preferBase: false,
        };
      }
      return {
        projects: ['panoptic', 'panoptic-v2'],
        chain: 'Ethereum',
        matchesSymbol: (s) => s.includes('UNICORN'),
        preferBase: false,
      };
    }
    case 'pendle': {
      const name = (opportunity.pendle?.name ?? '').toUpperCase();
      if (!name) return null;
      return {
        projects: ['pendle'],
        chain: 'Ethereum',
        matchesSymbol: (s) => s.includes(name) && (s.includes('PT') || s.includes(name)),
        preferBase: false,
      };
    }
    default:
      return null;
  }
}

export async function fetchApyHistory(opportunity: Opportunity): Promise<ApyHistoryPoint[]> {
  const lookup = lookupFor(opportunity);
  if (!lookup) return [];

  for (const project of lookup.projects) {
    const pool = await findDefiLlamaPool(
      project,
      lookup.chain,
      lookup.matchesSymbol,
      lookup.matchesMeta,
    );
    if (typeof pool?.pool !== 'string' || pool.pool.length === 0) continue;
    const points = await fetchDefiLlamaApyHistory(pool.pool, lookup.preferBase);
    if (points.length > 0) return points;
  }
  return [];
}
