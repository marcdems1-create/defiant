import type { Opportunity } from './types';
import { FLUID, AAVE_V3 } from '@/lib/config/addresses';
import type { SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApyAnyProject } from './defillama';

function chainLabel(chainId: number): 'Base' | 'Arbitrum' | null {
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

export async function fetchFluidOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const cfg = (FLUID as Record<number, { fUSDC: `0x${string}` }>)[chainId];
  const usdc = AAVE_V3[chainId]?.usdc;
  const llamaChain = chainLabel(chainId);
  if (!cfg || !usdc || !llamaChain) return [];

  const apy = await findDefiLlamaApyAnyProject(
    ['fluid-lending', 'fluid', 'instadapp'],
    llamaChain,
    (s) => s === 'USDC' || s.includes('USDC'),
  );
  if (apy === null) return [];

  return [
    {
      id: `fluid-usdc-${chainId}`,
      protocol: 'fluid',
      protocolLabel: 'Fluid USDC',
      chainId,
      asset: { address: usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description:
        'Deposit USDC into Fluid (Instadapp) fUSDC — unified liquidity layer earning lending yield. ERC-4626 redeem anytime subject to liquidity.',
      risk: 'medium',
      depositTarget: cfg.fUSDC,
      positionToken: cfg.fUSDC,
    },
  ];
}
