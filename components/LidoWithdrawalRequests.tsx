'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useState } from 'react';
import { lidoWithdrawalQueueAbi } from '@/lib/abi/lido';
import { LIDO } from '@/lib/config/addresses';
import { getWagmiConfig, type SupportedChainId } from '@/lib/wagmi';
import { formatTokenAmount } from '@/lib/format';

/** Lido withdrawals are a request-then-claim queue, typically 1-5 days to finalize on mainnet. */
export function LidoWithdrawalRequests({ chainId }: { chainId: SupportedChainId }) {
  const { address } = useAccount();
  const cfg = (LIDO as Record<number, (typeof LIDO)[keyof typeof LIDO]>)[chainId];
  const [claimingId, setClaimingId] = useState<bigint | null>(null);
  const { writeContractAsync } = useWriteContract();

  const requestIds = useReadContract({
    address: cfg?.withdrawalQueue,
    abi: lidoWithdrawalQueueAbi,
    functionName: 'getWithdrawalRequests',
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: Boolean(cfg && address) },
  });

  const ids = (requestIds.data as readonly bigint[] | undefined) ?? [];

  const statuses = useReadContract({
    address: cfg?.withdrawalQueue,
    abi: lidoWithdrawalQueueAbi,
    functionName: 'getWithdrawalStatus',
    args: ids.length ? [ids as bigint[]] : undefined,
    chainId,
    query: { enabled: Boolean(cfg && ids.length) },
  });

  const rows = (statuses.data as
    | readonly {
        amountOfStETH: bigint;
        amountOfShares: bigint;
        owner: `0x${string}`;
        timestamp: bigint;
        isFinalized: boolean;
        isClaimed: boolean;
      }[]
    | undefined) ?? [];

  if (!cfg || ids.length === 0) return null;

  async function claim(requestId: bigint) {
    if (!cfg) return;
    setClaimingId(requestId);
    try {
      const hash = await writeContractAsync({
        address: cfg.withdrawalQueue,
        abi: lidoWithdrawalQueueAbi,
        functionName: 'claimWithdrawal',
        args: [requestId],
        chainId,
      });
      await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId });
      await Promise.all([requestIds.refetch(), statuses.refetch()]);
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="text-sm text-ink/70 mb-2">Pending withdrawal requests</div>
      <div className="flex flex-col gap-2">
        {ids.map((id, i) => {
          const row = rows[i];
          if (!row || row.isClaimed) return null;
          return (
            <div
              key={id.toString()}
              className="flex items-center justify-between text-sm border border-border rounded px-3 py-2"
            >
              <span>{formatTokenAmount(row.amountOfStETH, 18)} ETH</span>
              <span className="text-ink/50">
                {row.isFinalized ? 'Ready to claim' : 'Waiting for finalization'}
              </span>
              <button
                disabled={!row.isFinalized || claimingId === id}
                onClick={() => claim(id)}
                className="px-3 py-1 rounded bg-accent text-paper text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {claimingId === id ? 'Claiming…' : 'Claim'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
