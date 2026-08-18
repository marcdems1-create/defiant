# DEFIANT — Claude Session Memory

> Read this before touching anything in this repo.

## What this is

**Openhand (repo: Defiant) is a non-custodial DeFi yield interface for a global audience.**
Public host is `https://openhand.online`. Connect your
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
   Optional Privy email/passkey wallets are third-party infra (`NEXT_PUBLIC_PRIVY_APP_ID`);
   Openhand must not persist keys or the email Privy collects.
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
7. **Do not add a questionnaire, suitability score, “best option for you,” or a featured
   starter card.** Browse filters only hide/reorder the existing catalog. A single
   highlighted opportunity is still a recommendation even if the copy says it is not —
   do not add a “Start here” product. That line is what keeps this out of
   investment-adviser-registration territory. If a future request pushes toward scored
   recommendations or allocation percentages, flag the regulatory shift explicitly before
   building it.
8. **Nothing wallet-linked gets written to the database without an unchecked-by-default
   consent checkbox AND a valid wallet signature proving ownership of the address the data
   is attributed to.** There is currently no wallet-linked write path (the questionnaire
   save was removed). First-party site analytics (`site_events`) is anonymous: no wallet,
   no IP, no user-agent. See README "Site analytics." If a future feature stores anything
   against an address, it needs those two properties — not a silent add.
9. **This app does not collect wallet-linked personal data.** Don't add third-party
   analytics, telemetry, tracking pixels, or any other data collection without treating it
   as a decision with real privacy-law weight. The only optional store is anonymous
   first-party events. See README "Site analytics." What's still missing before that store
   faces real users: privacy policy, retention policy, deletion mechanism.

## ⛔ RainbowKit/wagmi config must stay lazy — do not regress

`lib/wagmi.ts` exports `getWagmiConfig()`, a lazy singleton — **not** an eagerly-evaluated
`export const wagmiConfig = getDefaultConfig(...)`. This is load-bearing, not a style choice.
The same rule applies to Privy's `createConfig()` from `@privy-io/wagmi` when
`NEXT_PUBLIC_PRIVY_APP_ID` is set.

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

## Current state (2026-08-13, initial build + fees + Curve; questionnaire later removed)

Scaffolded end-to-end: wallet connect (RainbowKit/wagmi), live opportunity aggregation across
Aave v3 + Lido + Yearn v3 + Curve (Ethereum/Base/Arbitrum where each protocol is deployed —
Curve is Ethereum-only, no testnet, and covers two pools — crvUSD/USDC and 3pool, its two most
liquid USDC-containing stable pools, see README "Protocols integrated" — not just one), a
full deposit/withdraw transaction flow per protocol (including Lido's async request-then-claim
withdrawal queue and Curve's preview-based slippage protection on `add_liquidity`/
`remove_liquidity_one_coin` — the only place in the app that does real min-out slippage
handling, since Curve's pool behaves like a swap unlike Aave/Lido/Yearn's fixed-rate
mechanics), a deposit/withdrawal fee (0.25%/0.25% default, see README "Fees") taken as a
separate transfer never skimmed inside a protocol call, and a short on-page risk disclosure
instead of a questionnaire (README "Not advice"). Optional first-party site analytics
(`site_events`) is the only server-side store; everything else is stateless (on-chain reads /
protocol public APIs only). `npm run typecheck` and `npm run build` both pass clean.
Nothing has been run against a live testnet yet — this was built, typechecked, and
build-verified but not transaction-tested (no browser, no real wallet, no RPC, no live
Postgres instance in this environment) — and Curve specifically can't be testnet-verified at
all, since it has no testnet deployment; its first real test will necessarily be against
mainnet with real funds, so treat it as the least-proven integration in the app until that
happens. **Before trusting any of the transaction flows with real value, run each
deposit/withdraw path end-to-end on the default testnet config first (Curve excepted, per
above — review its code path with extra care instead). Before enabling site analytics for
real users, get the privacy/compliance review — see below.**

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
- **Site analytics defaults to off** — `DATABASE_URL` is unset, so first-party events no-op
  until it's configured and `migrations/002_site_analytics.sql` has been run. `/admin` stays
  disabled until `ADMIN_PASSWORD` is set.
