'use client';

import { formatUnits } from 'viem';
import type { Position } from '@/lib/hooks/usePositions';
import { apyCaption, chainName, formatApy } from '@/lib/format';
import { PositionActions } from './PositionActions';

export function PositionCard({ position }: { position: Position }) {
  const { opportunity, balance } = position;

  return (
    <div className="border border-border rounded-lg p-4 flex items-center justify-between gap-4 bg-white/[0.02]">
      <div>
        <div className="text-sm font-medium">
          {opportunity.protocolLabel} · {chainName(opportunity.chainId)}
        </div>
        <div className="text-xs text-ink/50">
          {formatApy(opportunity.apy)} current {apyCaption(opportunity)}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono">
          {formatUnits(balance, opportunity.asset.decimals)} {opportunity.asset.symbol}
        </div>
        <div className="mt-1">
          <PositionActions opportunity={opportunity} />
        </div>
      </div>
    </div>
  );
}
