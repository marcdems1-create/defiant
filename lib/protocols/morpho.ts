import type { Opportunity } from './types';
import { MORPHO, AAVE_V3 } from '@/lib/config/addresses';
import type { SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApyAnyProject } from './defillama';

function chainLabel(chainId: number): 'Base' | 'Arbitrum' | null {
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

export async function fetchMorphoOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const vaults = (MORPHO as Record<number, readonly {
    id: string;
    label: string;
    vault: `0x${string}`;
    poolMeta: string;
  }[]>)[chainId];
  const usdc = AAVE_V3[chainId]?.usdc;
  const llamaChain = chainLabel(chainId);
  if (!vaults || !usdc || !llamaChain) return [];

  const out: Opportunity[] = [];

  for (const v of vaults) {
    const apy = await findDefiLlamaApyAnyProject(
      ['morpho-v1', 'morpho-blue', 'morpho'],
      llamaChain,
      (s) => s.includes('USDC'),
      (meta) => {
        const m = meta.toLowerCase();
        if (v.id.includes('hy')) {
          return m.includes('high yield') || m.includes('high-yield');
        }
        if (v.id.includes('gauntlet')) {
          return m.includes('gauntlet') && (m.includes('prime') || m.length > 0);
        }
        if (v.id.includes('steakhouse') && !v.id.includes('hy')) {
          return (
            m.includes('steakhouse') &&
            !m.includes('high yield') &&
            !m.includes('high-yield')
          );
        }
        return false;
      },
    );

    if (apy === null) continue;

    out.push({
      id: `morpho-${v.id}-${chainId}`,
      protocol: 'morpho',
      protocolLabel: `Morpho · ${v.label}`,
      chainId,
      asset: { address: usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description: `${v.label} — curated Morpho Blue vault. Deposit USDC, earn borrower interest across allocated markets. ERC-4626 withdraw anytime (subject to market liquidity).`,
      depositTarget: v.vault,
      positionToken: v.vault,
      positionDecimals: 18,
      positionSymbol: 'vault shares',
      liquidity: 'instant',
      riskTier: v.id.includes('hy') ? 'emerging' : 'established',
    });
  }

  return out;
}
