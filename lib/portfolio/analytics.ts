import { formatUnits } from 'viem';
import type { Position } from '@/lib/hooks/usePositions';
import type { Opportunity } from '@/lib/protocols/types';

/** Symbols treated as ~$1 for portfolio totals (no live price oracle). */
const STABLE_SYMBOLS = new Set([
  'USDC',
  'USDT',
  'DAI',
  'FRAX',
  'FRXUSD',
  'USDC.E',
  'USDBC',
  'LUSD',
  'CRVUSD',
  'USDS',
  'SUSDS',
]);

export function isStableAsset(symbol: string): boolean {
  return STABLE_SYMBOLS.has(symbol.toUpperCase());
}

export function positionAmount(position: Position): number {
  return parseFloat(formatUnits(position.balance, position.opportunity.asset.decimals));
}

/** Approximate USD for stable-denominated positions; null when no price basis exists. */
export function positionValueUsd(position: Position): number | null {
  if (!isStableAsset(position.opportunity.asset.symbol)) return null;
  return positionAmount(position);
}

export interface ChainBreakdown {
  chainId: number;
  count: number;
  stableValue: number;
}

export interface ProjectionPoint {
  day: number;
  label: string;
  value: number;
}

export interface PortfolioAnalytics {
  totalStableValue: number;
  hasNonStablePositions: boolean;
  nonStablePositions: Position[];
  /** Weighted by stable position value; null when no stable positions. */
  weightedApy: number | null;
  positionCount: number;
  chainBreakdown: ChainBreakdown[];
  projectionPoints: ProjectionPoint[];
}

const PROJECTION_HORIZONS: { day: number; label: string }[] = [
  { day: 0, label: 'Today' },
  { day: 30, label: '30d' },
  { day: 90, label: '90d' },
  { day: 365, label: '1 yr' },
];

/** Compound growth assuming APY stays constant (illustrative only). */
export function projectCompoundGrowth(
  principal: number,
  apy: number,
  horizons = PROJECTION_HORIZONS,
): ProjectionPoint[] {
  if (principal <= 0 || apy <= 0) {
    return horizons.map(({ day, label }) => ({ day, label, value: principal }));
  }
  return horizons.map(({ day, label }) => ({
    day,
    label,
    value: principal * (1 + apy) ** (day / 365),
  }));
}

export function computePortfolioAnalytics(positions: Position[]): PortfolioAnalytics {
  const stablePositions = positions.filter((p) => positionValueUsd(p) !== null);
  const nonStablePositions = positions.filter((p) => positionValueUsd(p) === null);

  let totalStableValue = 0;
  let weightedApySum = 0;

  for (const p of stablePositions) {
    const value = positionValueUsd(p)!;
    totalStableValue += value;
    weightedApySum += value * p.opportunity.apy;
  }

  const weightedApy = totalStableValue > 0 ? weightedApySum / totalStableValue : null;

  const chainMap = new Map<number, ChainBreakdown>();
  for (const p of positions) {
    const existing = chainMap.get(p.opportunity.chainId) ?? {
      chainId: p.opportunity.chainId,
      count: 0,
      stableValue: 0,
    };
    existing.count += 1;
    const usd = positionValueUsd(p);
    if (usd !== null) existing.stableValue += usd;
    chainMap.set(p.opportunity.chainId, existing);
  }

  const projectionPoints =
    weightedApy !== null && totalStableValue > 0
      ? projectCompoundGrowth(totalStableValue, weightedApy)
      : PROJECTION_HORIZONS.map(({ day, label }) => ({ day, label, value: 0 }));

  return {
    totalStableValue,
    hasNonStablePositions: nonStablePositions.length > 0,
    nonStablePositions,
    weightedApy,
    positionCount: positions.length,
    chainBreakdown: [...chainMap.values()].sort((a, b) => b.stableValue - a.stableValue),
    projectionPoints,
  };
}

export interface MarketStats {
  opportunityCount: number;
  protocolCount: number;
  chainCount: number;
  minApy: number;
  maxApy: number;
  avgApy: number;
}

export function computeMarketStats(opportunities: Opportunity[]): MarketStats {
  if (opportunities.length === 0) {
    return {
      opportunityCount: 0,
      protocolCount: 0,
      chainCount: 0,
      minApy: 0,
      maxApy: 0,
      avgApy: 0,
    };
  }

  const apys = opportunities.map((o) => o.apy);
  const protocols = new Set(opportunities.map((o) => o.protocol));
  const chains = new Set(opportunities.map((o) => o.chainId));

  return {
    opportunityCount: opportunities.length,
    protocolCount: protocols.size,
    chainCount: chains.size,
    minApy: Math.min(...apys),
    maxApy: Math.max(...apys),
    avgApy: apys.reduce((a, b) => a + b, 0) / apys.length,
  };
}
