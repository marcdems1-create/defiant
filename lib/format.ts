import { chains } from '@/lib/wagmi';

export function formatApy(apy: number): string {
  return `${(apy * 100).toFixed(2)}%`;
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
