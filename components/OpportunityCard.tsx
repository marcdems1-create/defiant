'use client';

import { useState } from 'react';
import type { Opportunity } from '@/lib/protocols/types';
import { chainName, formatApy } from '@/lib/format';
import { DepositWithdrawModal } from './DepositWithdrawModal';

const PROTOCOL_BADGE: Record<Opportunity['protocol'], string> = {
  'aave-v3': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  lido: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'yearn-v3': 'bg-accent/10 text-accent border-accent/30',
};

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="border border-border rounded-lg p-5 flex flex-col gap-3 bg-white/[0.02]">
        <div className="flex items-start justify-between">
          <div>
            <span
              className={`inline-block text-xs font-mono px-2 py-0.5 rounded border ${PROTOCOL_BADGE[opportunity.protocol]}`}
            >
              {opportunity.protocolLabel}
            </span>
            <div className="text-sm text-ink/50 mt-1">{chainName(opportunity.chainId)}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-accent">{formatApy(opportunity.apy)}</div>
            <div className="text-xs text-ink/50">APY</div>
          </div>
        </div>

        <div className="text-sm text-ink/70 leading-relaxed">{opportunity.description}</div>

        <button
          onClick={() => setModalOpen(true)}
          className="mt-2 w-full py-2 rounded-md bg-accent text-paper font-medium text-sm hover:bg-accent/90 transition-colors"
        >
          Deposit {opportunity.asset.symbol}
        </button>
      </div>

      {modalOpen && (
        <DepositWithdrawModal opportunity={opportunity} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
