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

/** Dollar totals (holdings). Always two fraction digits. */
export function formatUsd(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Live last-mark formatting. Sub-cent tokens (SHIB-class) must not round to
 * $0.00. Unparseable values return null — we never invent a price.
 */
export function formatTapePrice(n: number): string | null {
  if (!Number.isFinite(n) || n < 0) return null;
  let min = 2;
  let max = 2;
  if (n > 0 && n < 1) {
    if (n >= 0.01) {
      min = 2;
      max = 4;
    } else if (n >= 0.0001) {
      min = 4;
      max = 6;
    } else {
      const mag = Math.floor(Math.log10(n));
      max = Math.min(8, Math.max(2, 2 - mag));
      min = max;
    }
  }
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

export function formatTapeMarketCap(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatUsd(n);
}

export function formatTapeChangePct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function tapeChangeClass(n: number): string {
  if (n > 0) return 'text-accent';
  if (n < 0) return 'text-danger';
  return 'text-ink/45';
}
