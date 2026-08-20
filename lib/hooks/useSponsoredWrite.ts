'use client';

import { useAccount, useWalletClient, useWriteContract } from 'wagmi';
import { getPublicClient, waitForTransactionReceipt } from 'wagmi/actions';
import type { PublicClient, WalletClient } from 'viem';
import { getWagmiConfig } from '@/lib/wagmi';
import { MIN_GAS_WEI } from '@/lib/tx/gas';
import { gasPermitAmount, paymasterConfigured } from '@/lib/config/paymaster';
import {
  sendEthGasCalls,
  sendUsdcGasCalls,
  type ContractCall,
} from '@/lib/tx/usdcPaymaster';
import { useSign7702Fn } from '@/lib/tx/sign7702Context';

export type { ContractCall };

export function useSponsoredWrite() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const sign7702 = useSign7702Fn();

  async function sendCalls(
    calls: ContractCall[],
    opts: { nativeWei: bigint; usdcBalance: bigint },
  ): Promise<`0x${string}`> {
    if (!address) throw new Error('Connect a wallet first');
    if (calls.length === 0) throw new Error('Nothing to send');
    const chainId = calls[0].chainId;
    const wait = (hash: `0x${string}`, id: number) =>
      waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: id });

    const useUsdcGas =
      opts.nativeWei < MIN_GAS_WEI &&
      paymasterConfigured(chainId) &&
      opts.usdcBalance >= gasPermitAmount(chainId);

    if (!useUsdcGas) {
      if (opts.nativeWei < MIN_GAS_WEI) {
        const need = Number(gasPermitAmount(chainId)) / 1e6;
        throw new Error(
          paymasterConfigured(chainId)
            ? `Leave at least $${need.toFixed(0)} USDC in this wallet to cover gas (unused is refunded), or send a little ETH.`
            : 'This wallet needs a little ETH on this chain to pay gas.',
        );
      }
      return sendEthGasCalls({
        writeContractAsync: writeContractAsync as never,
        wait,
        account: address,
        calls,
      });
    }

    if (!walletClient) throw new Error('Wallet is not ready. Try again in a moment.');
    const publicClient = getPublicClient(getWagmiConfig(), { chainId });
    if (!publicClient) throw new Error('No RPC client for this network.');

    return sendUsdcGasCalls({
      walletClient: walletClient as WalletClient,
      publicClient: publicClient as PublicClient,
      owner: address,
      chainId,
      calls,
      sign7702,
    });
  }

  return { sendCalls };
}

export function willPayGasInUsdc(params: {
  chainId: number;
  nativeWei: bigint;
  usdcBalance: bigint;
}): boolean {
  return (
    params.nativeWei < MIN_GAS_WEI &&
    paymasterConfigured(params.chainId) &&
    params.usdcBalance >= gasPermitAmount(params.chainId)
  );
}
