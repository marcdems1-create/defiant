'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import { BRIDGE_CHAINS } from '@/lib/config/bridgeChains';

export interface ChainUsdcBalance {
  chainId: number;
  label: string;
  usdc: `0x${string}`;
  /** Raw USDC balance (6 decimals). */
  balance: bigint;
}

export interface CrossChainUsdc {
  balances: ChainUsdcBalance[];
  total: bigint;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Reads the connected wallet's native USDC balance on every chain the router
 * supports (Ethereum, Base, Arbitrum) in one batched multicall-per-chain call.
 * This is what lets the app treat USDC as a single balance regardless of which
 * chain it sits on — the "seamless, you don't pick a chain" part of the bridge.
 *
 * USDC is 6 decimals on all three chains, so `total` is directly comparable.
 */
export function useCrossChainUsdc(address: `0x${string}` | undefined): CrossChainUsdc {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: BRIDGE_CHAINS.map((c) => ({
      address: c.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: address ? [address] : undefined,
      chainId: c.id,
    })),
    query: { enabled: Boolean(address) },
  });

  return useMemo(() => {
    const balances: ChainUsdcBalance[] = BRIDGE_CHAINS.map((c, i) => ({
      chainId: c.id,
      label: c.label,
      usdc: c.usdc,
      balance: (data?.[i]?.result as bigint | undefined) ?? 0n,
    }));
    const total = balances.reduce((acc, b) => acc + b.balance, 0n);
    return { balances, total, isLoading, refetch };
  }, [data, isLoading, refetch]);
}
