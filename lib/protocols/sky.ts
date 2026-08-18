import { createPublicClient, http } from 'viem';
import type { Opportunity } from './types';
import { SPARK_PSM, AAVE_V3 } from '@/lib/config/addresses';
import { sparkPsmAbi } from '@/lib/abi/sparkPsm';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApyAnyProject } from './defillama';

function llamaChain(chainId: number): 'Base' | 'Arbitrum' | null {
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

/**
 * Sky sUSDS via the Spark PSM3 on Base and Arbitrum.
 *
 * USDC in / USDC out: `swapExactIn` against the PSM. L2 sUSDS is a plain ERC-20
 * (not ERC-4626) — Spark docs, 2026-08-18. Yield is the Sky protocol rate (SSR),
 * not a number we invent. Skip the card if Llama doesn't return a parseable APY.
 *
 * Do not call this a "savings" product in the UI.
 */
export async function fetchSkyOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const psm = (SPARK_PSM as Record<number, `0x${string}` | undefined>)[chainId];
  const usdc = AAVE_V3[chainId]?.usdc;
  const chain = chains.find((c) => c.id === chainId);
  const llama = llamaChain(chainId);
  if (!psm || !usdc || !chain || !llama) return [];

  const client = createPublicClient({ chain, transport: http() });

  let psmUsdc: `0x${string}`;
  let susds: `0x${string}`;
  try {
    const [readUsdc, readSusds] = await Promise.all([
      client.readContract({ address: psm, abi: sparkPsmAbi, functionName: 'usdc' }),
      client.readContract({ address: psm, abi: sparkPsmAbi, functionName: 'susds' }),
    ]);
    psmUsdc = readUsdc;
    susds = readSusds;
  } catch {
    return [];
  }

  if (psmUsdc.toLowerCase() !== usdc.toLowerCase()) return [];

  const apy = await findDefiLlamaApyAnyProject(
    ['sky-lending', 'makerdao', 'spark'],
    llama,
    (s) => s.includes('SUSDS') || s === 'USDS' || s.includes('SSR'),
  );
  if (apy === null) return [];

  return [
    {
      id: `sky-susds-${chainId}`,
      protocol: 'sky',
      protocolLabel: 'Sky (sUSDS)',
      chainId,
      asset: { address: usdc, symbol: 'USDC', decimals: 6 },
      apy,
      apyCompounded: true,
      description:
        'Swap USDC 1:1 into sUSDS through Spark\'s PSM (no protocol swap fee beyond gas). sUSDS accrues the Sky protocol rate. Swap back to USDC the same way. Not deposit-insured.',
      depositTarget: psm,
      positionToken: susds,
      positionDecimals: 18,
      positionSymbol: 'sUSDS',
      liquidity: 'instant',
      riskTier: 'established',
    },
  ];
}
