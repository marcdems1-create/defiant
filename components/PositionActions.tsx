'use client';

import { useState } from 'react';
import type { Opportunity } from '@/lib/protocols/types';
import { DepositWithdrawModal } from './DepositWithdrawModal';

type Tab = 'deposit' | 'withdraw';

export function PositionActions({ opportunity }: { opportunity: Opportunity }) {
  const [tab, setTab] = useState<Tab | null>(null);

  return (
    <>
      <div className="flex items-center gap-2 justify-end font-sans">
        <button
          type="button"
          onClick={() => setTab('withdraw')}
          className="text-[11px] px-2.5 py-1 rounded-full border border-border text-ink/70 hover:text-ink hover:border-ink/30 transition-colors"
        >
          Withdraw
        </button>
        <button
          type="button"
          onClick={() => setTab('deposit')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors"
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
