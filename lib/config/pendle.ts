/**
 * Pendle V2 — battle-tested Principal Token (PT) markets only.
 *
 * Market addresses are NOT hardcoded (they expire). Live markets come from
 * Pendle's official API: GET https://api-v2.pendle.finance/core/v2/markets/all
 * (https://docs.pendle.finance/pendle-v2-dev/Backend/ApiOverview), 2026-08-18.
 *
 * We keep a name/protocol allowlist so the catalog does not pick up every
 * points-farm or looping market. Router calls go through the Hosted SDK
 * Convert API (POST /v3/sdk/{chainId}/convert); always use `tx.to` from that
 * response — Router V4 at 0x888888888889758F76e7103c6CbF23ABbF58F946 is
 * upgradeable (Pendle docs).
 *
 * YT (leveraged yield) and LP are intentionally not listed.
 */
export const PENDLE_API = 'https://api-v2.pendle.finance/core';

/** Pendle Hosted SDK native-ETH sentinel (docs convert examples). */
export const PENDLE_NATIVE_ETH =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

/** 1% — same order as Curve min-out in this app. */
export const PENDLE_SLIPPAGE = 0.01;

export const PENDLE_MIN_TVL_USD = 1_000_000;
export const PENDLE_MIN_DAYS_TO_EXPIRY = 14;

export interface PendleAllowlisted {
  /** Exact `name` field from Pendle's markets API. */
  name: string;
  /** Exact `protocol` field from Pendle's markets API. */
  protocol: string;
  kind: 'stable' | 'eth';
  risk: 'established' | 'emerging';
}

/**
 * Underlyings that have been Pendle's core books across many expiries —
 * not whatever currently has the highest implied APY.
 */
export const PENDLE_ALLOWLIST: readonly PendleAllowlisted[] = [
  { name: 'sUSDS', protocol: 'Sky Protocol', kind: 'stable', risk: 'established' },
  { name: 'sUSDe', protocol: 'Ethena', kind: 'stable', risk: 'emerging' },
  { name: 'USDe', protocol: 'Ethena', kind: 'stable', risk: 'emerging' },
  { name: 'wstETH', protocol: 'Lido', kind: 'eth', risk: 'established' },
];
