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

> **Superseded by Phase 3b, below.** This section's net spread only ever verified the buy
> leg — there was no sell or bridge quote, so the "Spread %" label above materially
> overstated what had actually been checked. Phase 3b fixed the number (a real,
> quote-verified round trip) and the acceptance criteria immediately above are now
> satisfied more strictly than as originally written (e.g. the "excluded... entirely" rule
> now applies to *any* verification failure, not only a negative net spread). Left in place
> for the history of what "liquidity gate" and "net spread" meant before that fix, since
> the module doc comment in `lib/lifi/stockArb.ts` refers back to it.

## Open Questions (Phase 3, answered by what got built)
- **Engineering — does LI.FI's quote endpoint expose liquidity/depth?** Not directly as a "depth" number, but its quoted output amount for a fixed probe size implies a price-impact figure, which is what got used. Never verified live — see the acceptance-criteria note above.
- **Product — hide or mark illiquid spreads?** Marked, not hidden (see above) — chosen for consistency with Phase 1's data-integrity stance, not re-litigated per row. **Revised in Phase 3b** — see below.
- **Data — starting liquidity threshold:** `MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY = 1.5` (percent price impact on a $1,000 probe). A real starting number as the spec asked for, but an arbitrary first guess, not a tuned one — revisit once this has run against live data.

---

## Phase 3b — Round-Trip Spread Verification

**Why:** Phase 3's net spread only verified the buy leg. With no cross-chain execution in
the app, the displayed "opportunity" wasn't actually capturable end-to-end — showing
"Spread %" for a number that only checked half the trip was presenting an unverified claim
as a verified one. This phase closes that gap before the feature is trusted as actionable.

**Non-Goals:** No auto-execution of the full round trip (still manual, user-confirmed
per leg). No guaranteed-atomic capture — sequential two-leg execution with normal
settlement risk between legs is acceptable; the goal is *quoted and verified*, not
*guaranteed profitable regardless of timing*. Two-leg (cheap chain → expensive chain)
only, no N-chain triangular arb.

