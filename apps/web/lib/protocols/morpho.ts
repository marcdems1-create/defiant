import type { Opportunity } from './types';
import { MORPHO, AAVE_V3 } from '@/lib/config/addresses';
import type { SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApyAnyProject } from './defillama';

function chainLabel(chainId: number): 'Base' | 'Arbitrum' | null {
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

async function fetchMorphoVaultApy(
  vault: `0x${string}`,
  chainId: SupportedChainId,
): Promise<number | null> {
  try {
    const res = await fetch('https://api.morpho.org/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ vaultByAddress(address: "${vault}", chainId: ${chainId}) { state { netApy apy } } }`,
      }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const state = json?.data?.vaultByAddress?.state;
    const apy = state?.netApy ?? state?.apy;
    if (typeof apy !== 'number' || Number.isNaN(apy) || apy <= 0) return null;
    return apy;
  } catch {
    return null;
  }
}

export async function fetchMorphoOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const vaults = (MORPHO as Record<number, readonly {
    id: string;
    label: string;
    vault: `0x${string}`;
    defiLlamaSymbol: string;
  }[]>)[chainId];
  const usdc = AAVE_V3[chainId]?.usdc;
  const llamaChain = chainLabel(chainId);
  if (!vaults || !usdc || !llamaChain) return [];

  const out: Opportunity[] = [];

  for (const v of vaults) {
    let apy = await fetchMorphoVaultApy(v.vault, chainId);

    if (apy === null) {
      apy = await findDefiLlamaApyAnyProject(
        ['morpho-blue'],
        llamaChain,
        (s) => s === v.defiLlamaSymbol,
      );
    }

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