- **No privacy policy, retention policy, or deletion mechanism** for the anonymous event
  table yet — see non-negotiable #9 and README "Site analytics." This is the actual blocker
  before turning analytics on for real users, not a nice-to-have.

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
   readings once real fees flow) and first-party site analytics (non-negotiable #9): needs a
   privacy policy, a stated retention period, and a deletion mechanism before `/admin` is
   turned on for anyone real. Do not re-add a questionnaire or scored recommendation
   (non-negotiable #7).
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
7. Smoke-test CCTP V2 (`/move`) on testnet with Circle-native USDC (not Aave’s faucet
   token on Sepolia/Base Sepolia), both the happy path and “reject the mint after a
   successful burn.” Smoke-test Panoptic Unicorn `asset()` + DeFiLlama Unicorn field
   names before a mainnet deposit.
8. Smoke-test Pendle Hosted SDK Convert against a small mainnet PT buy (sUSDS book)
   and an early sell. Confirm `requiredApprovals` spender matches `tx.to`. Do not
   expand to YT/LP without a separate product decision.

## Session update (2026-08-16) — Transak CAD / Interac onramp

Replaced the unused Onramper iframe with Transak for Canadian no-coiners.

- **Why Transak:** FINTRAC-registered, CAD + Interac, no monthly partner fee. MoonPay
  blocks Canada on every USDC listing we care about (ethereum / base / arbitrum —
  live `api.moonpay.com/v3/currencies`, `notAllowedCountries: ["CA"]`; MoonPay docs:
  “Customers in Canada cannot purchase Stablecoins”). Onramper Essentials is $199/mo
  — not used.
- **Non-custodial:** `POST /api/onramp/widget` builds a one-shot Transak session locked
  to the connected wallet (`walletAddress` + `disableWalletAddressForm`). Funds never
  touch Openhand. Deposit/swap/referral stay on wagmi.
- **Secrets:** `TRANSAK_API_KEY` + `TRANSAK_API_SECRET` are server-only. The API secret
  mints a Partner Access Token (cached in memory, ~7 days). Do not put the secret in
  `NEXT_PUBLIC_*`. Optional `TRANSAK_STAGING=true` for Transak sandbox.
- **Mainnet only.** Testnet cannot receive real USDC; the modal shows faucet copy instead.
- **IP:** Transak requires `x-user-ip` for KYC/geo. Forwarded, never stored.

`lib/config/onramper.ts` is deleted. Allowlist `openhand.online` in the Transak dashboard
and set the two env vars on Vercel before Buy USDC works in production. Transak
production also needs partner KYB (`https://forms.transak.com/kyb`). Keep the Transak
dashboard partner fee at 0% — do not stack a markup on Canadian first buys.
Signup is self-serve at dashboard.transak.com with a **corporate email**
(`hello@openhand.online`, not Gmail). Staging keys are immediate. Do not wait on
sales@transak.com for the hosted widget.

## Reown vs Transak — both stay; they are not two onramps

**Use both.** They do different jobs. Do not replace one with the other.

| Piece | What it is | Env |
|---|---|---|
| **Reown** | WalletConnect Cloud. How MetaMask / Rainbow / Rabby / the WC QR connect. Privy uses the same project ID for `wallet_connect`. | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` from [cloud.reown.com](https://cloud.reown.com). Allowlist `openhand.online`. |
| **Privy** | Email / passkey embedded wallet for people with no wallet yet. | `NEXT_PUBLIC_PRIVY_APP_ID` (set to `off` for RainbowKit-only). |
| **Transak** | CAD / Interac → USDC into the **already-connected** address. Does not create the wallet. | `TRANSAK_API_KEY` + `TRANSAK_API_SECRET` (server-only). |

First-session path: Privy creates a wallet **or** Reown connects an existing one → Transak buys USDC into that address → wagmi signs the deposit.

**Do not turn on Reown AppKit’s bundled onramp** (`features.onramp`, Coinbase Pay / Meld). That is a different product from WalletConnect Cloud. It would fight Transak, typically means swapping RainbowKit/wagmi for AppKit (do not regress the lazy `getWagmiConfig()` rule), and Coinbase Onramp in Canada is **card-only** — no Interac.

**Do not use Privy’s `useFiatOnramp` as the Canadian buy path** even though it is fewer lines and $0/mo. It is a **card / Apple Pay / Google Pay** router (MoonPay, Coinbase, Stripe, Meld). CAD is listed as a source currency, but MoonPay cannot sell USDC to CA, Stripe’s embedded onramp is US/EU, and Coinbase Onramp in CA has no Interac. Interac is the usual Canadian bank path; cards run ~3.5–5.5%.

## Why Transak is the cheapest/simplest in-app path (checked 2026-08-17)

Constraint: in-app, non-custodial, CAD, Interac, USDC on Ethereum/Base/Arbitrum, $0 monthly, keep current wagmi/Privy stack.

| Option | Openhand monthly | Canadian USDC? | Interac? | Why not |
|---|---|---|---|---|
| **Transak hosted widget** | **$0** (pay-per-success; the **$10k** fee is Whitelabel API only — we are not using that) | Yes (FINTRAC) | Yes | **This is the path.** Production KYB required. |
| Banxa widget | Typically $0/mo | Yes, Interac-strong | Yes | Same class as Transak. Switching now is not simpler — Transak is already wired. |
| Onramper aggregator | **$199/mo** Essentials ($1,800/yr) | Via its providers | Maybe | Pays monthly to wrap Transak/MoonPay. Skip. |
| MoonPay widget / Privy MoonPay | $0 | **No** — every `usdc*` listing blocks `CA` | Interac exists for *other* assets | Dead end for this product. |
| Coinbase Onramp / Reown AppKit onramp | $0 | Likely yes | **No** — CA payment method is `CARD` only | Wrong rail for no-coiners; AppKit would replace the wallet stack. |
| Privy `useFiatOnramp` | $0 | Unreliable for CA USDC (MoonPay blocked; Stripe US/EU) | No (cards) | Simplest *code*, wrong *product*. |
| “Go buy on Shakepay / NDAX / Newton, then withdraw” | $0 | Yes, often cheapest user fees | Yes | Not in-app. Kills no-coiner conversion. Do not make this the product. |

User-side Transak fees are Transak’s (card ~3.5–5.5%, bank/Interac much lower). Openhand should not add a partner fee on top. Cheapest *user* path in Canada is still a local exchange + withdraw; cheapest *in-app* path that actually does Interac → USDC without a monthly bill is Transak’s hosted widget.

**Do not wire a second onramp as “failover” until Transak is live and downtime is a real problem.** MoonPay / Privy `useFiatOnramp` / Coinbase Onramp / Reown AppKit onramp are not backups for this corridor (no CA USDC, or cards instead of Interac). Onramper is a paid aggregator ($199/mo) for the same job. Banxa is the only same-class Interac peer; adding it now is a second KYB, second iframe, and a second KYC for the user when Transak is down. The modal already falls back to “send USDC to this address” if the widget session fails. Revisit Banxa only after Transak has been used in production.

## Session update (2026-08-18) — Sky sUSDS, Maple syrupUSDC, harvest sell-%

Added USDC-in / USDC-out adapters that stay non-custodial:

- Sky sUSDS via Spark PSM3 on Base and Arbitrum (`lib/protocols/sky.ts`). Copy uses “Sky protocol rate,” never “savings.” Token addresses are read from the PSM.
- Maple syrupUSDC on Ethereum (`lib/protocols/maple.ts`). Deposit via SyrupRouter; exit is `requestRedeem` (FIFO, push payout). First-time wallets must authorize on syrup.fi — Openhand cannot sign Maple’s allowlist.
- Harvest + sell-% of *just-claimed* WELL / CRV / CVX to USDC (`components/HarvestRewards.tsx`). Default 100% sell, slider to hold a percent. Wallet-signed only — no keeper. 0x quote still needs `NEXT_PUBLIC_ZEROEX_API_KEY`.

**Not added:** Uniswap V3 / Aerodrome LP, GMX, Pendle, or one-click looping. Looping is leverage (depeg/oracle/rate/liquidation risk stacked). Do not add it.

## Session update (2026-08-18) — CCTP V2 Move + Panoptic Unicorn

Built the two catalog/tool pieces that stay on the non-custodial, non-advice side of the line:

- **Move USDC** (`/move`, `components/CctpMove.tsx`) — user-signed Circle CCTP **V2**. Exact approve → burn → Iris attestation (server proxy `/api/cctp/attestation`) → mint on destination. No Circle KYB, no Openhand fee, pending burns in localStorage only. Native Circle USDC addresses (not Aave test tokens). Standard Transfer (`minFinalityThreshold = 2000`).
- **Panoptic Unicorn USDC** (`lib/protocols/panoptic.ts`) — Ethereum catalog card, ERC-4626. Higher-risk badge. Skip if `asset()` ≠ USDC or DeFiLlama has no Unicorn APY. Do not describe it as market-neutral or a featured strategy. No PLP WETH.

**Still not added:** looping, Uniswap V3 / Aerodrome LP, GMX, Pendle YT/LP, a strategy/allocation page, or any Openhand-run options vault.

## Session update (2026-08-18) — Pendle PT (battle-tested markets)

Catalog-only Principal Tokens from Pendle's official markets API, allowlisted to the books that have been on Pendle across many expiries:

- sUSDS (Sky), sUSDe (Ethena), wstETH (Lido). USDe is allowlisted if a live market reappears.
- Implied APY to maturity from Pendle (`details.impliedApy`). Skip if missing, expired, TVL under $1M, or fewer than 14 days to expiry.
- User-signed Hosted SDK Convert (exact approve to `tx.to`, 1% slippage). No hardcoded router. No YT, no LP, no long-tail points markets.
- Not a recommendation and not a rolling vault — each expiry is its own token.

**Still not added:** Pendle YT/LP, looping, Uniswap V3 / Aerodrome, GMX, a strategy page.
