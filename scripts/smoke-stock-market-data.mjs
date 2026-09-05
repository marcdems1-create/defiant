#!/usr/bin/env node

/**
 * Live smoke test for the tokenized-stock CoinGecko<->LI.FI address join
 * (BUILD_SPEC Phase 1). This sandbox's egress policy blocks both
 * api.coingecko.com and li.quest directly, so the join has never been run
 * against live data — this script is the repeatable check for whoever runs it
 * somewhere with network access (a dev machine, CI, or against production).
 *
 * Hits the public, unauthenticated `/api/lifi/stocks` route (no admin session
 * needed) and checks the shape of what comes back. A HANDFUL of unmatched
 * rows is expected (thin/delisted names, non-EVM issuance) — see
 * `/admin/stocks` for exactly which ones. A LARGE fraction unmatched, or
 * every row unmatched, means the join itself is broken (e.g. CoinGecko's
 * `/coins/list?include_platform=true` platform id strings assumed here —
 * "ethereum", "base", "arbitrum-one" — do not match what the live endpoint
 * actually returns), not that CoinGecko simply lacks the data.
 */

const DEFAULT_WWW_URL = 'https://www.openhand.online/';
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 3;

// If more than this fraction of classified rows have no CoinGecko cap match,
// treat it as a broken join rather than normal coverage gaps.
const MAX_UNMATCHED_RATIO = 0.5;
// If more than this fraction of matched rows are flagged stale immediately
// after a fresh fetch, CoinGecko's `last_updated` parsing is likely broken.
const MAX_STALE_RATIO = 0.5;

async function main() {
  const wwwUrl = new URL(process.env.OPENHAND_SMOKE_WWW_URL ?? DEFAULT_WWW_URL);
  const endpoint = new URL('/api/lifi/stocks', wwwUrl.origin).toString();
  const failures = [];

  const res = await fetchWithRetries(endpoint, { redirect: 'follow' });
  if (res.status !== 200) {
    console.error(`FAIL: ${endpoint} returned ${res.status}`);
    process.exit(1);
  }

  const json = await res.json();
  const tokens = Array.isArray(json.tokens) ? json.tokens : null;
  if (!tokens) {
    console.error(`FAIL: ${endpoint} did not return a tokens array.`);
    process.exit(1);
  }

  if (tokens.length === 0) {
    failures.push(
      'Catalog is empty. Either LI.FI /v1/tokens returned nothing parseable, or every row failed classification. Check lib/lifi/stocks.ts.',
    );
  }

  const matched = tokens.filter((t) => typeof t.marketCapUsd === 'number' && t.marketCapUsd > 0);
  const unmatched = tokens.length - matched.length;
  const unmatchedRatio = tokens.length > 0 ? unmatched / tokens.length : 0;
  const stale = matched.filter((t) => t.capStale === true);
  const staleRatio = matched.length > 0 ? stale.length / matched.length : 0;

  const badPrice = tokens.filter((t) => !(typeof t.priceUsd === 'number' && t.priceUsd > 0));
  if (badPrice.length > 0) {
    failures.push(`${badPrice.length} row(s) have a non-positive or missing priceUsd.`);
  }

  const badCap = tokens.filter(
    (t) => t.marketCapUsd !== undefined && !(typeof t.marketCapUsd === 'number' && t.marketCapUsd > 0),
  );
  if (badCap.length > 0) {
    failures.push(`${badCap.length} row(s) have a marketCapUsd present but not a positive number.`);
  }

  if (tokens.length > 0 && unmatchedRatio > MAX_UNMATCHED_RATIO) {
    failures.push(
      `${unmatched}/${tokens.length} rows (${(unmatchedRatio * 100).toFixed(0)}%) have no CoinGecko cap match — ` +
        `above the ${(MAX_UNMATCHED_RATIO * 100).toFixed(0)}% threshold for "expected coverage gaps." ` +
        'Check /admin/stocks and the platform-id mapping in lib/lifi/marketCap.ts.',
    );
  }

  if (matched.length > 0 && staleRatio > MAX_STALE_RATIO) {
    failures.push(
      `${stale.length}/${matched.length} matched rows (${(staleRatio * 100).toFixed(0)}%) are flagged stale on a ` +
        'fresh fetch — check last_updated parsing in lib/lifi/marketCap.ts.',
    );
  }

  console.log(`Catalog rows: ${tokens.length}`);
  console.log(`Matched to a CoinGecko cap: ${matched.length}`);
  console.log(`Unmatched: ${unmatched} (${(unmatchedRatio * 100).toFixed(1)}%)`);
  console.log(`Stale among matched: ${stale.length} (${(staleRatio * 100).toFixed(1)}%)`);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exit(1);
  }

  console.log('Smoke check passed.');
}

async function fetchWithRetries(url, options) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      await sleep(attempt * 1000);
    }
  }
  throw new Error(`Request failed for ${url}: ${lastError?.message ?? 'Unknown error'}`);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();
