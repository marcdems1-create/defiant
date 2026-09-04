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

**Must-Have (P0):**
- [x] For tokens listed on multiple chains, compute live spread and surface it, sorted highest-first. — `lib/lifi/stockArb.ts#computeStockArbRows`, rendered by `components/StockArbPanel.tsx` inside `StockDesk`. Groups chain instances by CoinGecko's `cgeckoId` (Phase 1's matched identity) rather than by ticker — see the module doc comment for why. Compares LI.FI's own `priceUsd` across a token's chain instances (CoinGecko has one global spot price per coin, not a per-chain one, so it isn't the signal here — Phase 1's `priceDivergencePct` is the cross-*source* signal instead; this is cross-*chain*).
- [x] Minimum-liquidity filter. — `MIN_24H_VOLUME_USD` (CoinGecko 24h volume as a coarse proxy; **not** on-chain DEX depth on either leg's chain — no per-chain liquidity source exists in this app yet). Rows below it are kept visible but marked "Non-executable" with the trade button disabled, per the acceptance criteria's "excluded or clearly marked" — marking was chosen over exclusion to stay consistent with Phase 1's "never silently drop a row" fix.
- [x] Direct link into the Phase 2 swap flow pre-filled with the higher-spread leg. — "Buy cheaper leg" opens `StockSwapModal` pre-filled with the lower-priced chain instance (the actionable side, since this app has no cross-chain atomic execution to also auto-sell the expensive leg).

**Nice-to-Have (P1):**
- [ ] Historical spread chart per token (is this a persistent inefficiency or a one-off).
- [ ] Alert/notification when a tracked token's spread crosses a user-set threshold.

**Acceptance Criteria:**
- Given a token trades on 2+ chains, when spread exceeds the liquidity-adjusted threshold, then it's surfaced and sortable on the main tape. — done (sorted by spread desc; "sortable column" was built as a ranked panel rather than a sortable table column since the main tape is one-row-per-symbol-per-chain-filter and arb needs the un-collapsed cross-chain view — see `StockArbPanel`).
- Given a spread is below available liquidity to execute profitably after fees/slippage, when computed, then it is excluded or clearly marked non-executable. — done, marked (see above). Not yet verified against live data (same sandbox network block as Phase 1) or against real per-chain liquidity — the 24h-volume proxy is a known simplification, not a real depth check.

---

## Open Questions
- **Engineering:** Is there an existing wallet-connect implementation from HYPERFLEX worth reusing, or does defiant need its own?
- **Data:** Is CoinGecko's tokenized-stock endpoint rate limit sufficient once the list grows beyond top 50, or does Phase 1 need a paid tier immediately?
- **Legal/Compliance:** Tokenized equities likely carry more regulatory scrutiny than prediction markets — worth a lightweight jurisdiction check before Phase 2 execution ships, even if informal.
- **Product:** Should Phase 2 execution be gated behind a waitlist/soft launch given compliance uncertainty, or open immediately?

## Suggested Timeline
Phase 1 is the only hard dependency — Phases 2 and 3 can be built in parallel once it's stable, since execution and arb detection touch different parts of the stack (wallet/swap UI vs. data/spread computation).
