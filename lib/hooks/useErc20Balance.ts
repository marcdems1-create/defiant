'use client';

import { useReadContract } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import type { SupportedChainId } from '@/lib/wagmi';

export function useErc20Balance(
  token: `0x${string}` | undefined,
  owner: `0x${string}` | undefined,
  chainId: SupportedChainId,
) {
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    chainId,
    query: { enabled: Boolean(token && owner) },
  });
}

export function useErc20Allowance(
  token: `0x${string}` | undefined,
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | undefined,
  chainId: SupportedChainId,
) {
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    chainId,
    query: { enabled: Boolean(token && owner && spender) },
  });
}
