# Defiant → RWA Terminal: Phased Build Spec

**Repo:** `marcdems1-create/defiant`
**Current state:** LI.FI-powered tape listing top 50 tokenized stocks/ETFs by market cap (xStocks/Ondo/Backed), 24h % via CoinGecko symbol-match, deployed on Netlify (`defiantlabs`) + Vercel.
**Target:** The default discovery + execution layer for tokenized real-world assets — not another yield dashboard.

---

## Problem Statement

Tokenized RWAs (equities, ETFs, treasuries) are the single most-cited DeFi growth vector for 2026, but the category has no canonical "terminal" — issuers (Ondo, Backed, xStocks) mint the tokens, but nobody owns discovery, reliable pricing, or execution across them. Defiant already has the tape. It's missing: (1) trustworthy market-cap/price data instead of best-effort symbol matching, (2) a way to act on what the tape shows, (3) the cross-chain edge detection that makes it more than a read-only list.

## Non-Goals (all phases)
- Not building a new bridge or DEX aggregator — LI.FI stays the execution rail.
- Not becoming a custodial broker — no holding user funds; wallet-connect + LI.FI routing only.
- Not covering every tokenized-RWA category (real estate, private credit) in v1 — equities/ETFs only until the tape is trusted.
- Not chasing perps/leverage on tokenized stocks — spot only for now.

---

## Phase 1 — Data Layer Integrity (ship first)

**Why first:** Execution and arb features are worthless if the underlying prices/caps are wrong. This is the trust foundation.

**Problem today:** LI.FI `/v1/tokens` returns `priceUSD` only, no market cap. Caps/24h% are backfilled by symbol-matching against CoinGecko's `tokenized-stock` markets list — unparseable/unmatched rows are silently skipped.

**Must-Have (P0):**
- [x] Replace symbol-only matching with a maintained `{chain, contract_address} → {cgeckoId, canonicalSymbol}` mapping table, since symbol collisions across issuers (e.g. multiple wrapped TSLA products) will silently misattribute cap/price. — `lib/lifi/marketCap.ts`, built at fetch time from CoinGecko's own `/coins/list?include_platform=true` joined against the `tokenized-stock` category by CoinGecko's own coin id (no hand-typed addresses).
- [x] Add a staleness flag: if CoinGecko data for a row is older than N minutes, mark it visibly instead of showing a silently frozen number. — `MARKET_DATA_STALE_MINUTES` (15 min) against CoinGecko's own `last_updated`; shown as a "stale" badge in `StockDesk.tsx`.
- [x] Log/surface unmatched rows in an admin view instead of dropping them. — `/admin/stocks` (password-gated), backed by `app/api/admin/stocks-unmatched/route.ts`.
- [x] Add a data-source attribution footer per row (LI.FI price vs. CoinGecko cap). — per-row footer in `StockDesk.tsx`.

**Nice-to-Have (P1):**
- [x] Cross-check LI.FI's priceUSD against CoinGecko's price for the same asset; flag divergence >X% (this is also your future arb signal). — `StockToken#priceDivergencePct` in `lib/lifi/stocks.ts` (`PRICE_DIVERGENCE_FLAG_PCT = 1.5`), surfaced in `/admin/stocks`. This is the *same-chain, cross-source* divergence signal (LI.FI vs. CoinGecko for one token); Phase 3's spread is the *cross-chain* signal (LI.FI vs. itself, across chains) — see Phase 3 below.
- [x] Cache layer (5-15 min TTL) to reduce CoinGecko rate-limit exposure as the token list grows past 50. — 10 min in-memory cache in `lib/lifi/marketCap.ts`.

**Live verification status:** this sandbox's egress policy blocks both `api.coingecko.com`
and `li.quest` directly (confirmed by hand, `curl` gets a 403 from the proxy on both) — same
constraint already logged for `ydaemon.yearn.fi`/`api.curve.finance` in `CLAUDE.md`. The
join has **not** been run against live data yet. `npm run smoke:stocks`
(`scripts/smoke-stock-market-data.mjs`) is the repeatable check for whoever runs it
somewhere with network access — it hits the public `/api/lifi/stocks` route and fails if
the unmatched ratio or stale ratio look structurally wrong rather than like normal coverage
gaps. **Run it (or check `/admin/stocks`) before trusting this mapping table.**

**Future Considerations (P2):**
- [ ] Move off CoinGecko's free tokenized-stock endpoint entirely if it proves unreliable at scale — evaluate a paid market-data provider once there's revenue to justify it.

**Acceptance Criteria:**
- Given a token with no CoinGecko match, when the tape renders, then it shows an explicit "no cap data" state, not an omitted row.
- Given cap data older than the staleness threshold, when displayed, then a visible "stale" indicator appears next to that row.
- `npm run typecheck` passes; no silent catch blocks around parsing failures.

