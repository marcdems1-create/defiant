'use client';

import { useState } from 'react';
import type { Opportunity } from '@/lib/protocols/types';
import { chainName } from '@/lib/format';
import { ConnectButtonClient } from './ConnectButtonClient';
import { OnrampModal } from './OnrampModal';
import { NETWORK_MODE } from '@/lib/wagmi';

export function FirstRunHero({
  connected,
  address,
  starter,
  usdcBalance,
  usdcReady,
}: {
  connected: boolean;
  address?: `0x${string}`;
  starter?: Opportunity;
  usdcBalance: bigint;
  usdcReady: boolean;
}) {
  const [buyOpen, setBuyOpen] = useState(false);
  const empty = connected && usdcReady && usdcBalance === 0n;
  const funded = connected && usdcReady && usdcBalance > 0n;

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col gap-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          First session
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          {!connected && 'Get a wallet, add dollars, put them to work'}
          {empty && 'Add USDC to this wallet'}
          {funded && 'Put your USDC to work'}
          {connected && !usdcReady && 'Checking your wallet…'}
        </h1>
        <p className="text-ink/55 text-sm mt-2 max-w-xl leading-relaxed">
          {!connected &&
            'Email or a passkey creates a wallet. You sign every move. Openhand never holds your keys or funds.'}
          {empty &&
            (NETWORK_MODE === 'mainnet'
              ? `This wallet has no USDC on ${starter ? chainName(starter.chainId) : 'Base'} yet. In Canada, buy with Interac or a card — it lands in this wallet, not with Openhand.`
              : 'Practice mode uses test USDC, not a card purchase. Fund this wallet on the test network, then deposit.')}
          {funded &&
            'Your USDC is in this wallet. Browse the collection and deposit into any card you choose.'}
        </p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <Step n={1} done={connected} label="Wallet" detail="Email or passkey" />
        <Step n={2} done={funded} label="Add USDC" detail="Interac or card" />
        <Step n={3} done={false} label="Deposit" detail="Pick a card" />
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        {!connected && <ConnectButtonClient label="Deposit" />}
        {empty && address && starter && (
          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2 hover:bg-accent/90 transition-colors"
          >
            {NETWORK_MODE === 'mainnet' ? 'Buy USDC' : 'How to get test USDC'}
          </button>
        )}
      </div>

      {buyOpen && address && starter && (
        <OnrampModal
          address={address}
          chainId={starter.chainId}
          onClose={() => setBuyOpen(false)}
        />
      )}
    </section>
  );
}

function Step({
  n,
  done,
  label,
  detail,
}: {
  n: number;
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li
      className={`rounded-xl border px-3 py-2.5 ${
        done ? 'border-accent/40 bg-accent/10' : 'border-border'
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink/40 font-mono flex items-center gap-1.5">
        {done ? (
          <>
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 8.5 6.2 12 13 4.5" />
            </svg>
            <span className="sr-only">Complete</span>
          </>
        ) : (
          `Step ${n}`
        )}
      </div>
      <div className="font-medium mt-0.5">{label}</div>
      <div className="text-xs text-ink/50">{detail}</div>
    </li>
  );
}
