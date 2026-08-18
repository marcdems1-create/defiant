'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import { BRIDGE_CHAINS } from '@/lib/config/bridgeChains';
import { NETWORK_MODE } from '@/lib/wagmi';

export interface ChainUsdcBalance {
  chainId: number;
  label: string;
  usdc: `0x${string}`;
  /** Raw USDC balance (6 decimals). */
  balance: bigint;
}

/**
 * Native USDC on Ethereum, Base, and Arbitrum in one batched read so the
 * deposit modal can treat USDC as one balance regardless of which chain
 * it sits on. Mainnet only — those addresses are not on testnet.
 */
export function useCrossChainUsdc(address: `0x${string}` | undefined) {
  const enabled = Boolean(address) && NETWORK_MODE === 'mainnet';
  const { data, isLoading, refetch } = useReadContracts({
    contracts: BRIDGE_CHAINS.map((c) => ({
      address: c.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: address ? [address] : undefined,
      chainId: c.id,
    })),
    query: { enabled },
  });

  return useMemo(() => {
    const balances: ChainUsdcBalance[] = BRIDGE_CHAINS.map((c, i) => ({
      chainId: c.id,
      label: c.label,
      usdc: c.usdc,
      balance: (data?.[i]?.result as bigint | undefined) ?? 0n,
    }));
    const total = balances.reduce((acc, b) => acc + b.balance, 0n);
    return { balances, total, isLoading: enabled && isLoading, refetch };
  }, [data, enabled, isLoading, refetch]);
}
