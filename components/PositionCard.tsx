'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import type { Position } from '@/lib/hooks/usePositions';
import { apyCaption, chainName, formatApy } from '@/lib/format';
import { DepositWithdrawModal } from './DepositWithdrawModal';

export function PositionCard({ position }: { position: Position }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { opportunity, balance } = position;

  return (
    <>
      <div className="border border-border rounded-lg p-4 flex items-center justify-between bg-white/[0.02]">
        <div>
          <div className="text-sm font-medium">
            {opportunity.protocolLabel} · {chainName(opportunity.chainId)}
          </div>
          <div className="text-xs text-ink/50">
            {formatApy(opportunity.apy)} current {apyCaption(opportunity)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono">
            {formatUnits(balance, opportunity.asset.decimals)} {opportunity.asset.symbol}
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs text-accent hover:underline"
          >
            Manage
          </button>
        </div>
      </div>

      {modalOpen && (
        <DepositWithdrawModal opportunity={opportunity} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
