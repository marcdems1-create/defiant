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

export async function findDefiLlamaApy(
  project: string,
  chain: string,
  matchesSymbol: (symbol: string) => boolean,
  matchesMeta?: (meta: string) => boolean,
): Promise<number | null> {
  if (!cachedPools) cachedPools = fetchPools();
  const pools = await cachedPools;

  const hit = pools.find((p) => {
    if (p.project !== project || p.chain !== chain) return false;
    if (typeof p.symbol !== 'string' || !matchesSymbol(p.symbol.toUpperCase())) return false;
    if (matchesMeta) {
      const meta = (p.poolMeta ?? '').toString();
      return matchesMeta(meta);
    }
    return true;
  });

  return readApy(hit);
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