---

## Phase 2 — Execution Layer

**Why second:** Only build this once Phase 1 data is trustworthy — shipping swaps on top of unreliable prices is a liability, not a feature.

**User story:** As a tape viewer, I want to swap directly into a tokenized stock I'm looking at, so I don't have to leave the dashboard to act on what I see.

**Must-Have (P0):**
- [ ] Wallet connect (reuse whatever pattern HYPERFLEX already uses if applicable, for consistency across your products).
- [ ] "Swap" action per row that opens a LI.FI-routed quote (best price/route across Base/Arbitrum/Ethereum) — quote only, explicit confirm step before execution.
- [ ] Clear display of route (which chain, which bridge/DEX hops) before confirming — RWA users will be more risk-averse than degen prediction-market traders, so hiding routing complexity here is the wrong call.
- [ ] Slippage/price-impact warning above a threshold.

**Nice-to-Have (P1):**
- [ ] Post-trade position tracking (holdings view) — this starts to overlap with a portfolio dashboard; keep it minimal (holdings + cost basis) rather than rebuilding a brokerage.
- [ ] Transaction history per wallet.

**Non-Goals (this phase):**
- No limit orders / conditional execution — spot market swaps only.
- No fiat on-ramp — assumes user already holds USDC/stables.

**Acceptance Criteria:**
- Given a user has a connected wallet with sufficient balance, when they confirm a swap, then LI.FI executes and the UI reflects the new position within one refresh cycle.
- Given insufficient balance or a failed quote, when the user attempts a swap, then a specific error state shows (not a generic failure).

> Note: much of Phase 2's Must-Have list (wallet connect via RainbowKit/wagmi, per-row LI.FI-routed swap with an explicit confirm step and route display, price-impact/slippage handling) already exists in the current build — `components/StockDesk.tsx` + `components/StockSwapModal.tsx` + `POST /api/lifi/quote`. Re-check this phase against that code before treating it as unstarted.

---

## Phase 3 — Cross-Chain Arb Detection

**Why third:** This is the differentiator, but it's only valuable once (a) prices are trustworthy (Phase 1) and (b) users can act on signals immediately (Phase 2). Shipping this first would surface arbs users can't trade.

**User story:** As a tape viewer, I want to see when the same tokenized stock is priced differently across chains, so I can capture the spread.

**Non-Goals (this phase):**
- Not a standalone arb bot / auto-execution — surfacing + one-click swap into the flagged leg only, user confirms manually.
- Not covering single-chain-only assets.
- Not modeling bridging time/settlement risk in the displayed spread, and not promising a captured round trip — see the "no cross-chain execution" caveat below.

**Must-Have (P0):**
- [x] **Multi-chain grouping via the Phase 1 address-keyed identity, not symbol matching.** — `lib/lifi/stockArb.ts#computeRawArbRows` groups a token's chain instances by CoinGecko's `cgeckoId` (Phase 1's matched identity), never by ticker. A token with no CoinGecko match cannot appear here — there's no verified identity to group it by.
- [x] **Gross spread computation** — `(highLeg.priceUsd - lowLeg.priceUsd) / lowLeg.priceUsd`, using LI.FI's own per-chain `priceUsd` (CoinGecko has one global price per coin, not a per-chain one, so it isn't the cross-chain signal — Phase 1's `priceDivergencePct` is the cross-*source* signal instead).
- [x] **Liquidity floor filter, using a real LI.FI quote, not a proxy.** — `enrichArbRows` fires one `/v1/quote` per candidate row (top `ARB_ENRICH_LIMIT` by gross spread, to bound calls) for a `$1,000` probe buy of the low leg, and reads back the implied price impact vs. that leg's own listed price. `MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY = 1.5` gates `liquidityOk`. This replaced an earlier version that used CoinGecko's 24h volume as a coarse global proxy — the volume figure is still surfaced as context but no longer gates anything, since a real per-leg quote is exactly the "LI.FI quote depth" the spec asked for.
- [x] **Fee-adjusted net spread** — same probe quote's `protocolFeeUsd` plus the price-impact figure above are both subtracted from gross spread to get `netSpreadPct`. **Caveat the spec doesn't have a clean answer for and this build doesn't paper over:** this app has no cross-chain atomic execution — there is no "sell on the other chain" leg to also quote and net out. `netSpreadPct` therefore only accounts for the cost of *acquiring* the cheap leg, not a full round trip. Treat it as "how much of the raw spread survives buying in," not "guaranteed profit if captured." Documented in `lib/lifi/stockArb.ts` and in-product copy.
- [x] **New "Spread %" column + sort on the main tape.** — `StockDesk.tsx` fetches enriched rows via `useStockArbRows()`, attaches them to matching rows by `cgeckoId`, renders a Spread column (net when verified, gross-and-labeled-unverified otherwise), and adds a "Sort: Spread" pill next to the existing chain/issuer filters.
- [x] **Swap CTA pre-filled with the lower-priced leg** — both the tape's existing per-row "Buy" button and the arb panel's "Buy cheaper leg" route into the existing `StockSwapModal` (Phase 2), pre-filled to the cheap leg's chain/token. No new execution path.
- [x] **Non-executable state: marked, not hidden — chosen and applied consistently.** Two distinct cases, per the acceptance criteria's own split: (1) a *verified* net spread at or below zero is excluded from the result set entirely (matches "excluded... entirely" in the acceptance criteria — at that point there's nothing to show). (2) Positive spread but thin liquidity, or enrichment simply failed/wasn't attempted, stays visible and is clearly marked ("Non-executable" or "Unverified") rather than hidden, consistent with Phase 1's "never silently drop a row."

