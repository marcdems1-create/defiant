import { mainnet } from 'wagmi/chains';
import type { Opportunity } from './types';
import { CURVE, type CurvePoolConfig } from '@/lib/config/addresses';
import type { SupportedChainId } from '@/lib/wagmi';

const CURVE_API_BASE = 'https://api.curve.finance/v1';

/** Maps a supported chain to Curve API's own chain slug. Only chains present in `CURVE` matter. */
const CURVE_API_CHAIN_SLUG: Partial<Record<number, string>> = {
  [mainnet.id]: 'ethereum',
};

/**
 * Curve's API separates base trading-fee yield (paid to every LP in the
 * pool) from CRV gauge-emission rewards (paid only to LPs who separately
 * stake their LP token in that pool's gauge). This integration doesn't build
 * a gauge staking/claim flow, so only the base APY is used — showing the
 * CRV-inclusive number would overstate what a depositor here actually earns
 * without staking, which is exactly the kind of guessed/inflated number
 * non-negotiable #3 rules out.
 *
 * Exact field names on `api.curve.finance/v1/getPools/all/<chain>` are
 * unverified against the live endpoint — this sandbox's network policy
 * blocks reaching api.curve.finance while building, same constraint already
 * noted in `lib/protocols/yearn.ts`. Parsing below is deliberately
 * defensive: skip the pool rather than guess. Smoke-test on first real run.
 */
interface CurvePoolRaw {
  address?: string;
  latestDailyApy?: number;
  latestWeeklyApy?: number;
}

function extractBaseApy(p: CurvePoolRaw): number | null {
  const weekly = p.latestWeeklyApy;
  if (typeof weekly === 'number' && weekly >= 0) return weekly / 100;
  const daily = p.latestDailyApy;
  if (typeof daily === 'number' && daily >= 0) return daily / 100;
  return null;
}

function buildOpportunity(chainId: SupportedChainId, cfg: CurvePoolConfig, apy: number): Opportunity {
  return {
    id: `curve-${chainId}-${cfg.id}`,
    protocol: 'curve',
    protocolLabel: 'Curve',
    chainId,
    asset: {
      address: cfg.usdc,
      symbol: 'USDC',
      decimals: 6,
    },
    apy,
    description: `Provide USDC to Curve's ${cfg.label} stable pool and earn trading fees from swaps between its coins. This is the base LP yield only — it excludes this pool's separate CRV gauge rewards, which require staking the LP token and aren't covered by this app. Withdraw anytime back to USDC, subject to pool liquidity and price impact.`,
    depositTarget: cfg.pool,
    positionToken: cfg.lpToken,
    positionDecimals: 18,
    positionSymbol: `${cfg.label} LP`,
    curve: { numCoins: cfg.numCoins, coinIndex: cfg.usdcIndex },
    liquidity: 'instant',
    riskTier: 'established',
  };
}

/** Curve doesn't deploy either configured pool to any testnet — see the CURVE comment in lib/config/addresses.ts. */
export async function fetchCurveOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const pools = CURVE[chainId];
  const apiSlug = CURVE_API_CHAIN_SLUG[chainId];
  if (!pools || pools.length === 0 || !apiSlug) return [];

  let rawPools: CurvePoolRaw[];
  try {
    const res = await fetch(`${CURVE_API_BASE}/getPools/all/${apiSlug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    rawPools = json?.data?.poolData;
    if (!Array.isArray(rawPools)) return [];
  } catch {
    return [];
  }

  const opportunities: Opportunity[] = [];
  for (const cfg of pools) {
    const raw = rawPools.find((p) => p.address?.toLowerCase() === cfg.pool.toLowerCase());
    if (!raw) continue;
    const apy = extractBaseApy(raw);
    if (apy === null) continue;
    opportunities.push(buildOpportunity(chainId, cfg, apy));
  }
  return opportunities;
}
