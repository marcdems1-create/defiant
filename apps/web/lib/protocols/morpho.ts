import { createMorphoAdapters } from '@defiant/core';
import type { Opportunity } from './types';
import type { SupportedChainId } from '@/lib/wagmi';

/**
 * Bridges @defiant/core's MorphoAdapter to this app's Opportunity catalog
 * shape. Phase 2 adapter extraction: the vault config and rate-fetch logic
 * (Morpho GraphQL, DeFiLlama fallback) now live in packages/core/src/adapters/morpho.ts.
 */
export async function fetchMorphoOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const adapters = createMorphoAdapters(chainId);

  const out: Opportunity[] = [];
  for (const adapter of adapters) {
    const rate = await adapter.getRate();
    if (rate === null) continue;
    out.push({
      id: adapter.id,
      protocol: 'morpho',
      protocolLabel: `Morpho · ${adapter.label}`,
      chainId,
      asset: { address: adapter.asset, symbol: 'USDC', decimals: 6 },
      apy: rate.apy,
      apyCompounded: rate.apyCompounded,
      description: `${adapter.label} — curated Morpho Blue vault. Deposit USDC, earn borrower interest across allocated markets. ERC-4626 withdraw anytime (subject to market liquidity).`,
      depositTarget: adapter.vault,
      positionToken: adapter.vault,
      positionDecimals: 18,
      positionSymbol: 'vault shares',
      liquidity: 'instant',
      riskTier: adapter.id.includes('hy') ? 'emerging' : 'established',
    });
  }

  return out;
}
