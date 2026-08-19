'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Opportunity } from '@/lib/protocols/types';
import { chainName } from '@/lib/format';
import { NETWORK_MODE } from '@/lib/wagmi';
import { CompanyMarks } from './CompanyMarks';
import { ConnectButtonClient } from './ConnectButtonClient';
import { OnrampModal } from './OnrampModal';

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
  const onrampChain = starter ? chainName(starter.chainId) : 'Base';

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-accent/[0.07] via-white/[0.02] to-transparent p-6 sm:p-8 flex flex-col gap-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          Non-custodial interface
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight max-w-2xl">
          {!connected && 'Compare live USDC yield. You sign every transaction.'}
          {empty && 'Add USDC to this wallet'}
          {funded && 'Your USDC is in this wallet'}
          {connected && !usdcReady && 'Checking your wallet…'}
        </h1>
        <p className="text-ink/60 text-sm sm:text-[15px] mt-3 max-w-xl leading-relaxed">
          {!connected &&
            'Connect a wallet you control. Openhand never holds keys or funds. Buying USDC is processed by Transak, a third party — not by us.'}
          {empty &&
            (NETWORK_MODE === 'mainnet'
              ? `This wallet has no USDC on ${onrampChain} yet. Transak can send USDC here after their checkout, or you can transfer it yourself.`
              : 'Practice mode. Use a Base Sepolia USDC faucet — production Transak buys need mainnet.')}
          {funded &&
            'Browse the collection and deposit into any card you choose. There is no featured pick. You sign the protocol transaction.'}
          {connected && !usdcReady && 'Reading the connected address on-chain.'}
        </p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <Step n={1} done={connected} label="Wallet" detail="Email, passkey, or existing" />
        <Step
          n={2}
          done={funded}
          label="Add USDC"
          detail={NETWORK_MODE === 'mainnet' ? 'Transak or a transfer' : 'Test USDC'}
        />
        <Step n={3} done={false} label="Deposit" detail="You sign · any card" />
      </ol>

      <CompanyMarks />

      <div className="flex flex-wrap items-center gap-3">
        {!connected && <ConnectButtonClient label="Connect wallet" />}
        {empty && address && starter && (
          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2 hover:bg-accent/90 transition-colors"
          >
            Buy USDC
          </button>
        )}
        <Link href="/about" className="text-sm text-ink/50 hover:text-ink transition-colors">
          About Openhand
        </Link>
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
        done ? 'border-accent/40 bg-accent/10' : 'border-border bg-paper/40'
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
