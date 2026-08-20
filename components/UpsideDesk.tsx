'use client';

import { useState } from 'react';
import { CryptoDesk } from './CryptoDesk';
import { GoldDesk } from './GoldDesk';
import { StockDesk } from './StockDesk';

type Tape = 'gold' | 'crypto' | 'stocks';

export function UpsideDesk() {
  const [tape, setTape] = useState<Tape>('gold');

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Gold, crypto, stocks">
        {([
          ['gold', 'Gold'],
          ['crypto', 'Crypto'],
          ['stocks', 'Stocks'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tape === id}
            onClick={() => setTape(id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              tape === id
                ? 'bg-accent text-paper border-accent'
                : 'border-border text-ink/70 hover:border-ink/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tape === 'gold' && <GoldDesk />}
      {tape === 'crypto' && <CryptoDesk embedded />}
      {tape === 'stocks' && <StockDesk embedded />}
    </section>
  );
}
