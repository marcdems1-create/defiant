'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Opportunity } from '@/lib/protocols/types';
import { COMPOUNDED_BADGE, getCardBadges } from '@/lib/protocols/cardBadges';
import { PROTOCOL_TINT } from '@/lib/protocols/opportunityDetails';
import { apyCaption, assetMark, chainName, formatApy } from '@/lib/format';
import { CardBadgeChip } from './CardBadgeChip';
import { DepositWithdrawModal } from './DepositWithdrawModal';

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const [modalOpen, setModalOpen] = useState(false);
  const badges = getCardBadges(opportunity);
  const asset = assetMark(opportunity.asset.symbol);

  return (
    <>
      <article
        className={`relative rounded-2xl border border-border bg-gradient-to-br ${PROTOCOL_TINT[opportunity.protocol]} p-5 flex flex-col gap-4 min-h-[260px] transition-transform hover:-translate-y-0.5 hover:border-accent/40`}
      >
        <Link
          href={`/opportunities/${opportunity.id}`}
          className="relative z-[1] flex flex-col gap-4 flex-1 group outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-xl -m-1 p-1"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
                {chainName(opportunity.chainId)}
              </div>
              <h3 className="text-lg font-medium mt-1 leading-tight group-hover:text-accent transition-colors">
                {opportunity.protocolLabel}
              </h3>
              <div className="text-5xl font-semibold tracking-tight text-ink leading-none mt-3">
                {asset.mark}
              </div>
              <div className="text-sm text-ink/50 mt-1.5">{asset.label}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-mono text-accent leading-none">
                {formatApy(opportunity.apy)}
              </div>
              <div className="text-[11px] text-ink/45 mt-1 tracking-wide">
                {apyCaption(opportunity)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {opportunity.apyCompounded && <CardBadgeChip badge={COMPOUNDED_BADGE} accent />}
            <CardBadgeChip badge={badges.risk} />
            <CardBadgeChip badge={badges.battle} />
            <CardBadgeChip badge={badges.fee} />
            <CardBadgeChip badge={badges.liquidity} />
          </div>

          <p className="text-sm text-ink/60 leading-relaxed line-clamp-2 flex-1">
            {opportunity.description}
          </p>

          <span className="text-xs text-accent/60 group-hover:text-accent transition-colors">
            View details →
          </span>
        </Link>

        <button
          onClick={() => setModalOpen(true)}
          className="relative z-[1] w-full py-2.5 rounded-xl bg-accent text-paper font-medium text-sm hover:bg-accent/90 transition-colors"
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
