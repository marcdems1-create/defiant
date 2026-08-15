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
- Curve's base APY was being read from the WRONG endpoint (`getPools/all`, which has no APY),
  so mainnet Curve cards never populated. Fixed 2026-08-14: `lib/protocols/curve.ts` now reads
  `getSubgraphData/<chain>` (`data.poolList[]` → `latestDailyApy`/`latestWeeklyApy`, as
  percentages). Verified live against `api.curve.finance`. Still parses defensively.
- Curve now runs on Base and Arbitrum too (added 2026-08-14 for a low-gas L2 route), not just
  Ethereum. Those two L2 pools were verified DIRECTLY against Curve's own API and a live
  on-chain `eth_call` (the environment reaches Curve now, unlike the original build sandbox) —
  addresses, coin order, LP token, and add-side array encoding all confirmed; see the `CURVE`
  comment in `lib/config/addresses.ts`. The Ethereum pool addresses remain third-party-verified.
- THREE Curve pool shapes now coexist and `lib/abi/curvePool.ts` has an ABI for each; pick via
  `CurvePoolConfig.numCoins` + `amountsEncoding`:
  - Ethereum crvUSD/USDC — StableSwap-NG factory pool, pool IS the LP token, fixed `uint256[2]`
    (`curvePoolAbi2Coin`).
  - 3pool — pre-factory, LP token (3Crv) is a SEPARATE contract, fixed `uint256[3]`
    (`curvePoolAbi3Coin`).
  - Base/Arbitrum `plainstableng` pools — pool IS the LP token but `add_liquidity`/
    `calc_token_amount` take a DYNAMIC `uint256[]` and revert on the fixed selector
    (`curvePoolAbiNg`, `amountsEncoding: 'dynamic'`).
  `remove_liquidity_one_coin`/`calc_withdraw_one_coin` are `(uint256, int128)` across all three,
  so the withdraw side is shared. If a future Curve pool is added, `eth_call` both `calc_token_
  amount` selectors against the live pool to determine fixed vs dynamic before reusing an ABI.
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
   right field before trusting displayed Yearn APYs. (Curve's `api.curve.finance` shape is now
   verified live and the endpoint bug is fixed — see the Curve notes above and the 2026-08-14
   session update.) The Base/Arbitrum Curve deposit path uses a dynamic-array ABI verified by
   read-only `eth_call`; the actual `add_liquidity`/`remove_liquidity_one_coin` writes still
   need a real on-chain run (small size, mind the low L2 TVL / 1% min-out) before trusting.
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

## Session update (2026-08-12) — Curve/Frax/Convex + non-custodial fee-on-conversion

Added three protocol adapters following the existing patterns exactly:
- `lib/protocols/curve.ts` (scrvUSD) and `lib/protocols/frax.ts` (sfrxUSD) — both plain
  ERC-4626 vaults, same `deposit()`/`redeem()` shape as `yearn.ts`. Mainnet only (neither
  protocol deploys these to testnets).
- `lib/protocols/convex.ts` (cvxCRV) — NOT ERC-4626. One-way "convert CRV to cvxCRV and
  stake" via `CrvDepositor.deposit()`, unstake via `BaseRewardPool.withdraw()`, which
  returns cvxCRV, not CRV. This is the "high-yield CVX/CRV" opportunity the user asked
  for; the more complex Convex Booster/LP-staking path (multi-token CRV+CVX+bribe rewards,
  requires pool-ID lookups) was deliberately scoped OUT — see "What to build next" below.

Added `lib/swap/zeroex.ts`: a non-custodial fee-on-conversion mechanism using 0x's Swap
API (AllowanceHolder flavor — plain approve + tx, no Permit2 signature). This is how the
user's "convert and take a fee in the backend" request got implemented WITHOUT adding a
backend or touching custody — the swap tx is built by the app but always signed and sent
by the connected wallet. Fee goes to `NEXT_PUBLIC_SWAP_FEE_RECIPIENT` atomically inside the
swap transaction via 0x's `swapFeeBps`/`swapFeeRecipient` params. Wired into
`DepositWithdrawModal.tsx` as an opt-in checkbox ("convert from USDC first") on any
opportunity with a `convertibleFrom` field set (Curve/Frax/Convex all set this to USDC).

Added a `risk: 'lower' | 'higher'` field to `Opportunity` (types.ts) and a "Higher risk"
badge in both the opportunity card and the deposit modal — a direct response to this
file's own long-standing flag that "an APY number with zero risk context is a half-honest
product." This is still a coarse two-tier signal, not real risk scoring.

