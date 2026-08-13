# DEFIANT — Claude Session Memory

> Read this before touching anything in this repo.

## What this is

**Defiant is a non-custodial DeFi yield interface for a global audience.** Connect your
own wallet, compare live on-chain yield across Aave v3, Lido, and Yearn v3, deposit or
withdraw with transactions you sign yourself. The app never holds funds — no pooled
contract, no admin key, no custody. See `README.md` for the full rationale and regulatory
framing; the short version: custody is what turns this into a heavily-regulated financial
product in nearly every jurisdiction, so custody is the thing this build refuses to add.
Not scoped to any one country — don't add region-specific framing without a reason.

**Not called a "savings app" anywhere in the product.** DeFi yield is not deposit-insured
and carries real smart-contract/market/liquidity risk. Calling it "savings" would misstate
that to a consumer audience. If a future session is asked to rebrand toward "savings"
language, flag the regulatory/consumer-protection implication first — don't just do it.

## Non-negotiables

1. **Never add a code path where the app itself holds, pools, or moves user funds.** Every
   value-moving transaction (approve, supply, deposit, withdraw, submit, redeem, claim) must
   be built client-side and signed by the connected wallet. No relayer, no meta-transaction
   sponsor wallet, no server-side signer holding user assets — that's the entire non-custodial
   premise and it's the whole reason this doesn't need FINTRAC/CSA registration on day one.
2. **Never approve `type(uint256).max` / unbounded allowances.** Every ERC-20 `approve` call
   scopes to the exact amount being deposited. See `components/DepositWithdrawModal.tsx`.
3. **Never fabricate an APY.** If a protocol's API/on-chain read doesn't return a value we can
   parse with confidence, skip that opportunity — don't show a guessed or stale number as if
   it were live. `lib/protocols/yearn.ts` and `lib/protocols/lido.ts` both return `null`/`[]`
   on parse failure rather than falling back to a hardcoded default.
4. **Testnet is the default network mode.** `NEXT_PUBLIC_NETWORK_MODE=mainnet` is an explicit
   opt-in (`.env.local`), not something to flip casually while iterating. Real transactions on
   Aave/Lido/Yearn move real funds.
