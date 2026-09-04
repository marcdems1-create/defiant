import type { Opportunity } from './types';
import { AAVE_V3 } from '@/lib/config/addresses';
import type { SupportedChainId } from '@/lib/wagmi';

const YDAEMON_BASE = 'https://ydaemon.yearn.fi';

/**
 * yDaemon's exact response shape has shifted across versions and this
 * sandbox's network policy blocks reaching ydaemon.yearn.fi to confirm the
 * live shape at write time. Parsing below is deliberately defensive — if the
 * fields we expect aren't present, we skip the vault rather than guess at a
 * number. Smoke-test this against a real vault (e.g. yvUSDC on mainnet) the
 * first time the app runs, per README.
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

export async function fetchYearnOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const usdc = AAVE_V3[chainId]?.usdc;
  if (!usdc) return [];

  let vaults: YDaemonVaultRaw[];
  try {
    const res = await fetch(`${YDAEMON_BASE}/${chainId}/vaults/all`, {
      next: { revalidate: 300 },
    });
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

  const opportunities: Opportunity[] = [];
  for (const v of usdcV3Vaults) {
    const apy = extractApy(v);
    if (apy === null || !v.address) continue;
    opportunities.push({
      id: `yearn-v3-${chainId}-${v.address.toLowerCase()}`,
      protocol: 'yearn-v3',
      protocolLabel: 'Yearn v3',
      chainId,
      asset: {
        address: v.token!.address as `0x${string}`,
        symbol: v.token?.symbol || 'USDC',
        decimals: v.token?.decimals ?? 6,
      },
      apy,
      description: `Deposit USDC into the Yearn v3 vault "${v.symbol ?? v.address}". Yearn auto-routes deposits across underlying strategies to optimize risk-adjusted yield; withdraw anytime via ERC-4626 redeem.`,
      depositTarget: v.address as `0x${string}`,
      positionToken: v.address as `0x${string}`,
      liquidity: 'instant',
      riskTier: 'emerging',
    });
  }

  // Highest APY first — this is a comparison surface, not a ranked endorsement.
  return opportunities.sort((a, b) => b.apy - a.apy);
}
