import { getAddress, isAddress } from 'viem';
import {
  LIFI_API_URL,
  LIFI_INTEGRATOR,
  LIFI_STOCK_SLIPPAGE,
  STOCK_CHAIN_IDS,
  isStockChainId,
  lifiApiHeaders,
  usdcOnStockChain,
  type StockChainId,
} from '@/lib/config/lifi';
import { fetchTokenizedStockMarketCaps } from '@/lib/lifi/marketCap';

export type StockIssuer = 'xstocks' | 'ondo' | 'backed';

export const STOCK_ISSUER_LABEL: Record<StockIssuer, string> = {
  xstocks: 'xStocks',
  ondo: 'Ondo',
  backed: 'Backed',
};

export interface StockToken {
  id: string;
  chainId: StockChainId;
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  issuer: StockIssuer;
  /** LI.FI last price. Omitted from the catalog when unparseable — never guessed. */
  priceUsd: number;
  /**
   * CoinGecko tokenized-stock market cap in USD, when a symbol match parses.
   * Token cap, not the listed company's equity cap. Omitted rather than guessed.
   */
  marketCapUsd?: number;
  logoURI?: string;
}

/** Dashboard tape length — top names by parseable market cap, not a featured pick. */
export const STOCK_TAPE_SIZE = 50;

const CHAIN_PREFERENCE: StockChainId[] = [8453, 42161, 1];

export interface LifiQuote {
  chainId: StockChainId;
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  gas?: bigint;
  approvalAddress: `0x${string}`;
  fromAmount: bigint;
  toAmount: bigint;
  toAmountMin: bigint;
  toSymbol: string;
  toDecimals: number;
  tool?: string;
  /** LI.FI's own quoted fee in USD, if they reported one. */
  protocolFeeUsd?: number;
}

interface RawToken {
  address?: unknown;
  chainId?: unknown;
  symbol?: unknown;
  name?: unknown;
  decimals?: unknown;
  priceUSD?: unknown;
  logoURI?: unknown;
}

function parsePriceUsd(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return n;
}

function parseDecimals(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > 18) return null;
  return n;
}

/**
 * Classify a LI.FI catalog row as a tokenized equity/ETF from a known issuer.
 * Skip (return null) when the name/symbol is ambiguous — do not guess.
 */
export function classifyStockIssuer(name: string, symbol: string): StockIssuer | null {
  const n = name.trim().toLowerCase();
  const s = symbol.trim();
  if (!n || !s) return null;
  if (/mirror|poison\.|potion|evk vault/i.test(n)) return null;
  if (/^wb/i.test(s) || /^wt/i.test(s)) return null;
  if (n.includes('xstock')) return 'xstocks';
  if (n.includes('ondo tokenized')) return 'ondo';
  if (n.startsWith('backed ') && /^b[A-Z0-9]{1,6}$/i.test(s)) return 'backed';
  return null;
}

function toStockToken(raw: RawToken): StockToken | null {
  const chainId = typeof raw.chainId === 'number' ? raw.chainId : Number(raw.chainId);
  if (!isStockChainId(chainId)) return null;
  if (typeof raw.address !== 'string' || !isAddress(raw.address)) return null;
  if (typeof raw.symbol !== 'string' || typeof raw.name !== 'string') return null;
  const issuer = classifyStockIssuer(raw.name, raw.symbol);
  if (!issuer) return null;
  const decimals = parseDecimals(raw.decimals);
  const priceUsd = parsePriceUsd(raw.priceUSD);
  if (decimals === null || priceUsd === null) return null;
  let address: `0x${string}`;
  try {
    address = getAddress(raw.address);
  } catch {
    return null;
  }
  const symbol = raw.symbol.trim();
  const logoURI = typeof raw.logoURI === 'string' && raw.logoURI.startsWith('https://')
    ? raw.logoURI
    : undefined;
  return {
    id: `${chainId}-${address.toLowerCase()}`,
    chainId,
    address,
    symbol,
    name: raw.name.trim(),
    decimals,
    issuer,
    priceUsd,
    logoURI,
  };
}

export async function fetchStockCatalog(): Promise<StockToken[]> {
  const qs = new URLSearchParams({
    chains: STOCK_CHAIN_IDS.join(','),
    chainTypes: 'EVM',
  });
  const res = await fetch(`${LIFI_API_URL}/v1/tokens?${qs.toString()}`, {
    headers: lifiApiHeaders(),
    next: { revalidate: 120 },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { tokens?: Record<string, RawToken[]> };
  const byChain = json?.tokens;
  if (!byChain || typeof byChain !== 'object') return [];

  const out: StockToken[] = [];
  const seen = new Set<string>();
  for (const id of STOCK_CHAIN_IDS) {
    const rows = byChain[String(id)];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const token = toStockToken({ ...row, chainId: id });
      if (!token || seen.has(token.id)) continue;
      seen.add(token.id);
      out.push(token);
    }
  }
  out.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.chainId - b.chainId);
  return out;
}

/** Attach CoinGecko caps onto an already-classified LI.FI catalog. Skip unparseable caps. */
export async function withStockMarketCaps(tokens: StockToken[]): Promise<StockToken[]> {
  if (tokens.length === 0) return tokens;
  const caps = await fetchTokenizedStockMarketCaps();
  const out = tokens.map((token) => {
    const cap = caps.get(token.symbol.toLowerCase());
    return cap !== undefined ? { ...token, marketCapUsd: cap } : token;
  });
  out.sort(compareStockTape);
  return out;
}

