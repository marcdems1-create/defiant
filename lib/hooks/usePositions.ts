'use client';

import { useMemo, useRef } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { moonwellMTokenAbi } from '@/lib/abi/moonwell';
import { ERC4626_PROTOCOLS, type Opportunity } from '@/lib/protocols/types';

export interface Position {
  opportunity: Opportunity;
  /** Balance denominated in the opportunity's underlying asset units. */
  balance: bigint;
}

function needsUnderlyingConversion(protocol: Opportunity['protocol']): boolean {
  return ERC4626_PROTOCOLS.includes(protocol) || protocol === 'moonwell';
}

function readAmount(
  row: { status?: string; result?: unknown } | undefined,
): bigint | null {
  if (!row || row.status === 'failure' || row.result === undefined) return null;
  return row.result as bigint;
}

/**
 * Reads live on-chain position sizes and normalizes to underlying asset units
 * (USDC etc.) so portfolio cards and withdraw max amounts stay consistent.
 */
export function usePositions(
  opportunities: Opportunity[] | undefined,
  opts?: { catalogLoading?: boolean },
) {
  const { address } = useAccount();

  // A successful opportunities refetch can omit a protocol (APY parse failed
  // this round). Dropping it would hide an open position. Keep every market
  // already seen this session and overlay newer metadata when the id returns.
  const retained = useRef(new Map<string, Opportunity>());
  const lastMoonwellRate = useRef(new Map<string, bigint>());
  const catalog = useMemo(() => {
    if (opportunities) {
      for (const o of opportunities) retained.current.set(o.id, o);
    }
    if (retained.current.size === 0) return opportunities ?? [];
    return [...retained.current.values()];
  }, [opportunities]);

  const withPositionToken = useMemo(
    () => catalog.filter((o) => o.positionToken && address),
    [catalog, address],
  );

  const shareReads = useReadContracts({
    contracts: withPositionToken.map((o) => ({
      address: o.positionToken as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [address as `0x${string}`],
      chainId: o.chainId,
    })),
    allowFailure: true,
    query: {
      enabled: withPositionToken.length > 0,
      refetchOnWindowFocus: true,
      refetchInterval: 15_000,
      retry: 3,
    },
  });

  const shareBalances = useMemo(() => {
    return withPositionToken.map((_, i) => readAmount(shareReads.data?.[i]));
  }, [shareReads.data, withPositionToken]);

  const convertReads = useReadContracts({
    contracts: withPositionToken.map((o, i) => {
      const shares = shareBalances[i] ?? 0n;
      if (ERC4626_PROTOCOLS.includes(o.protocol)) {
        return {
          address: o.positionToken as `0x${string}`,
          abi: erc4626Abi,
          functionName: 'convertToAssets' as const,
          args: [shares] as const,
          chainId: o.chainId,
        };
      }
      if (o.protocol === 'moonwell') {
        return {
          address: o.positionToken as `0x${string}`,
          abi: moonwellMTokenAbi,
          functionName: 'exchangeRateStored' as const,
          chainId: o.chainId,
        };
      }
      // Dummy no-op read for protocols where balanceOf is already underlying
      // (Aave aToken, Compound Comet, Lido stETH, Convex rewards).
      return {
        address: o.positionToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [address as `0x${string}`],
        chainId: o.chainId,
      };
    }),
    allowFailure: true,
    query: {
      enabled: withPositionToken.length > 0 && shareReads.data !== undefined,
      refetchOnWindowFocus: true,
      refetchInterval: 15_000,
      retry: 3,
    },
  });

  const positions = useMemo<Position[]>(() => {
    if (!shareReads.data) return [];
    return withPositionToken.flatMap((opportunity, i) => {
      const shares = shareBalances[i];
      if (shares === null || shares === 0n) return [];

      if (ERC4626_PROTOCOLS.includes(opportunity.protocol)) {
        const converted = readAmount(convertReads.data?.[i]);
        if (converted === null) return [];
        return converted > 0n ? [{ opportunity, balance: converted }] : [];
      }

      if (opportunity.protocol === 'moonwell') {
        const liveRate = readAmount(convertReads.data?.[i]);
        if (liveRate !== null && liveRate > 0n) lastMoonwellRate.current.set(opportunity.id, liveRate);
        const rate = liveRate !== null && liveRate > 0n ? liveRate : (lastMoonwellRate.current.get(opportunity.id) ?? 0n);
        if (rate <= 0n) return [];
        const balance = (shares * rate) / 10n ** 18n;
        return balance > 0n ? [{ opportunity, balance }] : [];
      }

      return [{ opportunity, balance: shares }];
    });
  }, [shareReads.data, convertReads.data, shareBalances, withPositionToken]);

  const conversionPending = withPositionToken.some((o, i) => {
    if (!needsUnderlyingConversion(o.protocol)) return false;
    const shares = shareBalances[i];
    if (shares === null || shares === 0n) return false;
    if (readAmount(convertReads.data?.[i]) !== null) return false;
    if (o.protocol === 'moonwell' && lastMoonwellRate.current.has(o.id)) return false;
    return convertReads.data === undefined;
  });

  const waitingForShares =
    withPositionToken.length > 0 && shareReads.data === undefined;

  return {
    positions,
    isLoading: Boolean(opts?.catalogLoading) || waitingForShares || conversionPending,
  };
}
