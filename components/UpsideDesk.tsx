'use client';

import { useState } from 'react';
import { CryptoDesk } from './CryptoDesk';
import { GoldDesk } from './GoldDesk';
import { StockDesk } from './StockDesk';

type UpsideTape = 'gold' | 'crypto' | 'stocks';

const TAPES: { id: UpsideTape; label: string }[] = [
  { id: 'gold', label: 'Gold' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'stocks', label: 'Stocks' },
];

export function UpsideDesk() {
  const [tape, setTape] = useState<UpsideTape>('gold');

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col gap-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          Price upside
        </p>
        <h2 className="text-lg font-medium">Gold, crypto, and stocks</h2>
        <p className="text-sm text-ink/50 mt-1 max-w-2xl leading-relaxed">
          These are not yield cards. Price can go up or down. Browse the tape, swap USDC in your
          own wallet via LI.FI. Openhand does not pick a winner, size an allocation, or hold the
          tokens.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Price upside tapes">
        {TAPES.map((t) => {
          const active = tape === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTape(t.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-accent text-paper border-accent'
                  : 'border-border text-ink/70 hover:border-ink/40'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tape === 'gold' && <GoldDesk />}
      {tape === 'crypto' && <CryptoDesk embedded />}
      {tape === 'stocks' && <StockDesk embedded />}
    </section>
  );
}
