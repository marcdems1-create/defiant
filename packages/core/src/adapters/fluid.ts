import type { PublicClient } from 'viem';
import { ERC4626Adapter } from '../erc4626/ERC4626Adapter';
import { FLUID, USDC } from '../addresses';
import { findDefiLlamaApyAnyProject } from '../defillama';
import type { Address, RateQuote } from '../types';

function llamaChain(chainId: number): 'Base' | 'Arbitrum' | null {
  if (chainId === 8453) return 'Base';
  if (chainId === 42161) return 'Arbitrum';
  return null;
}

export class FluidAdapter extends ERC4626Adapter {
  private readonly llamaChainLabel: string | null;

  constructor(cfg: { id: string; chainId: number; vault: Address; asset: Address }, client?: PublicClient) {
    super({ ...cfg, protocol: 'fluid' }, client);
    this.llamaChainLabel = llamaChain(cfg.chainId);
  }

  async getRate(): Promise<RateQuote | null> {
    if (!this.llamaChainLabel) return null;
    const apy = await findDefiLlamaApyAnyProject(
      ['fluid-lending', 'fluid', 'instadapp'],
      this.llamaChainLabel,
      (s) => s === 'USDC' || s.includes('USDC'),
    );
    return apy !== null ? { apy } : null;
  }
}

export function createFluidAdapter(chainId: number, client?: PublicClient): FluidAdapter | null {
  const cfg = FLUID[chainId];
  const usdc = USDC[chainId];
  if (!cfg || !usdc) return null;

  return new FluidAdapter({ id: `fluid-usdc-${chainId}`, chainId, vault: cfg.fUSDC, asset: usdc }, client);
}
