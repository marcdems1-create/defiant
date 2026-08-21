'use client';

import { useEffect, useState } from 'react';
import type { Opportunity } from '@/lib/protocols/types';
import { useWalletUiReady } from '@/lib/walletMode';
import { DepositWithdrawModal } from './DepositWithdrawModal';

export function OpportunityDeposit({ opportunity }: { opportunity: Opportunity }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillWallet, setPrefillWallet] = useState(false);
  const walletUiReady = useWalletUiReady();

  useEffect(() => {
    if (!walletUiReady) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('deposit') === '1') {
      setPrefillWallet(true);
      setModalOpen(true);
    }
  }, [walletUiReady]);

  return (
    <>
      <div className="sticky bottom-20 md:bottom-6 z-10 pt-2 pb-4 bg-gradient-to-t from-paper via-paper/95 to-transparent -mx-6 px-6">
        <button
          disabled={!walletUiReady}
          onClick={() => {
            setPrefillWallet(false);
            setModalOpen(true);
          }}
          className="w-full py-3.5 rounded-xl bg-accent text-paper font-medium text-sm hover:bg-accent/90 transition-colors shadow-lg shadow-accent/10 disabled:opacity-60"
        >
          Deposit {opportunity.asset.symbol}
        </button>
        <p className="text-[11px] text-ink/40 text-center mt-3 leading-relaxed">
          Not investment advice. Yield is not insured or guaranteed. Capital is at risk. You sign
          every transaction from your own wallet.
        </p>
      </div>

      {modalOpen && (
        <DepositWithdrawModal
          opportunity={opportunity}
          onClose={() => setModalOpen(false)}
          prefillWallet={prefillWallet}
        />
      )}
    </>
  );
}

export function OpportunityDepositUnavailable({ assetSymbol }: { assetSymbol: string }) {
  return (
    <div className="sticky bottom-20 md:bottom-6 z-10 pt-2 pb-4 bg-gradient-to-t from-paper via-paper/95 to-transparent -mx-6 px-6">
      <p className="w-full py-3.5 rounded-xl border border-border text-ink/55 font-medium text-sm text-center">
        Live rate for {assetSymbol} didn&apos;t parse — deposit stays closed rather than showing a
        guessed APY.
      </p>
      <p className="text-[11px] text-ink/40 text-center mt-3 leading-relaxed">
        Not investment advice. Yield is not insured or guaranteed. Capital is at risk.
      </p>
    </div>
  );
}
