/**
 * Shared APY lookup against DeFiLlama's public yields API.
 * Defensive: missing/odd shapes → null; caller skips the opportunity.
 */

const DEFILLAMA_POOLS_ENDPOINT = 'https://yields.llama.fi/pools';

interface DefiLlamaPool {
  pool?: string;
  project?: string;
  chain?: string;
  symbol?: string;
  poolMeta?: string | null;
  apy?: number;
  apyBase?: number;
  apyReward?: number;
}

let cachedPools: Promise<DefiLlamaPool[]> | null = null;

async function fetchPools(): Promise<DefiLlamaPool[]> {
  try {
    const res = await fetch(DEFILLAMA_POOLS_ENDPOINT, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function readApy(hit: DefiLlamaPool | undefined): number | null {
  const apy = hit?.apy ?? hit?.apyBase;
  if (typeof apy !== 'number' || Number.isNaN(apy) || apy <= 0) return null;
  return apy / 100;
}

export async function findDefiLlamaPool(
  project: string,
  chain: string,
  matchesSymbol: (symbol: string) => boolean,
  matchesMeta?: (meta: string) => boolean,
): Promise<DefiLlamaPool | undefined> {
  if (!cachedPools) cachedPools = fetchPools();
  const pools = await cachedPools;

  return pools.find((p) => {
    if (p.project !== project || p.chain !== chain) return false;
    if (typeof p.symbol !== 'string' || !matchesSymbol(p.symbol.toUpperCase())) return false;
    if (matchesMeta) {
      const meta = (p.poolMeta ?? '').toString();
      return matchesMeta(meta);
    }
    return true;
  });
}

export async function findDefiLlamaApy(
  project: string,
  chain: string,
  matchesSymbol: (symbol: string) => boolean,
  matchesMeta?: (meta: string) => boolean,
): Promise<number | null> {
  return readApy(await findDefiLlamaPool(project, chain, matchesSymbol, matchesMeta));
}

export interface ApyHistoryPoint {
  timestamp: number;
  apy: number;
}

/**
 * Daily APY series from DeFiLlama. `preferBase` uses apyBase (borrower interest)
 * and skips reward-inflated `apy` — same stance as our live Moonwell number.
 * Parse-failure / empty → [] so the chart can hide instead of guessing.
 */
export async function fetchDefiLlamaApyHistory(
  poolId: string,
  preferBase: boolean,
): Promise<ApyHistoryPoint[]> {
  try {
    const res = await fetch(`https://yields.llama.fi/chart/${poolId}`);
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json?.data;
    if (!Array.isArray(rows)) return [];

    const points: ApyHistoryPoint[] = [];
    for (const row of rows) {
      const raw = preferBase
        ? (typeof row?.apyBase === 'number' ? row.apyBase : row?.apy)
        : (typeof row?.apy === 'number' ? row.apy : row?.apyBase);
      if (typeof raw !== 'number' || Number.isNaN(raw) || raw < 0) continue;
      const ts = Date.parse(typeof row?.timestamp === 'string' ? row.timestamp : '');
      if (!Number.isFinite(ts)) continue;
      points.push({ timestamp: ts, apy: raw / 100 });
    }
    return points;
  } catch {
    return [];
  }
}

/** Prefer matching several project slugs (Morpho/Fluid naming drifts on Llama). */
export async function findDefiLlamaApyAnyProject(
  projects: string[],
  chain: string,
  matchesSymbol: (symbol: string) => boolean,
  matchesMeta?: (meta: string) => boolean,
): Promise<number | null> {
  for (const project of projects) {
    const apy = await findDefiLlamaApy(project, chain, matchesSymbol, matchesMeta);
    if (apy !== null) return apy;
  }
  return null;
}
