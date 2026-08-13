import { LIDO } from '@/lib/config/addresses';
import type { SupportedChainId } from '@/lib/wagmi';
import type { Opportunity } from './types';

const LIDO_APR_ENDPOINT = 'https://eth-api.lido.fi/v1/protocol/steth/apr/sma';

/**
 * Lido only deploys stETH on Ethereum mainnet (and its testnets) — there is
 * no L2 deployment, so this returns [] on Base/Arbitrum.
 */
export async function fetchLidoOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const cfg = (LIDO as Record<number, (typeof LIDO)[keyof typeof LIDO]>)[chainId];
  if (!cfg) return [];

  const apy = await fetchLidoApy();
  if (apy === null) return [];

  return [
    {
      id: `lido-${chainId}-steth`,
      protocol: 'lido',
      protocolLabel: 'Lido',
      chainId,
      asset: {
        address: cfg.stETH,
        symbol: 'ETH',
        decimals: 18,
      },
      apy,
      description:
        'Stake ETH with Lido and receive stETH, which accrues staking rewards daily via rebase. Withdrawals go through a request queue and typically take 1-5 days to become claimable — not instant.',
      depositTarget: cfg.stETH,
      positionToken: cfg.stETH,
    },
  ];
}

async function fetchLidoApy(): Promise<number | null> {
  try {
    const res = await fetch(LIDO_APR_ENDPOINT, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    const smaApr: unknown = json?.data?.smaApr;
    if (typeof smaApr !== 'number' || Number.isNaN(smaApr)) return null;
    return smaApr / 100;
  } catch {
    return null;
  }
}
