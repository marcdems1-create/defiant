import { createPublicClient, http } from 'viem';
import type { Opportunity } from './types';
import { COMPOUND_V3, AAVE_V3 } from '@/lib/config/addresses';
import { compoundCometAbi } from '@/lib/abi/compoundComet';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApy } from './defillama';

const SECONDS_PER_YEAR = 31_536_000;

function chainLabel(chainId: number): 'Base' | 'Arbitrum' | null {
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

export async function fetchCompoundOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const cfg = (COMPOUND_V3 as Record<number, { comet: `0x${string}` }>)[chainId];
  const usdc = AAVE_V3[chainId]?.usdc;
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !usdc || !chain) return [];

  const client = createPublicClient({ chain, transport: http() });

  let apy: number | null = null;
  try {
    const utilization = await client.readContract({
      address: cfg.comet,
      abi: compoundCometAbi,
      functionName: 'getUtilization',
    });
    const supplyRate = await client.readContract({
      address: cfg.comet,
      abi: compoundCometAbi,
      functionName: 'getSupplyRate',
      args: [utilization],
    });
    // supplyRate is per-second, 1e18-scaled
    apy = (Number(supplyRate) / 1e18) * SECONDS_PER_YEAR;
    if (!(apy > 0)) apy = null;
  } catch {
    apy = null;
  }

  if (apy === null) {
    const llamaChain = chainLabel(chainId);
    if (llamaChain) {
      apy = await findDefiLlamaApy('compound-v3', llamaChain, (s) => s === 'USDC' || s.includes('USDC'));
    }
  }
  if (apy === null) return [];

  return [
    {
      id: `compound-v3-${chainId}`,
      protocol: 'compound-v3',
      protocolLabel: 'Compound V3',
      chainId,
      asset: { address: usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description:
        'Supply USDC to Compound III (Comet). Earn the floating supply APY; withdraw anytime. Battle-tested lending market on L2.',
      risk: 'lower',
      depositTarget: cfg.comet,
      positionToken: cfg.comet,
    },
  ];
}
