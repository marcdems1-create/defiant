import { createPublicClient, http } from 'viem';
import type { Opportunity } from './types';
import { MOONWELL, AAVE_V3 } from '@/lib/config/addresses';
import { moonwellMTokenAbi } from '@/lib/abi/moonwell';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApy } from './defillama';

const SECONDS_PER_YEAR = 31_536_000;

export async function fetchMoonwellOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const cfg = (MOONWELL as Record<number, { mUSDC: `0x${string}` }>)[chainId];
  const usdc = AAVE_V3[chainId]?.usdc;
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !usdc || !chain) return [];

  const client = createPublicClient({ chain, transport: http() });

  let apy: number | null = null;
  try {
    const rate = await client.readContract({
      address: cfg.mUSDC,
      abi: moonwellMTokenAbi,
      functionName: 'supplyRatePerTimestamp',
    });
    apy = (Number(rate) / 1e18) * SECONDS_PER_YEAR;
    if (!(apy > 0)) apy = null;
  } catch {
    apy = null;
  }

  if (apy === null) {
    apy = await findDefiLlamaApy('moonwell', 'Base', (s) => s === 'USDC' || s.includes('USDC'));
  }
  if (apy === null) return [];

  return [
    {
      id: `moonwell-usdc-${chainId}`,
      protocol: 'moonwell',
      protocolLabel: 'Moonwell USDC',
      chainId,
      asset: { address: usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description:
        'Supply USDC to Moonwell on Base (mUSDC). Floating supply APY; withdraw underlying anytime. Base-native lending market.',
      depositTarget: cfg.mUSDC,
      positionToken: cfg.mUSDC,
      positionDecimals: 8,
      positionSymbol: 'mUSDC',
      liquidity: 'instant',
      riskTier: 'emerging',
    },
  ];
}