**Address verification status** (per Non-negotiable #5): CRV, cvxCRV, CRV Depositor,
cvxCRV Rewards, and the scrvUSD vault were all confirmed against official sources fetched
live this session (docs.convexfinance.com, docs.curve.fi) — see comments in
`lib/config/addresses.ts` for exact citations. The sfrxUSD address was re-verified
2026-08-13: docs.frax.finance's specific frxUSD/sfrxUSD address page remains unreachable
from this environment, but two independent sources now agree — Etherscan's own curated
address tag ("Frax Finance: sfrxUSD Token") and CoinGecko's contract lookup both confirm
the same address. Also corrected: frxUSD/sfrxUSD is NOT a rename of FRAX/sFRAX (the
original "North Star hard fork" framing was wrong) — both pairs coexist as separate live
tokens. See the full note in `lib/config/addresses.ts`. Still worth confirming against
docs.frax.finance directly if that page ever becomes reachable, but no longer "treat as
unverified."

**Nothing in this update has been transaction-tested** — same caveat as the original
build. `npm run typecheck` and `npm run build` both pass clean as of this session; no
browser, no real wallet, no RPC in this sandbox.

## What to build next (updated, in rough priority order)

1. Everything from the original list is still open (full testnet deposit/withdraw cycle
   for the original three protocols has still never been run).
2. Smoke-test the new Curve/Frax/Convex adapters against live contracts and the DeFiLlama
   API field names, same as the still-open Yearn smoke test.
3. Get a real 0x API key and smoke-test `lib/swap/zeroex.ts` against a real quote —
   verify `transaction.to/data/value` and `issues.allowance.spender` are the right fields
   before this ever touches a wallet with funds in it.
4. ~~Confirm the sfrxUSD address against docs.frax.finance directly~~ — done 2026-08-13 via
   Etherscan address tag + CoinGecko cross-check (docs.frax.finance's own page stayed
   unreachable); see the verification-status note above. Still worth a direct
   docs.frax.finance confirmation if that page ever loads.
5. If the Convex Booster/LP-staking path (the actual "boosted" CRV+CVX+bribe yield the
   user was originally asking about) gets prioritized: it needs (a) a pool-ID registry per
   Curve LP pool, (b) a two-step deposit (mint/acquire Curve LP token, then
   `Booster.deposit(pid, amount, stake=true)`), and (c) a rewards-array shape in
   `usePositions` instead of the current single-balance-per-opportunity assumption, since
   Booster positions can earn CRV + CVX + third-party bribe tokens simultaneously.
6. Real compliance review before any mainnet/public launch — unchanged from the original
   list, and now more relevant given the fee-on-conversion feature touches money movement
   even though it stays non-custodial.

## Session update (2026-08-14) — Curve on Base + Arbitrum (low-gas L2 route) + APY endpoint fix

Extended Curve beyond Ethereum to Base and Arbitrum so users have a low-gas L2 route into
Curve (Ethereum deposits/withdraws cost far more per tx). Two pools added, one per chain:
- Base: `USDC/scrvUSD` (0x5aB01ee6208596f2204B85bDFA39d34c2aDD98F6).
- Arbitrum: `USDC/USD₮0` "Strategic USD Reserves" (0x49b720F1Aab26260BEAec93A7BeB5BF2925b2A8F).

Both are Curve `plainstableng` (StableSwap-NG) pools where `add_liquidity`/`calc_token_amount`
take a **dynamic `uint256[]`** array, unlike the older mainnet crvUSD/USDC factory pool
(`uint256[2]`) and 3pool (`uint256[3]`). Added `curvePoolAbiNg` in `lib/abi/curvePool.ts`, an
`amountsEncoding: 'fixed' | 'dynamic'` field on `CurvePoolConfig`, threaded it through
`Opportunity.curve`, and branched the add side of `DepositWithdrawModal` on it. Withdraw side
(`remove_liquidity_one_coin`/`calc_withdraw_one_coin`, `(uint256,int128)`) is shared across all
three shapes.

**Address verification (per Non-negotiable #5):** this environment reaches Curve's own API and
public L2 RPCs (the original build sandbox did not), so both L2 pools were verified DIRECTLY:
`api.curve.finance/v1/getPools/all/{base,arbitrum}` for address/coins/lpToken/implementation,
plus a live `eth_call` per pool confirming `coins[0]` = native USDC, the dynamic-array selector
(the fixed one reverts), and a healthy ~999.85-USDC round-trip on a 1000-USDC deposit→withdraw
preview. Citations in the `CURVE` comment in `lib/config/addresses.ts`.

**Also fixed a pre-existing bug:** `lib/protocols/curve.ts` was reading base APY from
`getPools/all` (which has no APY), so Curve cards never populated on ANY chain. Now reads
`getSubgraphData/<chain>` (`data.poolList[]` → `latestDailyApy`/`latestWeeklyApy`), verified
live. This makes mainnet Curve actually show up for the first time, too.

`npm run typecheck`, `npm run lint`, and `npm run build` all pass clean. The read-only paths
(APY fetch, deposit/withdraw previews, dynamic-array ABI) were smoke-tested against live L2
pools; the actual on-chain `add_liquidity`/`remove_liquidity_one_coin` **writes** are still
untested with real funds — same caveat as every other transaction flow in this app, plus mind
the small L2 TVL vs. the modal's 1% min-out (large deposits will revert safely).
