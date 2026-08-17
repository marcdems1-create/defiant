'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { usePositions } from '@/lib/hooks/usePositions';
import {
  computeMarketStats,
  computePortfolioAnalytics,
  positionValueUsd,
} from '@/lib/portfolio/analytics';
import { chainName, formatApy, formatTokenAmount } from '@/lib/format';
import { ConnectButtonClient } from '@/components/ConnectButtonClient';
import { GrowthChart } from '@/components/GrowthChart';
import { PositionActions } from '@/components/PositionActions';

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white/[0.02] p-5 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">{label}</div>
      <div className="text-2xl font-mono text-accent leading-tight">{value}</div>
      {sub && <div className="text-xs text-ink/50 mt-1">{sub}</div>}
    </div>
  );
}

const PROJECTION_DISCLAIMER =
  'Illustration only. APY changes daily. Not a forecast or guarantee.';

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { data: opportunities, isLoading, isError } = useOpportunities();
  const { positions, isLoading: positionsLoading } = usePositions(opportunities, {
    catalogLoading: isLoading,
  });

  const analytics = useMemo(
    () => computePortfolioAnalytics(positions),
    [positions],
  );

  const marketStats = useMemo(
    () => computeMarketStats(opportunities ?? []),
    [opportunities],
  );

  const showProjection =
    isConnected &&
    analytics.totalStableValue > 0 &&
    analytics.weightedApy !== null;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
            Your yield journey
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
          <p className="text-ink/55 text-sm mt-2 max-w-xl leading-relaxed">
            Track where you stand and stay the course. Live on-chain reads only — Openhand never
            holds your keys or funds.
          </p>
        </div>
      </header>

      {!isConnected && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/10 via-transparent to-transparent p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-lg font-medium mb-1">Deposit to see your portfolio</h2>
            <p className="text-sm text-ink/60 max-w-md">
              Personal analytics appear only for your wallet. Email or a passkey creates one —
              we never hold the key.
            </p>
          </div>
          <ConnectButtonClient label="Deposit" />
        </div>
      )}

      {isConnected && positionsLoading && (
        <div className="text-ink/50 text-sm">Reading your on-chain positions…</div>
      )}

      {isConnected && !positionsLoading && positions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-ink/60 text-sm mb-4">
            No active positions yet. Pick a yield card and deposit from your wallet to start
            tracking progress here.
          </p>
          <Link href="/" className="text-sm text-accent hover:underline">
            Browse the collection →
          </Link>
        </div>
      )}

      {isConnected && !positionsLoading && positions.length > 0 && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Stable position value"
              value={
                analytics.totalStableValue > 0
                  ? `$${analytics.totalStableValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : '—'
              }
              sub={
                analytics.hasNonStablePositions
                  ? 'USDC/stable positions at ~$1 each. Non-stable holdings listed below.'
                  : analytics.totalStableValue > 0
                    ? 'Approximate; stable assets at ~$1 each.'
                    : 'No stable-denominated positions to value in USD.'
              }
            />
            <StatCard
              label="Weighted APY"
              value={
                analytics.weightedApy !== null
                  ? formatApy(analytics.weightedApy)
                  : '—'
              }
              sub={
                analytics.hasNonStablePositions
                  ? 'Weighted by stable positions only.'
                  : "Today's live rates across your holdings."
              }
            />
            <StatCard
              label="Active positions"
              value={String(analytics.positionCount)}
              sub="On-chain balances above zero."
            />
            <StatCard
              label="Chains"
              value={String(analytics.chainBreakdown.length)}
              sub={
                analytics.chainBreakdown.length > 0
                  ? analytics.chainBreakdown
                      .map((c) => `${chainName(c.chainId)} (${c.count})`)
                      .join(' · ')
                  : undefined
              }
            />
          </section>

          {analytics.hasNonStablePositions && (
            <section className="rounded-2xl border border-border bg-white/[0.02] p-5">
              <h2 className="text-sm font-medium mb-3">Non-stable holdings</h2>
              <p className="text-xs text-ink/45 mb-4">
                No live price oracle — shown in token units, not included in USD totals or
                projection.
              </p>
              <ul className="flex flex-col gap-2">
                {analytics.nonStablePositions.map((p) => (
                  <li
                    key={p.opportunity.id}
                    className="flex items-center justify-between gap-4 text-sm font-mono"
                  >
                    <span className="text-ink/70">
                      {p.opportunity.protocolLabel} · {chainName(p.opportunity.chainId)}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <span>
                        {formatTokenAmount(p.balance, p.opportunity.asset.decimals)}{' '}
                        {p.opportunity.asset.symbol}{' '}
                        <span className="text-ink/45 text-xs">
                          @ {formatApy(p.opportunity.apy)}
                        </span>
                      </span>
                      <PositionActions opportunity={p.opportunity} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showProjection && (
            <section className="rounded-2xl border border-border bg-gradient-to-br from-accent/5 via-transparent to-transparent p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-medium">Illustrative growth</h2>
                  <p className="text-sm text-ink/55 mt-1 max-w-lg">
                    If today&apos;s weighted APY ({formatApy(analytics.weightedApy!)}) stayed
                    constant — it won&apos;t — your stable holdings could compound like this.
                  </p>
                </div>
              </div>

              <GrowthChart
                points={analytics.projectionPoints}
                currentValue={analytics.totalStableValue}
              />

              <p className="mt-5 text-xs text-warn/90 border border-warn/20 bg-warn/5 rounded-lg px-4 py-3 leading-relaxed">
                {PROJECTION_DISCLAIMER} Yields move with market conditions, utilization, and
                protocol risk. Past or current APY is not indicative of future results.
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-white/[0.02] p-5">
            <h2 className="text-sm font-medium mb-4">Position breakdown</h2>
            <ul className="flex flex-col gap-3">
              {positions.map((p) => {
                const usd = positionValueUsd(p);
                return (
                  <li
                    key={p.opportunity.id}
                    className="flex items-center justify-between gap-4 text-sm border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{p.opportunity.protocolLabel}</div>
                      <div className="text-xs text-ink/45">
                        {chainName(p.opportunity.chainId)} · {formatApy(p.opportunity.apy)} APY
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      {formatTokenAmount(p.balance, p.opportunity.asset.decimals)}{' '}
                      {p.opportunity.asset.symbol}
                      {usd !== null && (
                        <div className="text-xs text-ink/40">
                          ≈ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      <div className="mt-1.5">
                        <PositionActions opportunity={p.opportunity} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
        <h2 className="text-lg font-medium mb-1">
          {isConnected ? 'Market snapshot' : 'Live market stats'}
        </h2>
        <p className="text-sm text-ink/50 mb-5">
          Aggregate browse-only stats from live protocol rates — not personal advice.
        </p>

        {isLoading && <div className="text-ink/50 text-sm">Loading live rates…</div>}
        {isError && (
          <div className="text-danger text-sm">
            Couldn&apos;t load opportunities. Check your network and try again.
          </div>
        )}
        {!isLoading && !isError && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Protocols"
              value={String(marketStats.protocolCount)}
              sub={`${marketStats.opportunityCount} opportunities`}
            />
            <StatCard
              label="Chains"
              value={String(marketStats.chainCount)}
            />
            <StatCard
              label="APY range"
              value={`${formatApy(marketStats.minApy)} – ${formatApy(marketStats.maxApy)}`}
              sub="Live rates today"
            />
            <StatCard
              label="Average APY"
              value={formatApy(marketStats.avgApy)}
              sub="Unweighted across all cards"
            />
          </div>
        )}

        {!isConnected && !isLoading && (
          <p className="text-xs text-ink/40 mt-4">
            Connect your wallet above to see personal position analytics and an illustrative
            growth chart — available only for your own on-chain holdings.
          </p>
        )}
      </section>
    </div>
  );
}
