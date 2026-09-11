import { discoverYearnAdapters } from '@defiant/core';
import type { Opportunity } from './types';
import type { SupportedChainId } from '@/lib/wagmi';

/**
 * Bridges @defiant/core's YearnAdapter (vault discovery, rate, on-chain
 * read/write building) to this app's Opportunity catalog shape (display
 * copy, risk tier — product decisions the adapter itself doesn't own).
 * Phase 2 adapter extraction: the yDaemon fetch/parse logic now lives in
 * packages/core/src/adapters/yearn.ts, not here.
 */
export async function fetchYearnOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const adapters = await discoverYearnAdapters(chainId);

  const opportunities: Opportunity[] = [];
  for (const adapter of adapters) {
    const rate = await adapter.getRate();
    if (rate === null) continue;
    opportunities.push({
      id: adapter.id,
      protocol: 'yearn-v3',
      protocolLabel: 'Yearn v3',
      chainId,
      asset: { address: adapter.asset, symbol: 'USDC', decimals: 6 },
      apy: rate.apy,
      apyCompounded: rate.apyCompounded,
      description:
        'Deposit USDC into this Yearn v3 vault. Yearn auto-routes deposits across underlying strategies to optimize risk-adjusted yield; withdraw anytime via ERC-4626 redeem.',
      depositTarget: adapter.vault,
      positionToken: adapter.vault,
      liquidity: 'instant',
      riskTier: 'emerging',
    });
  }

  // Highest APY first — this is a comparison surface, not a ranked endorsement.
  return opportunities.sort((a, b) => b.apy - a.apy);
}
