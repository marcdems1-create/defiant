import { createPublicClient, http } from 'viem';
import { AAVE_V3 } from '@/lib/config/addresses';
import { uiPoolDataProviderAbi } from '@/lib/abi/aavePool';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import type { Opportunity } from './types';

const RAY = 10n ** 27n;
const SECONDS_PER_YEAR = 31_536_000;

/** Aave's liquidityRate is a per-second linear rate expressed in ray (1e27). */
function liquidityRateToApy(liquidityRate: bigint): number {
  const apr = Number(liquidityRate) / Number(RAY);
  return (1 + apr / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1;
}

export async function fetchAaveOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const cfg = AAVE_V3[chainId];
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !chain) return [];

  const client = createPublicClient({ chain, transport: http() });

  const [reserves] = await client.readContract({
    address: cfg.uiPoolDataProvider,
    abi: uiPoolDataProviderAbi,
    functionName: 'getReservesData',
    args: [cfg.poolAddressesProvider],
  });

  const usdcReserve = reserves.find(
    (r) => r.underlyingAsset.toLowerCase() === cfg.usdc.toLowerCase(),
  );
  if (!usdcReserve || !usdcReserve.isActive || usdcReserve.isFrozen) return [];

  return [
    {
      id: `aave-v3-${chainId}-usdc`,
      protocol: 'aave-v3',
      protocolLabel: 'Aave v3',
      chainId,
      asset: {
        address: cfg.usdc,
        symbol: usdcReserve.symbol || 'USDC',
        decimals: Number(usdcReserve.decimals),
      },
      apy: liquidityRateToApy(usdcReserve.liquidityRate),
      description: `Supply USDC to Aave v3 on ${chain.name} and earn variable interest paid by borrowers. Withdraw anytime, subject to available pool liquidity.`,
      risk: 'lower',
      depositTarget: cfg.pool,
      positionToken: usdcReserve.aTokenAddress,
    },
  ];
}
