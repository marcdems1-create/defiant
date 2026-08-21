import type { ReactNode } from 'react';
import Link from 'next/link';
import type { CatalogEntry } from '@/lib/protocols/catalog';
import { COMPOUNDED_BADGE, getCardBadges } from '@/lib/protocols/cardBadges';
import { getOpportunityDetails, PROTOCOL_TINT } from '@/lib/protocols/opportunityDetails';
import { apyCaption, assetMark, chainName, formatApyDisplay } from '@/lib/format';
import { CardBadgeChip } from './CardBadgeChip';

/** Server-safe card body — unique copy must be in the first HTML response. */
export function OpportunityDetailView({
  catalog,
  apy,
  chart,
  actions,
}: {
  catalog: CatalogEntry;
  apy: number | null;
  chart?: ReactNode;
  actions?: ReactNode;
}) {
  const badges = getCardBadges(catalog);
  const details = getOpportunityDetails(catalog);
  const asset = assetMark(catalog.assetSymbol);

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-accent transition-colors mb-6"
      >
        <span aria-hidden>←</span> Back to collection
      </Link>

      <article
        className={`relative rounded-2xl border border-border bg-gradient-to-br ${PROTOCOL_TINT[catalog.protocol]} p-6 sm:p-8 mb-8`}
      >
        <div className="relative flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
              {chainName(catalog.chainId)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium mt-1 leading-tight">
              {catalog.protocolLabel}
            </h1>
            <div className="text-6xl font-semibold tracking-tight text-ink leading-none mt-4">
              {asset.mark}
            </div>
            <div className="text-sm text-ink/50 mt-2">{asset.label}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-4xl font-mono text-accent leading-none">
              {formatApyDisplay(apy)}
            </div>
            <div className="text-[11px] text-ink/45 mt-1 tracking-wide">
              {apy != null && Number.isFinite(apy) && apy > 0
                ? apyCaption(catalog, 'live')
                : 'live rate unavailable'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm mb-4">
          {catalog.apyCompounded && <CardBadgeChip badge={COMPOUNDED_BADGE} accent />}
          <CardBadgeChip badge={badges.risk} />
          <CardBadgeChip badge={badges.battle} />
          <CardBadgeChip badge={badges.fee} />
          <CardBadgeChip badge={badges.liquidity} />
        </div>

        <p className="text-sm text-ink/65 leading-relaxed">{catalog.description}</p>
      </article>

      <div className="flex flex-col gap-6">
        {chart}

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

        {(details.withdrawalNote || catalog.liquidity === 'delayed') && (
          <section className="rounded-2xl border border-border bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-ink/45 mb-3">
              Withdrawal
            </h2>
            <p className="text-sm text-ink/70 leading-relaxed">
              {details.withdrawalNote ??
                (catalog.liquidity === 'delayed'
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

        {actions}
      </div>
    </div>
  );
}
