import type { PublicClient } from 'viem';
import { ERC4626Adapter } from '../erc4626/ERC4626Adapter';
import { USDC } from '../addresses';
import type { Address, RateQuote } from '../types';

const YDAEMON_BASE = 'https://ydaemon.yearn.fi';

/**
 * yDaemon's exact response shape has shifted across versions, and hasn't
 * been confirmed against the live endpoint from every sandbox this repo has
 * been built in — see apps/web's original lib/protocols/yearn.ts and
 * CLAUDE.md. Parsing below is deliberately defensive: skip the vault rather
 * than guess a number.
 */
interface YDaemonVaultRaw {
  address?: string;
  symbol?: string;
  decimals?: number;
  version?: string;
  token?: { address?: string; symbol?: string; decimals?: number };
  apr?: {
    netAPR?: number;
    forwardAPR?: { netAPR?: number };
  };
}

function extractApy(v: YDaemonVaultRaw): number | null {
  const forward = v.apr?.forwardAPR?.netAPR;
  if (typeof forward === 'number' && forward > 0) return forward;
  const net = v.apr?.netAPR;
  if (typeof net === 'number' && net > 0) return net;
  return null;
}

/**
 * A single Yearn v3 USDC vault. Unlike Morpho/Fluid, Yearn's vault set is
 * discovered dynamically from yDaemon rather than configured statically, so
 * `getRate()` returns the APY captured at discovery time (`discoverYearnAdapters`)
 * instead of re-fetching yDaemon's whole vault list on every call.
 */
export class YearnAdapter extends ERC4626Adapter {
  private readonly rate: RateQuote | null;

  constructor(
    cfg: { id: string; chainId: number; vault: Address; asset: Address },
    rate: RateQuote | null,
    client?: PublicClient,
  ) {
    super({ ...cfg, protocol: 'yearn-v3' }, client);
    this.rate = rate;
  }

  async getRate(): Promise<RateQuote | null> {
    return this.rate;
  }
}

/**
 * Fetches yDaemon's vault list once and returns one YearnAdapter per USDC
 * v3 vault found. Returns `[]` on any fetch/parse failure or if this chain
 * has no configured USDC — never a guessed vault.
 */
export async function discoverYearnAdapters(
  chainId: number,
  client?: PublicClient,
): Promise<YearnAdapter[]> {
  const usdc = USDC[chainId];
  if (!usdc) return [];

  let vaults: YDaemonVaultRaw[];
  try {
    const res = await fetch(`${YDAEMON_BASE}/${chainId}/vaults/all`);
    if (!res.ok) return [];
    vaults = await res.json();
    if (!Array.isArray(vaults)) return [];
  } catch {
    return [];
  }

  const usdcV3Vaults = vaults.filter(
    (v) =>
      v.version?.startsWith('3') &&
      v.token?.address?.toLowerCase() === usdc.toLowerCase() &&
      v.address,
  );

  const adapters: { adapter: YearnAdapter; apy: number }[] = [];
  for (const v of usdcV3Vaults) {
    const apy = extractApy(v);
    if (apy === null || !v.address) continue;
    const vault = v.address as Address;
    adapters.push({
      adapter: new YearnAdapter(
        { id: `yearn-v3-${chainId}-${vault.toLowerCase()}`, chainId, vault, asset: usdc },
        { apy },
        client,
      ),
      apy,
    });
  }

  // Highest APY first — this is a comparison surface, not a ranked endorsement.
  return adapters.sort((a, b) => b.apy - a.apy).map((row) => row.adapter);
}
