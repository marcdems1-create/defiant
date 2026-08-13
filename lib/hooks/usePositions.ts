'use client';

import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import type { Opportunity } from '@/lib/protocols/types';

export interface Position {
  opportunity: Opportunity;
  balance: bigint;
}

/**
 * Reads the user's live on-chain balance of each opportunity's position
 * token (aToken, vault shares, or stETH) in a single batched multicall per
 * chain, and returns only the ones actually held.
 */
export function usePositions(opportunities: Opportunity[] | undefined) {
  const { address } = useAccount();
  const withPositionToken = (opportunities ?? []).filter((o) => o.positionToken && address);

  const { data, isLoading } = useReadContracts({
    contracts: withPositionToken.map((o) => ({
      address: o.positionToken as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
      chainId: o.chainId,
    })),
    query: { enabled: withPositionToken.length > 0 },
  });

  const positions = useMemo<Position[]>(() => {
    if (!data) return [];
    return withPositionToken
      .map((opportunity, i) => ({
        opportunity,
        balance: (data[i]?.result as bigint | undefined) ?? 0n,
      }))
      .filter((p) => p.balance > 0n);
  }, [data, withPositionToken]);

  return { positions, isLoading };
}
