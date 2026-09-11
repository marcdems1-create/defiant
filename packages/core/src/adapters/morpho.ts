import type { PublicClient } from 'viem';
import { ERC4626Adapter } from '../erc4626/ERC4626Adapter';
import { MORPHO, USDC, type MorphoVaultConfig } from '../addresses';
import { findDefiLlamaApyAnyProject } from '../defillama';
import type { Address, RateQuote } from '../types';

function llamaChain(chainId: number): 'Base' | 'Arbitrum' | null {
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

async function fetchMorphoVaultApy(vault: Address, chainId: number): Promise<number | null> {
  try {
    const res = await fetch('https://api.morpho.org/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ vaultByAddress(address: "${vault}", chainId: ${chainId}) { state { netApy apy } } }`,
      }),
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

export class MorphoAdapter extends ERC4626Adapter {
  readonly label: string;
  private readonly defiLlamaSymbol: string;
  private readonly llamaChainLabel: string | null;

  constructor(
    cfg: { id: string; chainId: number; vault: Address; asset: Address; label: string; defiLlamaSymbol: string },
    client?: PublicClient,
  ) {
    super({ id: cfg.id, chainId: cfg.chainId, vault: cfg.vault, asset: cfg.asset, protocol: 'morpho' }, client);
    this.label = cfg.label;
    this.defiLlamaSymbol = cfg.defiLlamaSymbol;
    this.llamaChainLabel = llamaChain(cfg.chainId);
  }

  async getRate(): Promise<RateQuote | null> {
    const apy = await fetchMorphoVaultApy(this.vault, this.chainId);
    if (apy !== null) return { apy };

    if (!this.llamaChainLabel) return null;
    const fallback = await findDefiLlamaApyAnyProject(
      ['morpho-blue'],
      this.llamaChainLabel,
      (s) => s === this.defiLlamaSymbol,
    );
    return fallback !== null ? { apy: fallback } : null;
  }
}

/** Static per-chain vault config (unlike Yearn, no discovery fetch needed). */
export function createMorphoAdapters(chainId: number, client?: PublicClient): MorphoAdapter[] {
  const vaults: MorphoVaultConfig[] | undefined = MORPHO[chainId];
  const usdc = USDC[chainId];
  if (!vaults || !usdc) return [];

  return vaults.map(
    (v) =>
      new MorphoAdapter(
        {
          id: `morpho-${v.id}-${chainId}`,
          chainId,
          vault: v.vault,
          asset: usdc,
          label: v.label,
          defiLlamaSymbol: v.defiLlamaSymbol,
        },
        client,
      ),
  );
}
