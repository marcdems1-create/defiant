'use client';

import { useMemo } from 'react';
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

/**
 * Reads live on-chain position sizes and normalizes to underlying asset units
 * (USDC etc.) so portfolio cards and withdraw max amounts stay consistent.
 */
export function usePositions(opportunities: Opportunity[] | undefined) {
  const { address } = useAccount();
  const withPositionToken = (opportunities ?? []).filter((o) => o.positionToken && address);

  const shareReads = useReadContracts({
    contracts: withPositionToken.map((o) => ({
      address: o.positionToken as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [address as `0x${string}`],
      chainId: o.chainId,
    })),
    query: { enabled: withPositionToken.length > 0 },
  });

  const shareBalances = useMemo(() => {
    if (!shareReads.data) return withPositionToken.map(() => 0n);
    return withPositionToken.map((_, i) => (shareReads.data?.[i]?.result as bigint | undefined) ?? 0n);
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
    query: {
      enabled: withPositionToken.length > 0 && shareReads.data !== undefined,
    },
  });

  const positions = useMemo<Position[]>(() => {
    if (!shareReads.data) return [];
    return withPositionToken
      .map((opportunity, i) => {
        const shares = shareBalances[i] ?? 0n;
        let balance = shares;

        if (ERC4626_PROTOCOLS.includes(opportunity.protocol)) {
          balance = (convertReads.data?.[i]?.result as bigint | undefined) ?? 0n;
        } else if (opportunity.protocol === 'moonwell') {
          const rate = (convertReads.data?.[i]?.result as bigint | undefined) ?? 0n;
          // underlying = shares * exchangeRate / 1e18
          balance = rate > 0n ? (shares * rate) / 10n ** 18n : 0n;
        }

        return { opportunity, balance };
      })
      .filter((p) => p.balance > 0n);
  }, [shareReads.data, convertReads.data, shareBalances, withPositionToken]);

  return {
    positions,
    isLoading: shareReads.isLoading || convertReads.isLoading,
  };
}
