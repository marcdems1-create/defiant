'use client';

import { useState } from 'react';
import { useChainId } from 'wagmi';
import { chainName, formatUsdcUsd, txExplorerUrl } from '@/lib/format';
import { executeUsdcMove, type MoveStep } from '@/lib/bridge/execute';
import type { ChainUsdcBalance } from '@/lib/hooks/useCrossChainUsdc';
import { bridgeChainById } from '@/lib/config/bridgeChains';

function stepLabel(step: MoveStep, destLabel: string): string {
  if (step === 'quoting') return 'Finding a route…';
  if (step === 'switching') return 'Switching network…';
  if (step === 'approving') return 'Approving…';
  if (step === 'moving') return 'Moving…';
  return `Arriving on ${destLabel}…`;
}

export function MoveUsdcButton({
  address,
  destChainId,
  destLabel,
  source,
  requestedAmount,
  protocolLabel,
  opportunityId,
  disabled,
  onBusy,
  onMoved,
}: {
  address: `0x${string}`;
  destChainId: number;
  destLabel: string;
  source: ChainUsdcBalance;
  /** 0 or more than source → move all of source. */
  requestedAmount: bigint;
  protocolLabel?: string;
  opportunityId?: string;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
  onMoved: (info: { late: boolean; txHash: `0x${string}`; movedAmount: bigint }) => void;
}) {
  const currentChainId = useChainId();
  const [step, setStep] = useState<MoveStep | 'idle' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [late, setLate] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const dest = bridgeChainById(destChainId);
  const moveAmount =
    requestedAmount > 0n && requestedAmount <= source.balance ? requestedAmount : source.balance;
  const busy = step !== 'idle' && step !== 'done';

  async function handleMove() {
    if (!dest || moveAmount <= 0n) return;
    setError(null);
    setLate(false);
    onBusy?.(true);
    const result = await executeUsdcMove({
      account: address,
      fromChainId: source.chainId,
      toChainId: destChainId,
      fromToken: source.usdc,
      toToken: dest.usdc,
      amount: moveAmount,
      currentChainId,
      opportunityId,
      protocolLabel,
      onStep: (s) => setStep(s),
    });
    onBusy?.(false);
    if (!result.ok) {
      setStep('idle');
      setError(result.error);
      return;
    }
    setTxHash(result.txHash);
    setLate(Boolean(result.late));
    setStep('done');
    onMoved({ late: Boolean(result.late), txHash: result.txHash, movedAmount: moveAmount });
  }

  const fromUrl = txHash ? txExplorerUrl(source.chainId, txHash) : null;

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-accent text-center leading-relaxed">
          {late
            ? `USDC is on the way to ${destLabel}. This is not a yield position yet.`
            : `USDC is on ${destLabel}, in this wallet. Sign once more to deposit${protocolLabel ? ` into ${protocolLabel}` : ''}.`}
        </p>
        {fromUrl && (
          <a
            href={fromUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-accent/80 hover:underline text-center"
          >
            View move on {chainName(source.chainId)}
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleMove}
        disabled={disabled || busy || moveAmount <= 0n}
        className="w-full py-2 rounded-md bg-accent text-paper font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {busy
          ? stepLabel(step as MoveStep, destLabel)
          : `Step 1 of 2 · Move $${formatUsdcUsd(moveAmount)} to ${destLabel}`}
      </button>
      {error && <p className="text-xs text-danger mt-2 break-words">{error}</p>}
    </div>
  );
}