/** When every chain is in view, keep one row per ticker (Base, then Arbitrum, then Ethereum). */
export function preferOneChainPerSymbol(
  tokens: StockToken[],
  chainId: StockChainId | 'all',
): StockToken[] {
  if (chainId !== 'all') return tokens.filter((t) => t.chainId === chainId);
  const rank = new Map(CHAIN_PREFERENCE.map((id, i) => [id, i]));
  const best = new Map<string, StockToken>();
  for (const token of tokens) {
    const key = token.symbol.toLowerCase();
    const prev = best.get(key);
    if (!prev) {
      best.set(key, token);
      continue;
    }
    const nextRank = rank.get(token.chainId) ?? 99;
    const prevRank = rank.get(prev.chainId) ?? 99;
    if (nextRank < prevRank) best.set(key, token);
  }
  return [...best.values()];
}

export function compareStockTape(a: StockToken, b: StockToken): number {
  const aCap = a.marketCapUsd;
  const bCap = b.marketCapUsd;
  if (aCap !== undefined && bCap !== undefined && aCap !== bCap) return bCap - aCap;
  if (aCap !== undefined && bCap === undefined) return -1;
  if (aCap === undefined && bCap !== undefined) return 1;
  return a.symbol.localeCompare(b.symbol) || a.chainId - b.chainId;
}

function parseAmount(raw: unknown): bigint | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    try {
      return BigInt(Math.trunc(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw !== 'string' || !/^(0x[0-9a-fA-F]+|\d+)$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function fetchLifiQuote(params: {
  chainId: StockChainId;
  fromToken: `0x${string}`;
  toToken: `0x${string}`;
  fromAmount: bigint;
  fromAddress: `0x${string}`;
}): Promise<LifiQuote | null> {
  const qs = new URLSearchParams({
    fromChain: String(params.chainId),
    toChain: String(params.chainId),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount.toString(),
    fromAddress: params.fromAddress,
    integrator: LIFI_INTEGRATOR,
    slippage: String(LIFI_STOCK_SLIPPAGE),
  });
  const res = await fetch(`${LIFI_API_URL}/v1/quote?${qs.toString()}`, {
    headers: lifiApiHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  return parseLifiQuote(json, params.chainId);
}

function parseLifiQuote(json: Record<string, unknown>, chainId: StockChainId): LifiQuote | null {
  const tx = json.transactionRequest;
  const estimate = json.estimate;
  const action = json.action;
  if (!tx || typeof tx !== 'object' || !estimate || typeof estimate !== 'object') return null;
  const txRec = tx as Record<string, unknown>;
  const est = estimate as Record<string, unknown>;
  const act = action && typeof action === 'object' ? (action as Record<string, unknown>) : {};
  const toToken = act.toToken && typeof act.toToken === 'object'
    ? (act.toToken as Record<string, unknown>)
    : {};

  const to = typeof txRec.to === 'string' && isAddress(txRec.to) ? getAddress(txRec.to) : null;
  const data = typeof txRec.data === 'string' && txRec.data.startsWith('0x') ? txRec.data as `0x${string}` : null;
  const approvalRaw =
    typeof est.approvalAddress === 'string' && isAddress(est.approvalAddress)
      ? getAddress(est.approvalAddress)
      : to;
  const fromAmount = parseAmount(est.fromAmount);
  const toAmount = parseAmount(est.toAmount);
  const toAmountMin = parseAmount(est.toAmountMin);
  const value = parseAmount(txRec.value) ?? 0n;
  const gas = parseAmount(txRec.gasLimit ?? txRec.gas);
  const toSymbol = typeof toToken.symbol === 'string' ? toToken.symbol : undefined;
  const toDecimals = parseDecimals(toToken.decimals);

  if (!to || !data || !approvalRaw || fromAmount === null || toAmount === null || toAmountMin === null) {
    return null;
  }
  if (!toSymbol || toDecimals === null) return null;

  let protocolFeeUsd: number | undefined;
  const feeCosts = est.feeCosts;
  if (Array.isArray(feeCosts)) {
    let sum = 0;
    let any = false;
    for (const fee of feeCosts) {
      if (!fee || typeof fee !== 'object') continue;
      const usd = parsePriceUsd((fee as Record<string, unknown>).amountUSD);
      if (usd === null) continue;
      sum += usd;
      any = true;
    }
    if (any) protocolFeeUsd = sum;
  }

  return {
    chainId,
    to,
    data,
    value,
    gas: gas && gas > 0n ? gas : undefined,
    approvalAddress: approvalRaw,
    fromAmount,
    toAmount,
    toAmountMin,
    toSymbol,
    toDecimals,
    tool: typeof json.tool === 'string' ? json.tool : undefined,
    protocolFeeUsd,
  };
}

export function isUsdcOnChain(chainId: StockChainId, token: `0x${string}`): boolean {
  const usdc = usdcOnStockChain(chainId);
  return Boolean(usdc && usdc.toLowerCase() === token.toLowerCase());
}
