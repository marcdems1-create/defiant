import { createPublicClient, http } from 'viem';
import type { Opportunity } from './types';
import { PANOPTIC, AAVE_V3 } from '@/lib/config/addresses';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApyAnyProject } from './defillama';

/**
 * Panoptic Unicorn USDC vault — automated third-party options/vol strategy.
 * Address from Panoptic's own deployment docs
 * (https://panoptic.xyz/docs/contracts/deployment-addresses), 2026-08-18.
 * Ethereum mainnet only. Skip the card if `asset()` is not USDC or APY cannot
 * be parsed as the Unicorn pool — do not invent a vol-selling number, and do
 * not reuse some other Panoptic USDC pool's APY.
 */
export async function fetchPanopticUnicornApy(): Promise<number | null> {
  const byName = await findDefiLlamaApyAnyProject(
    ['panoptic', 'panoptic-v2'],
    'Ethereum',
    (s) => s.includes('UNICORN'),
  );
  if (byName !== null) return byName;
  return findDefiLlamaApyAnyProject(
    ['panoptic', 'panoptic-v2'],
    'Ethereum',
    (s) => s.includes('USDC'),
    (m) => m.toUpperCase().includes('UNICORN'),
  );
}

export async function fetchPanopticOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const cfg = (PANOPTIC as Record<number, { unicornUsdc: `0x${string}` } | undefined>)[chainId];
  const usdc = AAVE_V3[chainId]?.usdc;
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !usdc || !chain) return [];

  const client = createPublicClient({ chain, transport: http() });
  let shareDecimals = 18;
  try {
    const [underlying, decimals] = await Promise.all([
      client.readContract({
        address: cfg.unicornUsdc,
        abi: erc4626Abi,
        functionName: 'asset',
      }),
      client.readContract({
        address: cfg.unicornUsdc,
        abi: erc4626Abi,
        functionName: 'decimals',
      }),
    ]);
    if (underlying.toLowerCase() !== usdc.toLowerCase()) return [];
    if (typeof decimals === 'number' && decimals > 0 && decimals <= 18) {
      shareDecimals = decimals;
    }
  } catch {
    return [];
  }

  const apy = await fetchPanopticUnicornApy();
  if (apy === null) return [];

  return [
    {
      id: `panoptic-unicorn-${chainId}`,
      protocol: 'panoptic',
      protocolLabel: 'Panoptic (Unicorn USDC)',
      chainId,
      asset: { address: usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description:
        'Deposit USDC into Panoptic\'s Unicorn vault, a third-party automated strategy that lends USDC and runs options/volatility trades. Yield is not a money-market rate — you can lose USDC. Withdraw via ERC-4626, subject to vault liquidity.',
      depositTarget: cfg.unicornUsdc,
      positionToken: cfg.unicornUsdc,
      positionDecimals: shareDecimals,
      positionSymbol: 'vault shares',
      liquidity: 'instant',
      riskTier: 'emerging',
    },
  ];
}