5. **Contract addresses are not assumed — they're read from official sources and cited.**
   `lib/config/addresses.ts` has a comment block naming exactly where each address came from
   and when it was last verified. If you add a new chain/asset, verify against
   [bgd-labs/aave-address-book](https://github.com/bgd-labs/aave-address-book) or
   [lidofinance/docs](https://github.com/lidofinance/docs) — don't paste an address from
   memory or an unverified search result into financial code.
6. **Fees are a separate wallet-signed transfer, never a cut taken inside a deposit/withdraw
   call.** No fee-router contract, no skimming inside `supply()`/`deposit()`/`submit()`. This
   is what keeps non-negotiable #1 true even with a fee model layered on top — see README
   "Fees" for the full two-step mechanism. `lib/config/fees.ts`'s `getTreasuryAddress()` must
   keep returning `undefined` (disabling every fee code path) on anything other than a valid,
   non-zero configured address — never add a hardcoded fallback treasury.
7. **The investment-style questionnaire filters and sorts existing opportunities — it never
   scores suitability or recommends a specific product or allocation.** That line is what
   keeps it out of investment-adviser-registration territory (see README "Investment-style
   filter"). If a future request pushes toward "recommend the best option for me" or a
   computed risk score, flag the regulatory shift explicitly before building it — don't just
   extend `applyPreferences()` past a filter/sort function.
8. **Nothing gets written to the database without an unchecked-by-default consent checkbox
   AND a valid wallet signature proving ownership of the address the data is attributed to.**
   `app/api/preferences/route.ts` rejects with 401 on a missing/invalid signature — that check
   is not optional scaffolding, it's the difference between real consent and a claim anyone
   could fabricate for anyone else's public address. If a future feature adds another
   server-side write path, it needs the same two properties (opt-in default state + proof of
   identity) or an explicit flagged exception, not a silent precedent-break.
9. **This app collects zero personal data outside the single opt-in questionnaire save path.**
   Don't add analytics, telemetry, tracking pixels, or any other data collection without
   surfacing it the same way this one was surfaced — as a decision with real privacy-law
   weight, not a routine addition. See README "Data collection" for what's actually stored
   (three answers + wallet address + timestamp, nothing else) and what's still missing before
   this can face real users (privacy policy, retention policy, deletion mechanism).

## ⛔ RainbowKit/wagmi config must stay lazy — do not regress

`lib/wagmi.ts` exports `getWagmiConfig()`, a lazy singleton — **not** an eagerly-evaluated
`export const wagmiConfig = getDefaultConfig(...)`. This is load-bearing, not a style choice.

RainbowKit's `getDefaultConfig()` constructs every default wallet connector (WalletConnect,
MetaMask SDK, Coinbase Smart Wallet) and touches browser-only APIs (`indexedDB`, `WebSocket`)
at call time. If it runs at **module-import time** (a top-level `const`), it crashes Next's
Node-side "Collecting page data" build step — `TypeError: (0 , x.y) is not a function` — for
*any* page that transitively imports the file, even client components wrapped in
`next/dynamic(..., { ssr: false })`. `ssr:false` only skips rendering; Next still has to
`require()` the module graph in Node to collect page metadata, and that require alone was
enough to execute `getDefaultConfig()` and crash.

Rules:
- `chains`, `NETWORK_MODE`, `SupportedChainId` in `lib/wagmi.ts` are safe to import anywhere
  (no RainbowKit dependency) — keep it that way.
- Only ever call `getWagmiConfig()` from code that executes in the browser: inside
  `app/providers.tsx` (itself loaded via `dynamic(() => import('./providers'), { ssr: false })`
  in `app/layout.tsx`), or inside a client event handler (`components/DepositWithdrawModal.tsx`,
  `components/LidoWithdrawalRequests.tsx`). Never at module scope.
- `ConnectButton` from `@rainbow-me/rainbowkit` is never imported directly — use
  `components/ConnectButtonClient.tsx`, which isolates it behind its own
  `dynamic(..., { ssr: false })` so no page's static import graph pulls RainbowKit into a
  server-evaluated chunk.
- If a future change reintroduces `export const wagmiConfig = getDefaultConfig(...)` at
  module scope, `npm run build` will fail on `/opportunities` (or wherever imports it) with
  the exact error above. Re-apply the lazy-singleton pattern rather than special-casing routes.

## Current state (2026-08-13, initial build + fees/questionnaire + data collection + Curve same day)

Scaffolded end-to-end: wallet connect (RainbowKit/wagmi), live opportunity aggregation across
Aave v3 + Lido + Yearn v3 + Curve (Ethereum/Base/Arbitrum where each protocol is deployed —
Curve is Ethereum-only, no testnet, and covers two pools — crvUSD/USDC and 3pool, its two most
liquid USDC-containing stable pools, see README "Protocols integrated" — not just one), a
full deposit/withdraw transaction flow per protocol (including Lido's async request-then-claim
withdrawal queue and Curve's preview-based slippage protection on `add_liquidity`/
`remove_liquidity_one_coin` — the only place in the app that does real min-out slippage
handling, since Curve's pool behaves like a swap unlike Aave/Lido/Yearn's fixed-rate
mechanics), a deposit/withdrawal fee (0.25%/0.25% default, see README "Fees") taken as a
separate transfer never skimmed inside a protocol call, an investment-style questionnaire that
filters/sorts `/opportunities` (never scores or recommends — see README "Investment-style
filter"), and an opt-in, signature-verified save of the questionnaire answers linked to the
connected wallet address (README "Data collection"). The Postgres data-collection path is the
app's only server-side data store; everything else, Curve included, is stateless (on-chain
reads / protocol public APIs only). `npm run typecheck` and `npm run build` both pass clean,
including with a treasury address and the Postgres/signature code paths exercised at build
time. Nothing has been run against a live testnet yet — this was built, typechecked, and
build-verified but not transaction-tested (no browser, no real wallet, no RPC, no live
Postgres instance in this environment) — and Curve specifically can't be testnet-verified at
all, since it has no testnet deployment; its first real test will necessarily be against
mainnet with real funds, so treat it as the least-proven integration in the app until that
happens. **Before trusting any of the transaction flows with real value, run each
deposit/withdraw path end-to-end on the default testnet config first (Curve excepted, per
above — review its code path with extra care instead). Before enabling the data-collection
opt-in for real users, get the privacy/compliance review — see below.**

Known gaps, detailed in `README.md`'s "Known simplifications" section:
- Yearn's yDaemon API response shape (`apr.forwardAPR.netAPR` etc.) is unverified against the
  live endpoint — this sandbox's network policy blocked reaching `ydaemon.yearn.fi` while
  building. Smoke-test on first real run.
- Curve's `api.curve.finance` response shape is likewise unverified against the live endpoint
  for the same reason (this sandbox blocks that domain too) — `lib/protocols/curve.ts` parses
  defensively and skips rather than guesses, but smoke-test the field names on first real run.
  Both pool addresses were verified indirectly, by cross-referencing multiple independent
  third-party sources rather than Curve's own (unreachable) docs — see the `CURVE` comment in
  `lib/config/addresses.ts`. Re-verify against Curve's own docs before trusting it further.
- 3pool (one of the two Curve pools) predates Curve's factory-pool pattern: its LP token
  (3Crv) is a separate contract from the swap pool, and its `add_liquidity`/`calc_token_amount`
  take a 3-element amounts array instead of 2. `lib/abi/curvePool.ts` has distinct
  `curvePoolAbi2Coin`/`curvePoolAbi3Coin` exports and `DepositWithdrawModal` branches on
  `opportunity.curve.numCoins` for exactly this reason — if a future Curve pool is added, check
  whether it's a factory pool (numCoins matches, pool IS the LP token) or an old-style pool
  (separate LP token, verify the amounts-array size) before reusing either ABI blindly.
- Lido withdrawal-queue allowance isn't read live (always submits approve) — harmless, just
  an extra signature on repeat withdrawals.
- USDC-only for Aave/Yearn/Curve. No risk scoring, no TVL display. Curve's shown APY is base
  trading-fee yield only — it deliberately excludes gauge CRV rewards, since earning those
  requires staking the LP token and this app doesn't build that flow (showing the CRV-inclusive
  number would overstate what a depositor here actually earns).
- **Fees default to off** — `NEXT_PUBLIC_TREASURY_ADDRESS` is unset, so `feesEnabled()` is
  `false` and no fee UI/transfer appears anywhere until it's configured with a real address.
- **The two-step fee flow has no partial-failure recovery** (fee transfer succeeds, main
  action then fails, or vice versa) — surfaces the error, no auto-refund/resume. Untested
  against a live RPC, same as everything else here.
- **Data collection defaults to off too** — `DATABASE_URL` is unset, so the opt-in save path
  errors (caught, surfaced as a small non-blocking message) until it's configured and
  `migrations/001_questionnaire_responses.sql` has been run against it.
- **No privacy policy, retention policy, or deletion mechanism** for the saved questionnaire
  data yet — see non-negotiable #9 and README "Data collection." This is the actual blocker
  before turning the opt-in on for real users, not a nice-to-have.

## What to build next (not started, in rough priority order)

1. Run the full deposit → withdraw cycle on testnet for Aave, Lido, and Yearn, fix whatever
   breaks. This has never been transaction-tested against a live RPC. Curve has no testnet
   deployment to test against — its first real test is necessarily on mainnet with real funds,
   so give its deposit/add_liquidity/remove_liquidity_one_coin code path (and the min-out
   slippage math around it) extra scrutiny before that first mainnet run.
2. Smoke-test the Yearn API integration specifically — verify `apr.forwardAPR.netAPR` is the
   right field before trusting displayed Yearn APYs. Same for Curve's `api.curve.finance`
   response shape assumed in `lib/protocols/curve.ts`.
3. Once a treasury address exists, smoke-test the fee flow specifically — both success and
   partial-failure paths (reject the second signature after the first succeeds) — before
   trusting it with real money.
4. Real compliance review before any mainnet/public launch — see README's regulatory section.
   Do not add jurisdiction-specific marketing copy, "safe", "guaranteed", or any
   deposit-insurance-adjacent language (FDIC, CDIC, FSCS, etc.) anywhere without that review
   happening first. This now also covers the fee model (money-transmitter-adjacent in some
   readings once real fees flow), the questionnaire (stays fine as long as it's filter-only
   per non-negotiable #7), and — the highest-priority piece of this review now — the
   wallet-linked data collection (non-negotiable #9): needs a privacy policy, a stated
   retention period, and a deletion mechanism before it's turned on for anyone real.
5. Risk context per opportunity (protocol TVL, audit status, Aave utilization rate) — an APY
   number with zero risk context is a half-honest product.

## Rules Claude must follow every session

1. Read this file before making changes.
2. Non-custodial architecture is load-bearing, not a preference — see Non-negotiables #1.
3. Verify any new contract address against an official source before writing it into
   `lib/config/addresses.ts`. Cite the source in a comment.
4. Default to testnet in any new config; require an explicit, visible signal before code
   assumes mainnet.
5. `npm run typecheck` before considering a change done.
