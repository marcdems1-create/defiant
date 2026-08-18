'use client';

import { useState } from 'react';
import { useChainId } from 'wagmi';
import { formatUsdcUsd } from '@/lib/format';
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
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
  onMoved: () => void;
}) {
  const currentChainId = useChainId();
  const [step, setStep] = useState<MoveStep | 'idle' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [late, setLate] = useState(false);

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
      onStep: (s) => setStep(s),
    });
    onBusy?.(false);
    if (!result.ok) {
      setStep('idle');
      setError(result.error);
      return;
    }
    setLate(Boolean(result.late));
    setStep('done');
    onMoved();
  }

  if (step === 'done') {
    return (
      <p className="text-xs text-accent text-center">
        {late ? `USDC is on the way to ${destLabel}.` : `USDC is on ${destLabel}.`}
      </p>
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
        {busy ? stepLabel(step as MoveStep, destLabel) : `Move $${formatUsdcUsd(moveAmount)} from ${source.label}`}
      </button>
      {error && <p className="text-xs text-danger mt-2 break-words">{error}</p>}
    </div>
  );
}
