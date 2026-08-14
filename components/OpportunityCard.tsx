'use client';

import { useState } from 'react';
import type { Opportunity } from '@/lib/protocols/types';
import { getCardBadges } from '@/lib/protocols/cardBadges';
import { chainName, formatApy } from '@/lib/format';
import { DepositWithdrawModal } from './DepositWithdrawModal';

const PROTOCOL_TINT: Record<Opportunity['protocol'], string> = {
  'aave-v3': 'from-blue-500/20 via-blue-500/5 to-transparent',
  lido: 'from-purple-500/20 via-purple-500/5 to-transparent',
  'yearn-v3': 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  'curve-scrvusd': 'from-orange-500/20 via-orange-500/5 to-transparent',
  'frax-sfrxusd': 'from-teal-500/20 via-teal-500/5 to-transparent',
  'convex-cvxcrv': 'from-pink-500/20 via-pink-500/5 to-transparent',
  'compound-v3': 'from-sky-500/20 via-sky-500/5 to-transparent',
  morpho: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
  fluid: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
  moonwell: 'from-lime-500/20 via-lime-500/5 to-transparent',
};

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const [modalOpen, setModalOpen] = useState(false);
  const badges = getCardBadges(opportunity);

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${PROTOCOL_TINT[opportunity.protocol]} p-5 flex flex-col gap-4 min-h-[240px] transition-transform hover:-translate-y-0.5 hover:border-accent/40`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
              {chainName(opportunity.chainId)}
            </div>
            <h3 className="text-lg font-medium mt-1 leading-tight">{opportunity.protocolLabel}</h3>
            <div className="text-sm text-ink/55 mt-0.5">{opportunity.asset.symbol}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-mono text-accent leading-none">{formatApy(opportunity.apy)}</div>
            <div className="text-[11px] text-ink/45 mt-1 tracking-wide">APY</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-paper/60 px-2.5 py-1"
            title={badges.risk.label}
          >
            <span aria-hidden>{badges.risk.emoji}</span>
            <span className="text-ink/80 text-xs">{badges.risk.label}</span>
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-paper/60 px-2.5 py-1"
            title={badges.battle.label}
          >
            <span aria-hidden>{badges.battle.emoji}</span>
            <span className="text-ink/80 text-xs">{badges.battle.label}</span>
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-paper/60 px-2.5 py-1"
            title={badges.fee.label}
          >
            <span aria-hidden>{badges.fee.emoji}</span>
            <span className="text-ink/80 text-xs">{badges.fee.label}</span>
          </span>
        </div>

        <p className="text-sm text-ink/60 leading-relaxed line-clamp-2 flex-1">
          {opportunity.description}
        </p>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-2.5 rounded-xl bg-accent text-paper font-medium text-sm hover:bg-accent/90 transition-colors"
        >
          Deposit {opportunity.asset.symbol}
        </button>
      </article>

      {modalOpen && (
        <DepositWithdrawModal opportunity={opportunity} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
