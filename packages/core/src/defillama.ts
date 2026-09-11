/**
 * Shared APY lookup against DeFiLlama's public yields API. Defensive:
 * missing/odd shapes → null; caller skips the opportunity rather than
 * guessing a number.
 *
 * A focused copy of the relevant parts of
 * apps/web/lib/protocols/defillama.ts, not a move: that file's other
 * consumers (Compound, Moonwell, Sky, Maple) aren't part of this adapter
 * extraction batch yet, so it can't be deleted there yet without breaking
 * them. Once every DeFiLlama-dependent protocol is migrated into
 * packages/core, apps/web's copy becomes dead and should be deleted —
 * tracked in CLAUDE.md so this duplication doesn't linger unnoticed.
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
}

let cachedPools: Promise<DefiLlamaPool[]> | null = null;

async function fetchPools(): Promise<DefiLlamaPool[]> {
  try {
    // No Next.js `next: { revalidate }` cache hint here on purpose — this
    // package is framework-agnostic and shouldn't couple to Next's fetch
    // extension. apps/web's own (still-live, non-migrated) copy of this
    // fetch keeps `revalidate: 300`; callers of this copy that care about
    // request-level caching should memoize `getRate()` themselves.
    const res = await fetch(DEFILLAMA_POOLS_ENDPOINT);
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

async function findDefiLlamaApy(
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
