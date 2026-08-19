'use client';

import type { Position } from '@/lib/hooks/usePositions';
import { PROTOCOL_TINT } from '@/lib/protocols/opportunityDetails';
import { apyCaption, chainName, formatApy, formatTokenAmount, formatUsdcUsd } from '@/lib/format';
import { PositionActions } from './PositionActions';
import { HarvestRewards } from './HarvestRewards';
import { hasTokenEmissions } from '@/lib/protocols/types';

export function PositionCard({ position }: { position: Position }) {
  const { opportunity, balance } = position;
  const isUsdc = opportunity.asset.symbol.toUpperCase() === 'USDC';
  const amount = formatTokenAmount(balance, opportunity.asset.decimals, isUsdc ? 2 : 4);
  const showHarvest = hasTokenEmissions(opportunity.protocol);

  return (
    <article
      className={`rounded-2xl border border-border bg-gradient-to-br ${PROTOCOL_TINT[opportunity.protocol] ?? 'from-white/10 via-transparent to-transparent'} p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
            {chainName(opportunity.chainId)}
          </div>
          <h3 className="text-lg font-medium mt-1 leading-tight truncate">
            {opportunity.protocolLabel}
          </h3>
          <div className="text-xs text-ink/50 mt-1">
            {formatApy(opportunity.apy)} {apyCaption(opportunity)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xl leading-none tabular-nums">
            {isUsdc ? `$${formatUsdcUsd(balance)}` : amount}
          </div>
          <div className="text-[11px] text-ink/45 mt-1.5 font-mono">
            {isUsdc ? `${amount} USDC` : opportunity.asset.symbol}
          </div>
          <div className="mt-3">
            <PositionActions opportunity={opportunity} />
          </div>
        </div>
      </div>
      {showHarvest && (
        <div className="mt-4 pt-4 border-t border-border/80">
          <HarvestRewards opportunity={opportunity} compact />
        </div>
      )}
    </article>
  );
}
