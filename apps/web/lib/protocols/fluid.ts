import { createFluidAdapter } from '@defiant/core';
import type { Opportunity } from './types';
import type { SupportedChainId } from '@/lib/wagmi';

/**
 * Bridges @defiant/core's FluidAdapter to this app's Opportunity catalog
 * shape. Phase 2 adapter extraction: the address config and DeFiLlama
 * rate-fetch logic now live in packages/core/src/adapters/fluid.ts.
 */
export async function fetchFluidOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const adapter = createFluidAdapter(chainId);
  if (!adapter) return [];

  const rate = await adapter.getRate();
  if (rate === null) return [];

  return [
    {
      id: adapter.id,
      protocol: 'fluid',
      protocolLabel: 'Fluid USDC',
      chainId,
      asset: { address: adapter.asset, symbol: 'USDC', decimals: 6 },
      apy: rate.apy,
      apyCompounded: rate.apyCompounded,
      description:
        'Deposit USDC into Fluid (Instadapp) fUSDC — unified liquidity layer earning lending yield. ERC-4626 redeem anytime subject to liquidity.',
      depositTarget: adapter.vault,
      positionToken: adapter.vault,
      liquidity: 'instant',
      riskTier: 'emerging',
    },
  ];
}
