#!/usr/bin/env node

/**
 * Live smoke test for Phase 3 + Phase 3b cross-chain spread detection
 * (lib/lifi/stockArb.ts, /api/lifi/stock-arb). Depends on the Phase 1 join being sound —
 * run `npm run smoke:stocks` first.
 *
 * This sandbox blocks both api.coingecko.com and li.quest outright, so none of this has
 * run against live data (see CLAUDE.md). This script checks internal consistency (the
 * math is self-coherent) automatically; it cannot replace the acceptance criterion's
 * manual step — eyeball the printed rows against LI.FI's own UI/quote for 2-3 known
 * multi-chain tokens before trusting the "round-trip verified" numbers.
 *
 * Phase 3b contract: every row returned by the endpoint is already round-trip verified
 * (a buy quote AND a cross-chain bridge/sell quote both cleared the liquidity gate, and
 * netSpreadPct > 0). There is no "unverified" or "non-executable" row anymore — a
 * candidate that doesn't clear all of that is dropped server-side, not marked. So this
 * script's job is narrower than Phase 3's first version: every row it sees should already
 * look like a real opportunity; it checks that the math behind that claim holds up.
 */

const DEFAULT_WWW_URL = 'https://www.openhand.online/';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

// A spread past this magnitude is more likely a bug (wrong chain matched, bad
// price parse) than a real tokenized-stock arb — flag it rather than trust it.
const SANITY_CEILING_PCT = 50;

async function main() {
  const wwwUrl = new URL(process.env.OPENHAND_SMOKE_WWW_URL ?? DEFAULT_WWW_URL);
  const endpoint = new URL('/api/lifi/stock-arb', wwwUrl.origin).toString();
  const failures = [];

  const res = await fetchWithRetries(endpoint, { redirect: 'follow' });
  if (res.status !== 200) {
    console.error(`FAIL: ${endpoint} returned ${res.status}`);
    process.exit(1);
  }

  const json = await res.json();
  const rows = Array.isArray(json.rows) ? json.rows : null;
  if (!rows) {
    console.error(`FAIL: ${endpoint} did not return a rows array.`);
    process.exit(1);
  }

  console.log(`Round-trip-verified arb rows: ${rows.length}`);
  if (rows.length === 0) {
    console.log(
      'Zero rows is not necessarily a failure — round-trip verification is a high bar ' +
        '(both legs must clear the liquidity gate AND net spread must be positive). Confirm ' +
        'this is really "no opportunities right now" and not every candidate silently ' +
        'erroring out (e.g. a broken cross-chain quote param) before treating it as healthy.',
    );
  }

  for (const row of rows) {
    if (!row.lowLeg || !row.highLeg || typeof row.grossSpreadPct !== 'number') {
      failures.push(`Row ${row.symbol ?? '<unknown>'} is missing legs or grossSpreadPct.`);
      continue;
    }
    if (row.lowLeg.chainId === row.highLeg.chainId) {
      failures.push(`Row ${row.symbol}: lowLeg and highLeg are the same chain (${row.lowLeg.chainId}).`);
    }
    if (!(row.lowLeg.priceUsd > 0) || !(row.highLeg.priceUsd > 0)) {
      failures.push(`Row ${row.symbol}: non-positive leg price.`);
    }
    const recomputedGross = ((row.highLeg.priceUsd - row.lowLeg.priceUsd) / row.lowLeg.priceUsd) * 100;
    if (Math.abs(recomputedGross - row.grossSpreadPct) > 0.05) {
      failures.push(
        `Row ${row.symbol}: reported grossSpreadPct=${row.grossSpreadPct.toFixed(2)} does not match ` +
          `recomputed ${recomputedGross.toFixed(2)} from its own legs.`,
      );
    }
    if (row.grossSpreadPct > SANITY_CEILING_PCT) {
      failures.push(
        `Row ${row.symbol}: grossSpreadPct=${row.grossSpreadPct.toFixed(2)}% exceeds the ${SANITY_CEILING_PCT}% ` +
          'sanity ceiling — verify this is a real spread, not a wrong-chain match or bad price parse.',
      );
    }
    if (typeof row.netSpreadPct !== 'number') {
      failures.push(`Row ${row.symbol}: missing netSpreadPct — every returned row must be round-trip verified.`);
    } else {
      if (row.netSpreadPct <= 0) {
        failures.push(`Row ${row.symbol}: netSpreadPct <= 0 should have been dropped server-side, not returned.`);
      }
      if (row.netSpreadPct > row.grossSpreadPct + 0.01) {
        failures.push(
          `Row ${row.symbol}: netSpreadPct (${row.netSpreadPct.toFixed(2)}) exceeds grossSpreadPct ` +
            `(${row.grossSpreadPct.toFixed(2)}) — fees/impact on both legs should only reduce it.`,
        );
      }
    }
    if (typeof row.buyLegPriceImpactPct !== 'number' || typeof row.bridgeLegPriceImpactPct !== 'number') {
      failures.push(`Row ${row.symbol}: missing buyLegPriceImpactPct/bridgeLegPriceImpactPct diagnostics.`);
    }
  }

  console.log('\nTop rows (eyeball these against LI.FI directly before trusting them):');
  for (const row of rows.slice(0, 5)) {
    console.log(
      `  ${row.symbol}: ${row.lowLeg.chainId}@$${row.lowLeg.priceUsd} -> ${row.highLeg.chainId}@$${row.highLeg.priceUsd} ` +
        `(via ${row.bridgeTool ?? 'unknown route'}) | gross ${row.grossSpreadPct.toFixed(2)}% | round-trip net ${row.netSpreadPct.toFixed(2)}%`,
    );
  }

  if (failures.length > 0) {
    console.error('');
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nInternal-consistency checks passed. Still eyeball the printed rows by hand.');
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
