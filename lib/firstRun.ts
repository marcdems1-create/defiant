import { base, baseSepolia } from 'wagmi/chains';
import type { Opportunity } from '@/lib/protocols/types';

/**
 * Resolve a USDC asset/chain for first-session funding (balance read + buy).
 * Not a yield pick — do not surface this as a featured opportunity.
 */
export function pickStarterOpportunity(
  opportunities: Opportunity[],
): Opportunity | undefined {
  const usdc = opportunities.filter((o) => o.asset.symbol.toUpperCase() === 'USDC');
  const onBase = usdc.filter(
    (o) => o.chainId === base.id || o.chainId === baseSepolia.id,
  );
  return onBase[0] ?? usdc[0] ?? opportunities[0];
}

export function isStableDollarAsset(symbol: string, decimals: number): boolean {
  const s = symbol.toUpperCase();
  return (s === 'USDC' || s === 'USDT' || s === 'DAI' || s === 'USDS') && decimals === 6;
}
