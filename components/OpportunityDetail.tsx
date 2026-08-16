'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Opportunity } from '@/lib/protocols/types';
import { COMPOUNDED_BADGE, getCardBadges } from '@/lib/protocols/cardBadges';
import { getOpportunityDetails, PROTOCOL_TINT } from '@/lib/protocols/opportunityDetails';
import { apyCaption, assetMark, chainName, formatApy } from '@/lib/format';
import { AssetMark } from './AssetMark';
import { CardBadgeChip } from './CardBadgeChip';
import { DepositWithdrawModal } from './DepositWithdrawModal';
import { ApyHistoryChart } from './ApyHistoryChart';

export function OpportunityDetail({ opportunity }: { opportunity: Opportunity }) {
  const [modalOpen, setModalOpen] = useState(false);
  const badges = getCardBadges(opportunity);
  const details = getOpportunityDetails(opportunity);
  const asset = assetMark(opportunity.asset.symbol);

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-accent transition-colors mb-6"
        >
          <span aria-hidden>←</span> Back to opportunities
        </Link>

        <article
          className={`relative rounded-2xl border border-border bg-gradient-to-br ${PROTOCOL_TINT[opportunity.protocol]} p-6 sm:p-8 mb-8`}
        >
          <AssetMark symbol={opportunity.asset.symbol} size="hero" />
          <div className="relative flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
                {chainName(opportunity.chainId)}
              </div>
              <h1 className="text-2xl sm:text-3xl font-medium mt-1 leading-tight">
                {opportunity.protocolLabel}
              </h1>
              <div className="text-6xl font-semibold tracking-tight text-ink leading-none mt-4">
                {asset.mark}
              </div>
              <div className="text-sm text-ink/50 mt-2">{asset.label}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-4xl font-mono text-accent leading-none">
                {formatApy(opportunity.apy)}
              </div>
              <div className="text-[11px] text-ink/45 mt-1 tracking-wide">
                {apyCaption(opportunity, 'live')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm mb-4">
            {opportunity.apyCompounded && <CardBadgeChip badge={COMPOUNDED_BADGE} accent />}
            <CardBadgeChip badge={badges.risk} />
            <CardBadgeChip badge={badges.battle} />
            <CardBadgeChip badge={badges.fee} />
            <CardBadgeChip badge={badges.liquidity} />
          </div>

          <p className="text-sm text-ink/65 leading-relaxed">{opportunity.description}</p>
        </article>

        <div className="flex flex-col gap-6">
          <ApyHistoryChart opportunity={opportunity} />
          <section className="rounded-2xl border border-border bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-accent mb-3">
              How yield works here
            </h2>
            <p className="text-sm text-ink/70 leading-relaxed">{details.howYieldWorks}</p>
          </section>

          <section className="rounded-2xl border border-border bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-ink/45 mb-3">
              Risks to know
            </h2>
            <ul className="space-y-2.5">
              {details.risks.map((risk) => (
                <li key={risk} className="flex gap-2.5 text-sm text-ink/70 leading-relaxed">
                  <span className="text-ink/35 shrink-0 mt-0.5" aria-hidden>
                    •
                  </span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-accent mb-3">
              Cool detail
            </h2>
            <p className="text-sm text-ink/75 leading-relaxed">{details.coolDetail}</p>
          </section>

          {(details.withdrawalNote || opportunity.liquidity === 'delayed') && (
            <section className="rounded-2xl border border-border bg-white/[0.02] p-5 sm:p-6">
              <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-ink/45 mb-3">
                Withdrawal
              </h2>
              <p className="text-sm text-ink/70 leading-relaxed">
                {details.withdrawalNote ??
                  (opportunity.liquidity === 'delayed'
                    ? 'This opportunity uses a delayed exit — check protocol docs for current wait times.'
                    : null)}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-ink/45 mb-3">
              Learn more
            </h2>
            <a
              href={details.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              {details.docsLabel}
              <span aria-hidden className="text-xs">
                ↗
              </span>
            </a>
          </section>

          <div className="sticky bottom-20 md:bottom-6 z-10 pt-2 pb-4 bg-gradient-to-t from-paper via-paper/95 to-transparent -mx-6 px-6">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full py-3.5 rounded-xl bg-accent text-paper font-medium text-sm hover:bg-accent/90 transition-colors shadow-lg shadow-accent/10"
            >
              Deposit {opportunity.asset.symbol}
            </button>
            <p className="text-[11px] text-ink/40 text-center mt-3 leading-relaxed">
              Not investment advice. Yield is not insured or guaranteed. Capital is at risk. You
              sign every transaction from your own wallet.
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <DepositWithdrawModal opportunity={opportunity} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
