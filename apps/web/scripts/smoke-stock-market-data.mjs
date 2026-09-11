#!/usr/bin/env node

/**
 * Live smoke test for the tokenized-stock CoinGecko<->LI.FI address join
 * (BUILD_SPEC Phase 1). This sandbox's egress policy blocks both
 * api.coingecko.com and li.quest directly, so the join has never been run
 * against live data — this script is the repeatable check for whoever runs it
 * somewhere with network access (a dev machine, CI, or against production).
 *
 * Hits the public, unauthenticated `/api/lifi/stocks` route (no admin session
 * needed) and checks the shape of what comes back.
 *
 * Recalibrated 2026-09-06 against real production output: CoinGecko's `tokenized-stock`
 * category covers only a fraction of the individual-equity long tail that LI.FI's catalog
 * actually lists (Ondo Global Markets + xStocks + Backed between them wrap most of the US
 * equity universe; CoinGecko's category tracks maybe 100-150 of those names). A large
 * unmatched ratio is therefore the *expected*, healthy state, not a sign the join is
 * broken — the original 50% ceiling was tripping on normal coverage gaps. The actual
 * failure mode this check should catch is the join mechanism itself being wrong (e.g.
 * CoinGecko's `/coins/list?include_platform=true` platform id strings assumed here —
 * "ethereum", "base", "arbitrum-one" — not matching what the live endpoint returns), which
 * shows up as *zero or near-zero* matches on a catalog with many classified rows, not as a
 * merely-high unmatched ratio. See `/admin/stocks` for exactly which rows are unmatched.
 */

const DEFAULT_WWW_URL = 'https://www.openhand.online/';
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 3;

// A high unmatched ratio alone is expected (see note above) and no longer fails the
// check by itself. This ceiling only catches the pathological case: almost nothing
// matching at all, which is what a genuinely broken join (wrong platform-id strings,
// wrong endpoint shape) actually looks like.
const MAX_UNMATCHED_RATIO = 0.97;
// Below this many classified rows, a ratio check is too noisy either way — fall back to
// the absolute floor below instead.
const MIN_ROWS_FOR_RATIO_CHECK = 20;
// On a catalog large enough for the ratio check to mean anything, matching fewer than
// this many rows outright (regardless of ratio) means the join found almost nothing —
// that's the real "it's broken" signal, not a percentage.
const MIN_ABSOLUTE_MATCHES = 5;
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
        `above the ${(MAX_UNMATCHED_RATIO * 100).toFixed(0)}% ceiling. A high ratio is normally expected ` +
        '(CoinGecko\'s tokenized-stock category is much narrower than LI.FI\'s catalog) — this high a ratio ' +
        'suggests the join has nearly stopped working, not just a coverage gap. Check /admin/stocks and the ' +
        'platform-id mapping in lib/lifi/marketCap.ts.',
    );
  }

  if (tokens.length >= MIN_ROWS_FOR_RATIO_CHECK && matched.length < MIN_ABSOLUTE_MATCHES) {
    failures.push(
      `Only ${matched.length} of ${tokens.length} classified rows matched a CoinGecko cap — too few in ` +
        'absolute terms for a catalog this size, regardless of ratio. Likely a broken join (wrong platform-id ' +
        'strings, or the CoinGecko endpoint shape changed) rather than a normal coverage gap. Check ' +
        '/admin/stocks and lib/lifi/marketCap.ts.',
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
