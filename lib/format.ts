import { chains } from '@/lib/wagmi';
import type { Opportunity } from '@/lib/protocols/types';

export function formatApy(apy: number): string {
  return `${(apy * 100).toFixed(2)}%`;
}

/** Caption under the big rate — call out compounding when we actually compounded it. */
export function apyCaption(opportunity: Opportunity, prefix?: string): string {
  const kind = opportunity.apyCompounded ? 'compounded APY' : 'APY';
  return prefix ? `${prefix} ${kind}` : kind;
}

export function chainName(chainId: number): string {
  return chains.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`;
}

export function formatTokenAmount(amount: bigint, decimals: number, maxFractionDigits = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  if (fraction === 0n) return whole.toString();
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, maxFractionDigits);
  const trimmed = fractionStr.replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}
