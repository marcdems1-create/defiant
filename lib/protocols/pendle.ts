import { mainnet } from 'wagmi/chains';
import { AAVE_V3 } from '@/lib/config/addresses';
import {
  PENDLE_ALLOWLIST,
  PENDLE_API,
  PENDLE_MIN_DAYS_TO_EXPIRY,
  PENDLE_MIN_TVL_USD,
  PENDLE_NATIVE_ETH,
  type PendleAllowlisted,
} from '@/lib/config/pendle';
import type { SupportedChainId } from '@/lib/wagmi';
import type { Opportunity } from './types';

interface PendleMarketRaw {
  name?: string;
  protocol?: string;
  address?: string;
  chainId?: number;
  expiry?: string;
  pt?: string;
  details?: { impliedApy?: unknown; totalTvl?: unknown; liquidity?: unknown };
}

function parseIdAddress(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string') return null;
  const hex = value.includes('-') ? value.slice(value.indexOf('-') + 1) : value;
  if (!/^0x[a-fA-F0-9]{40}$/.test(hex)) return null;
  return hex as `0x${string}`;
}

function allowlisted(market: PendleMarketRaw): PendleAllowlisted | undefined {
  const name = market.name;
  const protocol = market.protocol;
  if (!name || !protocol) return undefined;
  return PENDLE_ALLOWLIST.find((row) => row.name === name && row.protocol === protocol);
}

function tvlUsd(market: PendleMarketRaw): number {
  const n = market.details?.totalTvl ?? market.details?.liquidity;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function impliedApy(market: PendleMarketRaw): number | null {
  const n = market.details?.impliedApy;
  if (typeof n !== 'number' || Number.isNaN(n) || n <= 0) return null;
  // Pendle returns a decimal (0.048 = 4.8%). Reject percent-style > 1
  // unless it is a plausible 1–100 figure we can divide — same stance as Maple.
  if (n > 1 && n <= 100) return n / 100;
  if (n > 1) return null;
  return n;
}

function expiryMs(market: PendleMarketRaw): number | null {
  if (typeof market.expiry !== 'string') return null;
  const ms = Date.parse(market.expiry);
  return Number.isFinite(ms) ? ms : null;
}

async function fetchPendleMarketPages(): Promise<PendleMarketRaw[]> {
  const out: PendleMarketRaw[] = [];
  try {
    for (let skip = 0; skip < 1000; skip += 100) {
      const res = await fetch(`${PENDLE_API}/v2/markets/all?skip=${skip}&limit=100`, {
        headers: { 'user-agent': 'Openhand/1.0' },
        next: { revalidate: 300 },
      });
      if (!res.ok) break;
      const json = await res.json();
      const rows = Array.isArray(json?.results)
        ? json.results
        : Array.isArray(json?.markets)
          ? json.markets
          : [];
      if (!Array.isArray(rows) || rows.length === 0) break;
      out.push(...rows);
      const total = typeof json?.total === 'number' ? json.total : out.length;
      if (rows.length < 100 || out.length >= total) break;
    }
  } catch {
    return [];
  }
  return out;
}

function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Pendle PT cards for allowlisted, unexpired markets with a parseable implied
 * APY. Skip rather than guess. Mainnet books only — Pendle's live depth is
 * not on our default testnets.
 */
export async function fetchPendleOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  if (chainId !== mainnet.id) return [];
  const usdc = AAVE_V3[chainId]?.usdc;
  if (!usdc) return [];

  const markets = await fetchPendleMarketPages();
  if (markets.length === 0) return [];

  const minExpiry = Date.now() + PENDLE_MIN_DAYS_TO_EXPIRY * 24 * 60 * 60 * 1000;
  const picked: Opportunity[] = [];

  for (const market of markets) {
    if (market.chainId !== chainId) continue;
    const meta = allowlisted(market);
    if (!meta) continue;
    const apy = impliedApy(market);
    const exp = expiryMs(market);
    const pt = parseIdAddress(market.pt);
    const marketAddr = parseIdAddress(market.address);
    if (apy === null || exp === null || !pt || !marketAddr) continue;
    if (exp < minExpiry) continue;
    if (tvlUsd(market) < PENDLE_MIN_TVL_USD) continue;

    const expiryLabel = formatExpiry(exp);
    const isEth = meta.kind === 'eth';
    picked.push({
      id: `pendle-pt-${meta.name.toLowerCase()}-${chainId}-${marketAddr.slice(2, 10)}`,
      protocol: 'pendle',
      protocolLabel: `Pendle PT · ${meta.name}`,
      chainId,
      asset: isEth
        ? { address: PENDLE_NATIVE_ETH, symbol: 'ETH', decimals: 18 }
        : { address: usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description: isEth
        ? `Buy Pendle principal tokens on the ${meta.name} market (expires ${expiryLabel}). Implied APY is the discount if you hold to maturity — not a lending rate. Selling early is an AMM swap with slippage. Openhand does not list YT.`
        : `Buy Pendle principal tokens on the ${meta.name} market (expires ${expiryLabel}) with USDC. Implied APY is the discount if you hold to maturity — not a money-market rate. Selling early is an AMM swap with slippage. Openhand does not list YT.`,
      depositTarget: marketAddr,
      positionToken: pt,
      positionDecimals: 18,
      positionSymbol: `PT-${meta.name}`,
      liquidity: 'instant',
      riskTier: meta.risk,
      pendle: {
        market: marketAddr,
        pt,
        expiryMs: exp,
        name: meta.name,
      },
    });
  }

  return picked.sort((a, b) => b.apy - a.apy);
}
