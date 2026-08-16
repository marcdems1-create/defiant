import { base, baseSepolia } from 'wagmi/chains';
import type { Opportunity } from '@/lib/protocols/types';

/**
 * Default first-session card: USDC on Base (or Base Sepolia in testnet).
 * This is a starting path, not a scored recommendation.
 */
export function pickStarterOpportunity(
  opportunities: Opportunity[],
): Opportunity | undefined {
  const usdc = opportunities.filter((o) => o.asset.symbol.toUpperCase() === 'USDC');
  const onBase = usdc.filter(
    (o) => o.chainId === base.id || o.chainId === baseSepolia.id,
  );
  return (
    onBase.find((o) => o.protocol === 'aave-v3') ??
    onBase[0] ??
    usdc[0] ??
    opportunities[0]
  );
}

export function isStableDollarAsset(symbol: string, decimals: number): boolean {
  const s = symbol.toUpperCase();
  return (s === 'USDC' || s === 'USDT' || s === 'DAI' || s === 'USDS') && decimals === 6;
}
