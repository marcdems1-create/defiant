import { getAddress, isAddress } from 'viem';
import { AAVE_V3 } from '@/lib/config/addresses';

/**
 * LI.FI production API. Stocks are ordinary tokens on this catalog — there is
 * no public `stock` tag (docs: only `stablecoin` is documented) so we classify
 * by issuer naming, then quote through the same /v1/quote path as any swap.
 *
 * https://docs.li.fi/api-reference/fetch-all-known-tokens
 * https://docs.li.fi/api-reference/get-a-quote-for-a-token-transfer
 * https://li.fi/knowledge-hub/lifi-the-distribution-layer-of-tokenized-stocks
 */
export const LIFI_API_URL = 'https://li.quest';

/** Integrator string for LI.FI routing analytics. Not a fee recipient. */
export const LIFI_INTEGRATOR = 'openhand';

/** Default slippage for stock swaps (0.5%). Shown in the quote UI. */
export const LIFI_STOCK_SLIPPAGE = 0.005;

/** EVM chains already in this app. Tokenized stocks are mainnet-only. */
export const STOCK_CHAIN_IDS = [1, 8453, 42161] as const;
export type StockChainId = (typeof STOCK_CHAIN_IDS)[number];

export const STOCK_CHAIN_LABELS: Record<StockChainId, string> = {
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum',
};

export function isStockChainId(value: number): value is StockChainId {
  return (STOCK_CHAIN_IDS as readonly number[]).includes(value);
}

export function stockChainLabel(chainId: number): string {
  return isStockChainId(chainId) ? STOCK_CHAIN_LABELS[chainId] : `Chain ${chainId}`;
}

/** Circle USDC on each stock chain — from the verified AAVE_V3 map. */
export function usdcOnStockChain(chainId: StockChainId): `0x${string}` | undefined {
  const usdc = AAVE_V3[chainId]?.usdc;
  if (!usdc || !isAddress(usdc)) return undefined;
  return getAddress(usdc);
}

export function lifiApiHeaders(): HeadersInit {
  const key = process.env.LIFI_API_KEY?.trim();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) headers['x-lifi-api-key'] = key;
  return headers;
}
