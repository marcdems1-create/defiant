import { createPublicClient, http, stringToHex } from 'viem';
import { mainnet } from 'wagmi/chains';
import type { Opportunity } from './types';
import { MAPLE } from '@/lib/config/addresses';
import { maplePoolAbi } from '@/lib/abi/maple';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApyAnyProject } from './defillama';

/** Partner tag Maple asks integrators to send with deposits. */
export const MAPLE_DEPOSIT_DATA = stringToHex('0:openhand', { size: 32 });

const MAPLE_GRAPHQL = 'https://api.maple.finance/v2/graphql';

function parseApy(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null;
  // Maple has returned both 0.048 and 4.8-style figures. >1 and ≤100 → percent.
  if (raw > 100) return null;
  const apy = raw > 1 ? raw / 100 : raw;
  if (!(apy > 0) || !Number.isFinite(apy)) return null;
  return apy;
}

async function fetchMaplePoolApy(pool: `0x${string}`): Promise<number | null> {
  try {
    const res = await fetch(MAPLE_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ poolV2(id: "${pool.toLowerCase()}") { apy } }`,
      }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return parseApy(json?.data?.poolV2?.apy);
  } catch {
    return null;
  }
}

/**
 * Maple syrupUSDC — institutional credit, USDC in, delayed FIFO exit.
 * Addresses from Maple's own Ethereum integration docs (2026-08-18).
 * Deposit is SyrupRouter (permissioned: first-time wallets must authorize on
 * syrup.fi). Withdraw is PoolV2.requestRedeem — not a plain ERC-4626 redeem.
 */
export async function fetchMapleOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const cfg = (MAPLE as Record<number, (typeof MAPLE)[typeof mainnet.id] | undefined>)[chainId];
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !chain) return [];

  const client = createPublicClient({ chain, transport: http() });
  try {
    const underlying = await client.readContract({
      address: cfg.pool,
      abi: maplePoolAbi,
      functionName: 'asset',
    });
    if (underlying.toLowerCase() !== cfg.usdc.toLowerCase()) return [];
  } catch {
    return [];
  }

  let apy = await fetchMaplePoolApy(cfg.pool);
  if (apy === null) {
    apy = await findDefiLlamaApyAnyProject(
      ['maple', 'syrup'],
      'Ethereum',
      (s) => s.includes('SYRUPUSDC') || s.includes('SYRUP'),
    );
  }
  if (apy === null) {
    apy = await findDefiLlamaApyAnyProject(
      ['maple', 'syrup'],
      'Ethereum',
      (s) => s.includes('USDC'),
      (meta) => meta.toLowerCase().includes('syrup'),
    );
  }
  if (apy === null) return [];

  return [
    {
      id: `maple-syrupusdc-${chainId}`,
      protocol: 'maple',
      protocolLabel: 'Maple (syrupUSDC)',
      chainId,
      asset: { address: cfg.usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description:
        'Deposit USDC into Maple\'s syrupUSDC pool (institutional private credit). Withdrawals enter a FIFO queue — often hours to a couple of days, and Maple documents waits of up to 30 days when liquidity is tight. First-time wallets must complete Maple\'s lender authorization on syrup.fi.',
      depositTarget: cfg.router,
      positionToken: cfg.pool,
      positionDecimals: 18,
      positionSymbol: 'syrupUSDC',
      liquidity: 'delayed',
      riskTier: 'emerging',
    },
  ];
}

export type MapleLenderStatus = 'authorized' | 'unauthorized' | 'unknown';

export async function fetchMapleLenderStatus(
  address: `0x${string}`,
): Promise<MapleLenderStatus> {
  try {
    const res = await fetch(MAPLE_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query GetMapleAccount($accountId: ID!) { account(id: $accountId) { isSyrupLender } }`,
        variables: { accountId: address.toLowerCase() },
      }),
    });
    if (!res.ok) return 'unknown';
    const json = await res.json();
    const flag = json?.data?.account?.isSyrupLender;
    if (flag === true) return 'authorized';
    if (flag === false || json?.data?.account == null) return 'unauthorized';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export interface MaplePositionStatus {
  redeemRequested: boolean;
  availableShares: string | null;
  availableBalance: string | null;
}

export async function fetchMaplePositionStatus(
  address: `0x${string}`,
  pool: `0x${string}`,
): Promise<MaplePositionStatus | null> {
  try {
    const res = await fetch(MAPLE_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query GetMapleAccount($accountId: ID!, $poolId: String!) {
          account(id: $accountId) {
            poolV2Positions(where: { pool: $poolId }) {
              availableBalance
              availableShares
              redeemRequested
            }
          }
        }`,
        variables: {
          accountId: address.toLowerCase(),
          poolId: pool.toLowerCase(),
        },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const row = json?.data?.account?.poolV2Positions?.[0];
    if (!row) return { redeemRequested: false, availableShares: null, availableBalance: null };
    return {
      redeemRequested: Boolean(row.redeemRequested),
      availableShares: typeof row.availableShares === 'string' ? row.availableShares : null,
      availableBalance: typeof row.availableBalance === 'string' ? row.availableBalance : null,
    };
  } catch {
    return null;
  }
}