**Round-trip model — resolved by asking, not assuming:** the spec flagged this as
consequential and unresolved ("does 'round trip' mean bridge the actual asset, or does the
user need independent capital on both chains already?") and asked for it to be pinned down
before implementation. Asked; the answer was **bridge the actual purchased token**: the
second probe is a single LI.FI *cross-chain* quote (`fromChain` = the cheap leg's chain,
`toChain` = the expensive leg's chain, `fromToken` = the token just bought, `toToken` =
USDC on the expensive chain), using the first quote's own `toAmount` as the input. LI.FI's
own routing picks the bridge+swap path, so its output already nets out bridge cost and
sell-side slippage in one number — this is a real, single-flow round trip a user holding
only USDC on the cheap chain could actually take (buy, then bridge-and-sell), not a
narrower "if you already hold capital on both chains" signal.

**Must-Have (P0):**
- [x] **Relabel/hide until verified — done immediately, before the rest of this phase.** — commit `dd04523`: tape column, sort pill, and panel copy said "buy-leg spread" / "not a round trip" while the real fix was being built, per the spec's own suggested sequencing (step 1).
- [x] **Second LI.FI probe for the sell leg, implemented as a single cross-chain bridge+sell quote** (see round-trip model above), not two separate same-chain quotes. — `lib/lifi/stockArb.ts#verifyArbCandidate`. Only fires if the buy-leg probe already cleared its own liquidity gate, so a doomed candidate never costs a second call.
- [x] **True round-trip net spread**: `netSpreadPct = (bridgeQuote proceeds in USD - $1,000 probe) / $1,000 probe`. Replaces Phase 3's buy-only figure as the number shown in "Spread %" — restored that label (see relabel note) now that it's earned.
- [x] **Liquidity gate applied to both legs independently** — `buyLegPriceImpactPct` and `bridgeLegPriceImpactPct`, each checked against `MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY`. Not literal "bridge cost as a separate subtracted line item": the single cross-chain quote's output already has bridge cost and sell slippage baked into one number, which is the more accurate way to ask LI.FI's own router "what would I actually net," rather than reassembling that number from parts LI.FI has already optimized across.
- [x] **Relabel is now unnecessary — same-chain "Spread %" is honest again**, so it's restored (`StockDesk.tsx`, `StockArbPanel.tsx`) rather than kept hedged. If a future change weakens the verification again, redo the Phase 3b-step-1 relabel immediately, don't leave a stale unqualified label live.
- [x] **Both-probe cap tightened, not just kept** — `ARB_ENRICH_LIMIT` cut from Phase 3's 12 to **8**, since each candidate now costs up to two sequential external calls instead of one (worst case 16 calls per catalog build instead of 12). Cache TTL correspondingly raised from 5 to 10 minutes.

**Departure from Phase 1/Phase 3's "mark, don't hide" stance — deliberate, not an oversight:**
a candidate that fails either leg's quote, either leg's liquidity gate, or nets non-positive
is **dropped entirely**, not shown marked "unverified" or "non-executable." Phase 3's
acceptance criteria for this exact case says so directly: "a verified buy leg with an
unverified sell leg is not enough to show a number." `StockArbRow` (the exported type) has
no unverified variant anymore — every row `fetchStockArbRows()` returns already cleared
the full pipeline. `enrichmentVerified`/`liquidityOk` (Phase 3's fields) are gone; anything
that would have set them false now just never becomes a row.

**What still doesn't exist:** an in-app way to execute the second leg. `StockSwapModal`
(Phase 2) only signs same-chain swaps. "Buy cheaper leg" still only executes the buy —
completing the verified bridge+sell happens outside the app for now. Building that second
signing flow (approve + a cross-chain `transactionRequest`, tracking a pending bridge
similar to `/move`'s CCTP flow) is real, untested-from-here surface that moves user funds
cross-chain; given this sandbox can't test any of it live, shipping the *verification* now
and leaving *execution* for a session that can validate it against a real quote felt like
the safer split than rushing both at once. Flagging this explicitly rather than letting
"round-trip verified" quietly imply "one-click round trip" — it doesn't yet.

**Nice-to-Have (P1):**
- [ ] Timestamp both probes and flag meaningful delay between them as a confidence indicator.
- [ ] Show both legs' individual quotes in an expandable row detail — `bridgeTool` (which LI.FI route was used) is already captured and shown per row; the raw quote objects themselves are not yet exposed.

**Future Considerations (P2):**
- [ ] Real-time re-quote on click, separate from the tape's 10-minute polling cycle.
- [ ] Extend to N-chain paths if two-leg proves valuable.
- [ ] The actual second-leg execution flow described above.

**Acceptance Criteria:**
- Given a candidate passes both buy-leg and sell-leg liquidity gates, when round-trip net spread is computed, then it reflects actual quoted costs on both legs, not an assumption about the sell side. — done; the sell-leg figure comes from a real cross-chain quote, not an assumption.
- Given the sell-leg probe fails, then the candidate is excluded from the actionable spread column entirely. — done (see the "mark, don't hide" departure above).
- Given the feature is not yet round-trip verified, when the column renders in the interim, it is labeled to reflect that. — done, and now moot: the interim label shipped in `dd04523` and was replaced once real verification landed in this same session.
- `npm run smoke:stock-arb` is extended to cover round-trip verification. — done: checks every row has a defined, positive `netSpreadPct` no greater than `grossSpreadPct`, and that the diagnostic impact fields are present.
- Smoke-tested against live LI.FI/CoinGecko data before merging. — **not done; blocked**, same sandbox restriction as every prior phase. This is now the second network call in the pipeline (bridge quotes are a new code path, never exercised against live LI.FI) — treat it as *less* proven than Phase 3's original buy-only probe, not equally proven, until `npm run smoke:stock-arb` has actually run somewhere with egress.

## Open Questions (Phase 3b, answered by what got built)
- **Product/Engineering — what does "round trip" mean?** Resolved by asking: bridge the actual purchased token, via one cross-chain LI.FI quote (see round-trip model above).
- **Engineering — does the top-12 cap still hold with doubled calls?** No — tightened to 8, cache TTL raised to 10 minutes.
- **Data — concurrent vs. sequential buy/sell probes, given price-drift risk between them?** Currently sequential *within* a candidate (bridge quote needs the buy quote's actual output amount as input) but candidates run concurrently with each other via `Promise.all`. Drift between the two sequential quotes for one candidate is real and unmeasured — this is exactly the P1 "timestamp both probes and flag delay" item above, not yet built.

---

## Open Questions
- **Engineering:** Is there an existing wallet-connect implementation from HYPERFLEX worth reusing, or does defiant need its own?
- **Data:** Is CoinGecko's tokenized-stock endpoint rate limit sufficient once the list grows beyond top 50, or does Phase 1 need a paid tier immediately?
- **Legal/Compliance:** Tokenized equities likely carry more regulatory scrutiny than prediction markets — worth a lightweight jurisdiction check before Phase 2 execution ships, even if informal.
- **Product:** Should Phase 2 execution be gated behind a waitlist/soft launch given compliance uncertainty, or open immediately?

## Suggested Timeline
Phase 1 is the only hard dependency — Phases 2 and 3 can be built in parallel once it's stable, since execution and arb detection touch different parts of the stack (wallet/swap UI vs. data/spread computation).
