import { chains } from '@/lib/wagmi';
import type { Opportunity } from '@/lib/protocols/types';

export function formatApy(apy: number): string {
  return `${(apy * 100).toFixed(2)}%`;
}

/** Live APY for display. Never invent a number — show an em dash if we don't have one. */
export function formatApyDisplay(apy: number | null | undefined): string {
  if (apy == null || !Number.isFinite(apy) || apy <= 0) return '—';
  return formatApy(apy);
}

const CHAIN_LABELS: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum One',
  11155111: 'Sepolia',
  84532: 'Base Sepolia',
  421614: 'Arbitrum Sepolia',
};

/** Caption under the big rate — call out compounding when we actually compounded it. */
export function apyCaption(
  opportunity: Pick<Opportunity, 'apyCompounded'>,
  prefix?: string,
): string {
  const kind = opportunity.apyCompounded ? 'compounded APY' : 'APY';
  return prefix ? `${prefix} ${kind}` : kind;
}

export function chainName(chainId: number): string {
  return chains.find((c) => c.id === chainId)?.name ?? CHAIN_LABELS[chainId] ?? `Chain ${chainId}`;
}

/** Block-explorer URL for a transaction, or null if we don't know the chain. */
export function txExplorerUrl(chainId: number, txHash: string): string | null {
  const base = chains.find((c) => c.id === chainId)?.blockExplorers?.default?.url;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/tx/${txHash}`;
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
