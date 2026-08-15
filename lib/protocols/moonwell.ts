import { createPublicClient, http } from 'viem';
import type { Opportunity } from './types';
import { MOONWELL, AAVE_V3 } from '@/lib/config/addresses';
import { moonwellMTokenAbi } from '@/lib/abi/moonwell';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApy } from './defillama';

const SECONDS_PER_DAY = 86_400;
const DAYS_PER_YEAR = 365;

/**
 * Moonwell SDK `calculateApy`: ((ratePerSec * 86400 + 1) ** 365 - 1).
 * Matches the Base APY on moonwell.fi. WELL incentives are claimable
 * separately and are not included.
 */
function supplyRateToApy(ratePerTimestamp: bigint): number | null {
  const ratePerSecond = Number(ratePerTimestamp) / 1e18;
  if (!(ratePerSecond > 0) || !Number.isFinite(ratePerSecond)) return null;
  const apy = (ratePerSecond * SECONDS_PER_DAY + 1) ** DAYS_PER_YEAR - 1;
  if (!(apy > 0) || !Number.isFinite(apy)) return null;
  return apy;
}

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
    apy = supplyRateToApy(rate);
  } catch {
    apy = null;
  }

  if (apy === null) {
    apy = await findDefiLlamaApy('moonwell-lending', 'Base', (s) => s === 'USDC' || s.includes('USDC'));
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
      apyCompounded: true,
      description:
        'Supply USDC to Moonwell on Base (mUSDC). The rate shown is compounded Base APY (borrower interest auto-compounds into mUSDC) — the same figure moonwell.fi labels Supply APY. WELL rewards are a separate claim and are not included. Withdraw underlying anytime.',
      depositTarget: cfg.mUSDC,
      positionToken: cfg.mUSDC,
      positionDecimals: 8,
      positionSymbol: 'mUSDC',
      liquidity: 'instant',
      riskTier: 'emerging',
    },
  ];
}
