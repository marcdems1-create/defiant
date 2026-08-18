'use client';

import { useState } from 'react';
import type { Opportunity } from '@/lib/protocols/types';
import { DepositWithdrawModal } from './DepositWithdrawModal';
import { HarvestRewards } from './HarvestRewards';

type Tab = 'deposit' | 'withdraw';

export function PositionActions({ opportunity }: { opportunity: Opportunity }) {
  const [tab, setTab] = useState<Tab | null>(null);

  return (
    <>
      <HarvestRewards opportunity={opportunity} compact />
      <div className="flex items-center gap-3 justify-end font-sans">
        <button
          type="button"
          onClick={() => setTab('withdraw')}
          className="text-xs text-accent hover:underline"
        >
          Withdraw
        </button>
        <button
          type="button"
          onClick={() => setTab('deposit')}
          className="text-xs text-ink/50 hover:underline"
        >
          Deposit
        </button>
      </div>
      {tab && (
        <DepositWithdrawModal
          opportunity={opportunity}
          initialTab={tab}
          onClose={() => setTab(null)}
        />
      )}
    </>
  );
}
