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

/**
 * Big mark an average reader can clock in one glance.
 * USDC → USD, stETH → ETH, cvxCRV → CRV; otherwise the ticker itself.
 */
export function assetMark(symbol: string): { mark: string; label: string } {
  const s = symbol.toUpperCase();
  if (s === 'USDC' || s === 'USDT' || s === 'DAI' || s === 'USDS' || s.endsWith('USD')) {
    return { mark: 'USD', label: s === 'USDC' ? 'USDC · US dollar' : `${s} · US dollar` };
  }
  if (s === 'ETH' || s === 'WETH' || s === 'STETH' || s.endsWith('ETH')) {
    return { mark: 'ETH', label: s === 'ETH' ? 'ETH · Ethereum' : `${s} · Ethereum` };
  }
  if (s === 'CRV' || s.includes('CRV')) {
    return { mark: 'CRV', label: s === 'CRV' ? 'CRV' : `${s} · CRV` };
  }
  return { mark: s.length > 5 ? s.slice(0, 4) : s, label: s };
}

/** USDC (6 decimals) → dollar string, e.g. 8009182n → "8.01". */
export function formatUsdcUsd(amount: bigint): string {
  const cents = (amount + 5_000n) / 10_000n;
  const whole = cents / 100n;
  const frac = cents % 100n;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(2, '0')}`;
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