**Nice-to-Have (P1):**
- [ ] Historical spread sparkline per token (persistent inefficiency vs. one-off).
- [ ] User-configurable alert threshold.
- [ ] Admin view of spread computation inputs, mirroring `/admin/stocks` — not built yet; `npm run smoke:stock-arb` covers the "is the math broken" question in the meantime.

**Future Considerations (P2):**
- [ ] Auto-execution with user-set limits — explicitly out of scope; not designed against.
- [ ] Per-chain gas estimation added to the net figure (only the LI.FI-quoted swap fee + price impact are netted out today, not destination-chain gas).

**Acceptance Criteria:**
- Given a token listed on 2+ chains with sufficient liquidity on both legs, when net spread (after fees) is positive and above the liquidity threshold, then it appears on the tape with a sortable spread % and a working swap CTA. — done, with the "both legs" liquidity check narrowed to the low (buy) leg only — there is no sell-side quote to check the high leg against, per the no-cross-chain-execution caveat above.
- Given a token's gross spread is positive but liquidity is below threshold, when computed, then it does NOT appear in the actionable spread column, OR appears clearly marked non-executable. — **chose: marked, not hidden**, for consistency with Phase 1. Applied the same way in both `StockArbPanel` and the tape's Spread column.
- Given fee-adjusted net spread is negative or zero, when computed, then the token is excluded from the spread column entirely. — done, but only for *verified* net spread (see above) — an unverified row (enrichment not attempted or the quote failed) is not held to this, since its true net spread isn't known.
- Given the underlying CoinGecko/LI.FI mapping is stale, when spread is computed from stale data, then the display inherits/reflects that staleness. — done: `StockArbRow.matchStale` is true when either leg's `capStale` is set, shown as a "stale match" badge.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass clean. — done.
- Smoke-test against live data before merging, the same discipline as Phase 1. — **not done; blocked**, same sandbox network restriction as Phase 1 (see the Phase 1 "Live verification status" note and `CLAUDE.md`). `npm run smoke:stock-arb` (`scripts/smoke-stock-arb.mjs`) automates the internal-consistency half of this (recomputes each row's math from its own legs, checks net ≤ gross, checks the exclusion rule was actually applied) and prints the top rows for the manual eyeball-2-3-known-tokens step this acceptance criterion asks for — that manual step still has to happen by a human (or session) with real network access before trusting the "executable" labels.

## Open Questions (Phase 3, answered by what got built)
- **Engineering — does LI.FI's quote endpoint expose liquidity/depth?** Not directly as a "depth" number, but its quoted output amount for a fixed probe size implies a price-impact figure, which is what got used. Never verified live — see the acceptance-criteria note above.
- **Product — hide or mark illiquid spreads?** Marked, not hidden (see above) — chosen for consistency with Phase 1's data-integrity stance, not re-litigated per row.
- **Data — starting liquidity threshold:** `MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY = 1.5` (percent price impact on a $1,000 probe). A real starting number as the spec asked for, but an arbitrary first guess, not a tuned one — revisit once this has run against live data.

---

## Open Questions
- **Engineering:** Is there an existing wallet-connect implementation from HYPERFLEX worth reusing, or does defiant need its own?
- **Data:** Is CoinGecko's tokenized-stock endpoint rate limit sufficient once the list grows beyond top 50, or does Phase 1 need a paid tier immediately?
- **Legal/Compliance:** Tokenized equities likely carry more regulatory scrutiny than prediction markets — worth a lightweight jurisdiction check before Phase 2 execution ships, even if informal.
- **Product:** Should Phase 2 execution be gated behind a waitlist/soft launch given compliance uncertainty, or open immediately?

## Suggested Timeline
Phase 1 is the only hard dependency — Phases 2 and 3 can be built in parallel once it's stable, since execution and arb detection touch different parts of the stack (wallet/swap UI vs. data/spread computation).
