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
   Openhand must not persist keys or the email Privy collects. Privy's allowed origins
   must include **both** `https://openhand.online` and `https://www.openhand.online`.
   Vercel currently 308s apex → www; a missing www origin white-screens the public
   app (`Application error: a client-side exception`). `NEXT_PUBLIC_PRIVY_APP_ID`
   must be the dashboard **App ID** (starts with `cl`/`cm`), never the App Secret
   (`privy_app_secret_…`). A secret in that env var is inlined into public JS and
   Privy throws "invalid Privy app ID". `app/providers.tsx` falls back to RainbowKit
   if Privy throws — do not remove that boundary. `privyAppId()` rejects secret-shaped
   values and uses the known public App ID instead.
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
   **Do not turn the deposit/withdraw treasury fee on.** A cut on every Aave/Yearn tx is
   money-transmitter-adjacent and a tax on putting dollars to work. Monetize on licensed
   rails instead: Transak partner fee on Buy USDC, optional 0x `swapFeeBps` on
   **bridge / convert trades only** (paid to a **cold wallet** via
   `NEXT_PUBLIC_SWAP_FEE_RECIPIENT`), CAD subscription later for extras.
   Never a performance fee on yield. Leave `NEXT_PUBLIC_TREASURY_ADDRESS` unset until
   counsel says otherwise — see session update 2026-08-17.
   Openhand must not run a custodial bridge. The user signs the swap/bridge tx; the
   fee is collected atomically to the cold wallet. Do not send bridge proceeds to a
   hot operating key.
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
   first-party events. See README "Site analytics." Public `/privacy` covers that store.
   What's still missing before analytics faces real users: a stated retention period
   and a deletion mechanism.

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
  `app/providers.tsx` (loaded from `WalletApp` via a client `import()` in `useEffect`,
  never as `dynamic(..., { ssr: false })` wrapping page children), or inside a client
  event handler (`components/DepositWithdrawModal.tsx`,
  `components/LidoWithdrawalRequests.tsx`). Never at module scope.
- **Never wrap `app/(public)` page children in `next/dynamic(..., { ssr: false })`.**
  That makes Next emit `BAILOUT_TO_CLIENT_SIDE_RENDERING` for `/`, so KYB crawlers
  see an empty homepage. Header/footer/product copy must SSR; wallet providers mount
  after hydration (`components/WalletApp.tsx`). Legal pages stay outside wallet
  providers (`app/(legal)`).
- `ConnectButton` from `@rainbow-me/rainbowkit` is never imported directly — use
  `components/ConnectButtonClient.tsx`, which isolates it behind its own
  `dynamic(..., { ssr: false })` so no page's static import graph pulls RainbowKit into a
  server-evaluated chunk.
- If a future change reintroduces `export const wagmiConfig = getDefaultConfig(...)` at
  module scope, `npm run build` will fail on `/opportunities` (or wherever imports it) with
  the exact error above. Re-apply the lazy-singleton pattern rather than special-casing routes.

## Agent record (2026-08-17) — do not re-litigate

Owner is signing up **Canadian no-coiners** on `openhand.online` (repo `defiant`). Domain is
on Namecheap; site is on Vercel (`temporary-instant-bugle-1rh5ndv`). Apex **308s to
`https://www.openhand.online`**.

### Wallet vs buy — three vendors, three jobs

| Piece | Job | Not |
|---|---|---|
| **Privy** | Email / passkey embedded wallet for people with no wallet | Not an onramp. Not email hosting. |
| **Reown** (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`) | WalletConnect for MetaMask / Rainbow / Rabby / QR. Privy uses the same project ID for `wallet_connect`. | Not an onramp. Do **not** turn on Reown AppKit `features.onramp` (Coinbase Pay / Meld). That would fight Transak and replace the lazy wagmi stack. |
| **Transak** | CAD / Interac → USDC into the **already-connected** address | Does not create the wallet. Hosted widget, $0/mo. |

Keep all three. Do not “pick Reown or Transak.”

### Onramp choice (checked 2026-08-17) — Transak hosted widget

Constraint: in-app, non-custodial, CAD, Interac, USDC on Ethereum/Base/Arbitrum, $0 monthly,
keep wagmi/Privy.

| Option | Why not (or why yes) |
|---|---|
| **Transak hosted widget** | **Yes.** FINTRAC, CAD, Interac, $0/mo. $10k fee is **Whitelabel API only** — unused. Production KYB at `forms.transak.com/kyb`. Partner fee in dashboard stays **0%**. |
| MoonPay / Privy `useFiatOnramp` | **Dead.** Live `api.moonpay.com/v3/currencies`: every `usdc*` listing (ethereum, **base**, arbitrum) has `notAllowedCountries: ["CA"]`. MoonPay docs: Canadians cannot buy stablecoins. Interac on MoonPay does not help this product. |
| Coinbase Onramp / Reown AppKit onramp | Canada is **CARD only**, no Interac. |
| Onramper | **$199/mo** Essentials. Skip. |
| Banxa | Same class as Transak (FINTRAC + Interac). Switching now is not simpler. |
| “Buy on Shakepay then withdraw” | Cheaper for the user, not in-app. Do not make it the product. |

**No second onramp as failover until Transak is live and downtime is real.** MoonPay / Privy
cards / Coinbase / AppKit cannot cover this corridor. Banxa could later (second KYB, second
KYC for the user). If Transak cannot open, the modal already shows the wallet address.

Code lives on **PR #10** `cursor/canada-transak-onramp-f1e6` (`POST /api/onramp/widget`,
`lib/config/transak.ts`). Not necessarily merged to `main` yet. Server env:
`TRANSAK_API_KEY` + `TRANSAK_API_SECRET` (never `NEXT_PUBLIC_*`). Sessions are 5 min /
single-use. `x-user-ip` is forwarded to Transak, not stored.

### Transak signup — skip sales, corporate email only

Gmail / Hotmail / Outlook / iCloud are **rejected**. Do not email sales@ for the hosted
widget. Self-serve:

1. Inbox on the domain they already own: `hello@openhand.online`.
2. Namecheap → **Domain List** → Manage `openhand.online`.
3. **Advanced DNS** → Mail Settings = **Email Forwarding** (SPF TXT for
   `spf.efwd.registrar-servers.com` means this step is done). Do **not** hunt for a Mail
   Settings box on that tab after it is already Email Forwarding.
4. **Domain tab** (not Advanced DNS) → scroll to **Redirect Email** → **Add Forwarder**.
   Alias `hello` → forward to Gmail. Test from a **different** mailbox.
5. Sign up at [dashboard.transak.com](https://dashboard.transak.com) with
   `hello@openhand.online`. Staging keys are immediate under Developers. Production needs
   KYB with the **same** email.
6. Allowlist `openhand.online` and `www.openhand.online` in Transak.

Privy’s dashboard is **not** where you create that inbox. **Wallets** in Privy is user
wallets. Email forwarding is Namecheap only.

### Production white-screen (2026-08-17) — App Secret in a public env var

Symptom: Next.js black page, `Application error: a client-side exception has occurred`,
desktop and mobile, apex and www. HTML 200s; all assets 200. Origins in Privy were **already**
`https://openhand.online` and `https://www.openhand.online`. Do **not** spend another session
re-allowlisting origins as the first hypothesis.

**Actual console error (verified in browser):**
`Cannot initialize the Privy provider with an invalid Privy app ID`

**Cause:** Vercel `NEXT_PUBLIC_PRIVY_APP_ID` was set to the **Privy App Secret**
(`privy_app_secret_…`). Next inlines `NEXT_PUBLIC_*` into the browser bundle at **build**
time. Privy rejects it. The secret was also leaked in public JS until redeploy.

**Fix (ops, must happen even if code is merged):**
1. Privy → **App settings** → **Basics** → copy **App ID** (short, `cl`/`cm…`).
2. Same page → **regenerate App Secret**. Never put the new secret in `NEXT_PUBLIC_*`.
3. Vercel → env `NEXT_PUBLIC_PRIVY_APP_ID` = that **App ID** only.
4. **Redeploy** (changing the env without a new build does nothing).

**Code (PR #11 `cursor/privy-www-crash-f1e6`):** `privyAppId()` rejects `privy_app_secret_*`
and non-`cl`/`cm` IDs; `app/providers.tsx` error-boundary falls back to RainbowKit;
`app/error.tsx` shows the real message. Do not remove that boundary. Default public App ID
remains `cmstzz2zb009k0el4fzr8x8jb`.

Privy allowed origins UI: **App settings** → **Domains** (not Overview, not Wallets).
Direct: `https://dashboard.privy.io/apps?setting=domains&page=settings`.

### Open PRs as of this record

- **#10** Transak CAD/Interac onramp — merge when keys exist.
- **#11** Privy secret / white-screen — merge; still requires the Vercel env fix + secret
  rotation + redeploy or the old secret stays in the previous deployment’s JS.

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
- **Deposit/withdraw treasury fee stays off** — `NEXT_PUBLIC_TREASURY_ADDRESS` is unset, so
  `feesEnabled()` is `false`. Do not enable it. Monetize via Transak partner fee on Buy USDC
  (session update 2026-08-17). The two-step treasury path has no partial-failure recovery
  anyway — keep it dark.
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
3. ~~Once a treasury address exists, smoke-test the deposit/withdraw fee flow~~ — do not
   enable `NEXT_PUBLIC_TREASURY_ADDRESS`. After Transak KYB, set a partner fee on Buy USDC
   in Transak's dashboard instead. Smoke-test that path (success + user-abort) before
   relying on it.
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
   list. Deposit/withdraw treasury fees stay off; Transak partner fee and optional 0x
   convert-then-deposit fee are the monetization paths (session update 2026-08-17).
7. Smoke-test CCTP V2 (`/move`) on testnet with Circle-native USDC (not Aave’s faucet
   token on Sepolia/Base Sepolia), both the happy path and “reject the mint after a
   successful burn.” Smoke-test Panoptic Unicorn `asset()` + DeFiLlama Unicorn field
   names before a mainnet deposit.

## Session update (2026-08-16) — Transak CAD / Interac onramp

Replaced the unused Onramper iframe with Transak for Canadian no-coiners.

- **Why Transak:** FINTRAC-registered, CAD + Interac, no monthly platform fee. MoonPay
  blocks Canada on every USDC listing we care about (ethereum / base / arbitrum —
  live `api.moonpay.com/v3/currencies`, `notAllowedCountries: ["CA"]`; MoonPay docs:
  “Customers in Canada cannot purchase Stablecoins”). Onramper Essentials is $199/mo
  — not used.
- **Non-custodial:** `POST /api/onramp/widget` builds a one-shot Transak session locked
  to the connected wallet (`walletAddress` + `disableWalletAddressForm`). Funds never
  touch Openhand. Deposit/swap/referral stay on wagmi.
- **Secrets:** `TRANSAK_API_KEY` + `TRANSAK_API_SECRET` are server-only. The API secret
  mints a Partner Access Token (cached in memory, ~7 days). Do not put the secret in
  `NEXT_PUBLIC_*`. Optional `TRANSAK_STAGING=true` for Transak sandbox (works on testnet).
- **Production buys need mainnet + production keys.** Staging sandbox can be tested
  without flipping the app to mainnet; it sends TRNSK, not Circle USDC.
- **IP:** Transak requires `x-user-ip` for KYC/geo. Forwarded, never stored.

`lib/config/onramper.ts` is deleted. Allowlist `openhand.online` in the Transak dashboard
and set the two env vars on Vercel before Buy USDC works in production. Transak
production also needs partner KYB (`https://forms.transak.com/kyb`).
Signup is self-serve at dashboard.transak.com with a **corporate email**
(`hello@openhand.online`, not Gmail). Staging keys are immediate. Do not wait on
sales@transak.com for the hosted widget. Partner fee on the **buy** is the
monetization path (session update 2026-08-17) — not a deposit/withdraw treasury cut.

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

User-side Transak fees are Transak’s (card ~3.5–5.5%, bank/Interac much lower). After KYB,
a small Transak **partner fee on the buy** is the Openhand monetization path (session
update 2026-08-17) — not a second cut on Aave/Yearn deposits. Cheapest *user* path in
Canada is still a local exchange + withdraw; cheapest *in-app* Interac → USDC path
without a monthly bill is Transak’s hosted widget.

**Do not wire a second onramp as “failover” until Transak is live and downtime is a real problem.** MoonPay / Privy `useFiatOnramp` / Coinbase Onramp / Reown AppKit onramp are not backups for this corridor (no CA USDC, or cards instead of Interac). Onramper is a paid aggregator ($199/mo) for the same job. Banxa is the only same-class Interac peer; adding it now is a second KYB, second iframe, and a second KYC for the user when Transak is down. The modal already falls back to “send USDC to this address” if the widget session fails. Revisit Banxa only after Transak has been used in production.

## Session update (2026-08-17) — Monetize the onramp, not the deposit

Do **not** turn on `NEXT_PUBLIC_TREASURY_ADDRESS`. The 0.25%/0.25% deposit/withdraw
treasury transfer is money-transmitter-adjacent and a tax on putting dollars to work.
Leave it in the code, leave it dark.

How Openhand gets paid, in order:

1. **Transak partner fee on Buy USDC** after partner KYB. Start ~0.5–1% of the buy.
   Transak takes CAD, runs KYC, sends USDC to the connected wallet. Openhand never
   receives the USDC. Repeat protocol deposits stay fee-free. Confirm split/payout
   with Transak — do not add a second Openhand treasury transfer for this.
2. **Optional 0x `swapFeeBps`** only on opt-in convert-then-deposit (already in
   `lib/swap/zeroex.ts`). Never in front of plain USDC → Aave. Recipient is a
   **cold wallet** (`NEXT_PUBLIC_SWAP_FEE_RECIPIENT`), not a hot treasury and not
   `NEXT_PUBLIC_TREASURY_ADDRESS`. Same rule if a cross-chain **bridge** is added
   later: user-signed tx, fee collected to that cold wallet, Openhand never holds
   the bridged funds.
3. **CAD subscription later** (Stripe) for extras that are not yield (tax export,
   alerts). Never a performance fee on yield.

Do not add Openhand-operated vaults, a skim inside a protocol call, an Openhand
Interac account, a co-signer, or a featured product with an affiliate.

Lumenary/Coinchange stay compliant by registering for money they touch (FINTRAC MSB)
or renting a registered onramp and doing KYB/tax for businesses. Openhand stays
ahead by not touching the money. Paperwork still due before a real Canadian launch:
entity, terms, privacy, risk page, partner map, counsel on FINTRAC/CARF/fees.
Not legal advice.

## Session update (2026-08-18) — LI.FI tokenized stocks on the dashboard

Dashboard tape of tokenized stocks/ETFs via LI.FI (xStocks, Ondo, Backed). Browse
filters only — default list is top 50 by CoinGecko token market cap, no featured ticker,
not added to the yield collection.

- Catalog: `GET /v1/tokens` then classify by issuer naming (LI.FI's only public tag is
  `stablecoin`). Skip unparseable `priceUSD` and ambiguous names. Checksum addresses
  with `getAddress` before `/v1/quote` or LI.FI returns 1003.
- Caps / 24h: CoinGecko `/coins/markets?category=tokenized-stock`, matched by symbol.
  LI.FI has no market-cap or 24h field. Skip unparseable values — do not guess. Cap is
  the token's, not the listed company's. Search still reaches names outside the top 50.
- Swap is wallet-signed approve (exact amount) + `transactionRequest`. Same-chain USDC
  only. Mainnet to execute. No Openhand integrator fee; disclose LI.FI's own fee when
  quoted. Optional server-only `LIFI_API_KEY`.
- **Securities-adjacent.** Not a broker, not the listed share, issuers often exclude US
  retail. Do not add recommendations, allocations, or a suitability questionnaire.
  Flag for compliance review before this is marketed as a stock product.

## Session update (2026-08-19) — cash out + spot crypto tape

Dashboard: one USDC total across Ethereum/Base/Arbitrum (`UsdcCashPanel`) with **Buy USDC**,
**Cash out** (Transak `productsAvailed: SELL`, CAD), and **Move**. Openhand never receives
the USDC. SELL must be enabled on the Transak partner app.

Spot crypto tape (`lib/lifi/crypto.ts`): CoinGecko top-50 market cap ∩ LI.FI-routable
tokens, **sorted by 24h %**. Reorder of live data — not a featured pick, not advice.
Stables omitted. Quote route allowlists stock **or** crypto tape only.

Do not add a “best coin” card or scored ranking beyond this sort.

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

**Still not added:** looping, Uniswap V3 / Aerodrome LP, GMX, Pendle, a strategy/allocation page, or any Openhand-run options vault.

## Session update (2026-08-18) — installable PWA / app shell

Openhand installs as a home-screen app (PWA). Not an App Store/Play binary, not
Capacitor/Electron — those wrappers break WalletConnect return-to-app and Transak.

- Manifest: `app/manifest.ts` (`display: standalone`, maskable icon, Collection/Dashboard
  shortcuts). Icons regenerated from `public/icons/icon.svg` (Openhand “O”).
- Service worker: `public/sw.js`, registered only in production
  (`components/ServiceWorkerRegister.tsx`). Network-first navigations → `/offline.html`.
  **Never cache `/api/*` or cross-origin RPC/protocol responses.** Do not swap in
  `next-pwa` / Serwist default runtime caching — stale APY as “live” violates
  non-negotiable #3.
- Chrome: sticky header with safe-area inset, mobile tab bar is the phone nav
  (desktop links stay in the top bar), deposit/onramp sheets full-bleed on small
  screens. Install prompt is a dismissible toast (`oh.install.dismissedAt`, 14-day
  snooze); iOS hint is Safari-only.
- `sw.js` is served with `Cache-Control: no-cache` so updates apply. Bump the
  `CACHE` constant in `public/sw.js` if the worker logic changes.

## Session update (2026-08-21) — Transak KYB site (do not get rejected again)

Transak needs a live site that matches the KYB filing, Terms that **include Transak ToS**,
and a user journey that lets people **review and acknowledge** those T&Cs before checkout
(https://docs.transak.com/integration/api). The 2026-08-19 polish (PR #31 revert) hardcoded
HYPERFLEX / `hello@openhand.money` and was undone — do not restore that. Product domain is
`openhand.online`; contact default is `hello@openhand.online`.

What is in the product now:

- Server-rendered `/about`, `/terms`, `/privacy`, `/risk`, `/partners`, `/support`,
  `/buy-usdc`, `/refunds`, `/contact` under `app/(legal)` — **no wallet providers**.
  `/tos` → `/terms`, `/privacy-policy` → `/privacy`.
- Stale CSS/JS chunk failures auto hard-reload once so reviewers are not stuck on
  “Loading CSS chunk failed” (that white-screen was cited in the last KYB rejection).
- `npm run smoke:public` checks live www `/terms` includes Transak ToS. Do not
  resubmit KYB until that command passes on production after merge.
- `/terms` incorporates Transak ToS (and US ToS) by reference; Transak is merchant of
  record for CAD↔USDC; Openhand never receives those funds.
- `OnrampModal` does **not** load the iframe until an unchecked-by-default checkbox
  acknowledging Openhand Terms + Transak ToS + Transak Privacy.
- Widget BFF: CORS lock, production `x-user-ip` required, server-only API key, allowlisted
  `referrerDomain` (not a raw Referer).
- Operator identity is `NEXT_PUBLIC_OPERATOR_*` (legal name, address, jurisdiction,
  email, phone). Do not invent an entity in code — set env to match the KYB form
  before resubmitting.
- Footer company links; How it works on first session; LI.FI tapes labeled as not Transak.

Still ops, not code: corporate inbox, HubSpot integration checklist, KYB form with the
`/partners` nature-of-business paragraph, Transak host allowlist, Vercel static IPs,
SELL enabled, partner fee in Transak dashboard. Do not turn on `NEXT_PUBLIC_TREASURY_ADDRESS`.

## Session update (2026-09-04) — Phase 0 survey + Phase 1 monorepo scaffold (repo split)

Started splitting protocol integration logic out of the web app into standalone,
independently testable packages, per an external repo-split brief. Working through it in
phases, stopping after each for a go/no-ahead rather than doing it as one large refactor.

**Repo layout note — every path elsewhere in this file is now one level off.** Everything
that used to sit at the repo root (`app/`, `components/`, `lib/`, `public/`, `migrations/`,
`scripts/`, `middleware.ts`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`,
`tsconfig.json`, `.eslintrc.json`, `.env.example`, `vercel.json`) now lives under `apps/web/`.
So every path cited above and in earlier session updates — `lib/wagmi.ts`,
`components/DepositWithdrawModal.tsx`, `lib/config/addresses.ts`, `lib/config/fees.ts`, all of
it — reads as `apps/web/lib/wagmi.ts`, `apps/web/components/DepositWithdrawModal.tsx`, etc.
Nothing else changed: file contents, behavior, and every non-negotiable in this file still
apply exactly as written, just one directory deeper.

**Phase 0 (survey, no code changes) found:** `lib/protocols/*.ts` is a rate catalog, not an
adapter layer — each file only fetches APY + builds `Opportunity` metadata. The real
deposit/withdraw transaction-building logic is ~750 lines of if/else inside
`DepositWithdrawModal.tsx`, interleaved with React state, live on-chain slippage-preview
reads, and the fee transfer. Position-reading is similarly inline in
`lib/hooks/usePositions.ts`. **Phase 2 (adapter extraction) is scoped as a rewrite of that
component's deposit/withdraw branches into real adapters, not a file move.** No private key,
server-side signer, or `createWalletClient` exists anywhere in the codebase — every
value-moving call is wagmi's `writeContract`/`sendTransaction`, invoked from a `'use client'`
component or hook, confirmed by full grep. Zero test coverage (no Jest/Vitest/Hardhat/Foundry)
going in — Phase 3's fork-test suite starts from nothing.

**Cut from the "26 opportunities" catalog before Phase 2, by owner decision:**
- **Convex cvxCRV** — one-way CRV→cvxCRV conversion; withdraw returns cvxCRV, not the CRV
  deposited. A trap in a product whose pitch is honesty, and the only reason a one-way
  exit-profile category was needed at all.
- **Curve** (crvUSD/USDC + 3pool) — LP/slippage mechanics are a different product from
  lending; mainnet-only, unverified live API field shape, wasn't even in the original
  repo-split brief's protocol list.
- **Frax sfrxUSD** — deposit asset is frxUSD, which no one arriving via Transak (CAD→USDC)
  actually holds. Unreachable opportunity.
- **Panoptic Unicorn** — options/volatility strategy; cheap to keep technically (plain
  ERC-4626) but not a risk badge a buyer's compliance team would accept.

**Kept, going into Phase 2 (9 protocols):** Aave v3, Compound III, Morpho, Yearn v3, Fluid,
Sky, Moonwell, Maple, Lido. Yearn v3/Morpho/Fluid share the ERC-4626 interface already (base
`ERC4626Adapter` batch); Aave v3/Compound III/Sky/Maple/Lido are one-offs. `exitProfile()`
only needs instant vs. queued now — Lido (queued, separate claim tx) and Maple (FIFO push
payout, no claim tx, and first-time wallets must complete lender auth on syrup.fi before
depositing — Maple is the most likely of the 9 to get cut later if its fork test is painful).
DeFiLlama, after the cuts, is the *primary* rate source for exactly two of the 9 kept
protocols (Sky, Fluid) — down from five across the original 13 — worth having answered before
diligence asks "what happens if one aggregator goes down."

**Aave and Moonwell's APY formulas were verified against official sources, not just
plausibility-checked:** Aave's own `aave-utilities` library (the code behind app.aave.com's
displayed rate) uses `calculateCompoundedRate({ rate: liquidityRate, duration:
SECONDS_PER_YEAR })`, which is exactly `(1 + (liquidityRate/RAY)/SECONDS_PER_YEAR)^
SECONDS_PER_YEAR - 1` — the same formula already in `lib/protocols/aave.ts`. Moonwell's
`(ratePerSecond * 86400 + 1)^365 - 1` matches the documented Compound-derived per-timestamp
APY conversion (the code's own comment already cited the Moonwell SDK's `calculateApy` as the
source). Both check out; no rate math needs fixing before Phase 2.

**Phase 1 (this update) scaffolded an npm-workspaces monorepo — no logic moved, no
dependencies added beyond what already existed (`typescript`), existing site untouched
content-wise:**
- `apps/web` — the former repo root, moved via `git mv` (history preserved), package renamed
  to `@defiant/web`. No file contents changed.
- `packages/core`, `packages/risk`, `packages/api` — empty scaffolds (placeholder
  `src/index.ts`, own `package.json`/`tsconfig.json`/`README.md`). `packages/api` pre-wires a
  workspace dependency + TS project reference on `core` and `risk` for Phase 5, even though
  nothing imports either yet.
- Root `package.json` gained `"workspaces": ["apps/*", "packages/*"]` and now delegates
  `dev`/`build`/`start`/`lint`/`smoke:public` to `@defiant/web`; `typecheck` runs
  `--workspaces --if-present` so it covers the new packages too as they gain real code.
- Root `tsconfig.json` is a solution-style file referencing the three new packages only.
  **`apps/web` was deliberately left out of the TS project-references graph** — its tsconfig
  is Next.js-flavored (`noEmit`, `moduleResolution: bundler`) and not `composite`, and forcing
  that would risk changing how Next type-checks or builds it. Wire `apps/web` in only once
  Phase 2 gives it a real import from `packages/core` to justify the edge.
- **Vercel needs a manual settings change before this branch can ever deploy successfully:**
  Project Settings → General → Root Directory must be set to `apps/web` (`vercel.json` moved
  there with the rest of the app). Until that's done, a Vercel build at the old repo root will
  not find the Next.js app. This is an ops action outside what code in this repo can do —
  flagging per this file's own "if a change would break the live site, stop and tell me" rule,
  not glossing over it. The live site is unaffected by this branch until it's merged and that
  setting is changed.
- Not yet done: `npm install` to regenerate the workspace-aware `package-lock.json`, and a
  clean `typecheck`/`build` run from the new layout to confirm nothing broke in the move.

## Session update (2026-09-04) — RWA Terminal Phase 1: stock-tape data integrity

Checked in `BUILD_SPEC.md` (the phased plan this session was given — Phase 1: data layer
integrity, Phase 2: execution, Phase 3: cross-chain arb detection) so future sessions have
it in-tree instead of only in an issue/PR description. Read it before touching the
tokenized-stock tape further — it tracks P0/P1/P2 status per phase.

Implemented Phase 1's P0 list against the existing LI.FI tokenized-stock tape
(`components/StockDesk.tsx`):

- **Address-keyed mapping, not symbol matching.** `lib/lifi/marketCap.ts` used to join
  LI.FI catalog rows onto CoinGecko's `tokenized-stock` category by lowercased ticker
  symbol — two issuers wrapping the same underlying stock under the same ticker would
  silently misattribute cap/price to the wrong token. It now builds a
  `{chainId}-{address}` → CoinGecko stats map at fetch time by joining CoinGecko's
  `/coins/list?include_platform=true` (contract addresses per chain, per CoinGecko coin
  id) against the `tokenized-stock` category (cap/24h%/`last_updated`) on CoinGecko's own
  coin id. No contract address is hand-typed into this codebase for it — the map is data,
  not authored addresses, so non-negotiable #5's "cite a verified source" doesn't apply
  the way it does to `lib/config/addresses.ts`, but the mechanism is worth understanding
  before changing it. `lib/lifi/stocks.ts#withStockMarketCaps` now looks up by
  `${token.chainId}-${token.address.toLowerCase()}` instead of `token.symbol`.
- **Staleness flag.** CoinGecko's own `last_updated` per row (not our fetch time) drives
  `capStale`; `MARKET_DATA_STALE_MINUTES = 15`. Shown as a "· stale" badge next to the cap
  in `StockDesk.tsx`, with the real timestamp in a tooltip.
- **Unmatched rows are no longer silently dropped.** Two separate bugs fixed here:
  (1) `StockDesk.tsx`'s default (no-search) filter used to require
  `t.marketCapUsd !== undefined`, i.e. it hid every row without a CoinGecko match from the
  default tape view entirely — removed; the existing cap-first sort
  (`compareStockTape`) still puts capped rows first, uncapped ones just aren't hidden
  outright anymore. (2) Uncapped rows now render an explicit **"No cap data"** state
  instead of the old ambiguous "LI.FI last" label.
- **Admin visibility.** `/admin/stocks` (password-gated via the existing `isAdminSession()`
  cookie/middleware pattern, same as `/admin`) lists both directions of mismatch: LI.FI
  rows classified as a stock/ETF with no CoinGecko address match, and CoinGecko
  `tokenized-stock` coins with no contract address on Ethereum/Base/Arbitrum (usually
  non-EVM issuance, e.g. Solana-only). Backed by
  `app/api/admin/stocks-unmatched/route.ts`. Linked from the main `/admin` dashboard.
- **Per-row source attribution.** Each tape row now shows a small footer — "Price · LI.FI"
  or "Price · LI.FI · Cap · CoinGecko" — so it's visually explicit these are two different
  feeds being joined, not one unified one.
- **Cache layer (P1, done alongside P0 since the address map is one large
  `/coins/list?include_platform=true` payload).** 10-minute in-memory cache
  (`lib/lifi/marketCap.ts`), with an in-flight-request guard so concurrent requests don't
  trigger duplicate CoinGecko calls, and stale-cache fallback if a refresh fetch fails.

Not done from Phase 1: the P1 "flag LI.FI vs. CoinGecko price divergence >X%" cross-check
(this is also the Phase 3 arb signal — worth building once Phase 1's address map is
trusted in production) and the P2 "move off CoinGecko's free tier" question (revisit once
there's revenue). `npm run typecheck` and `npm run build` both pass clean. Not
transaction-tested and not live-verified against CoinGecko/LI.FI from this sandbox (same
network-reachability caveat as the original Yearn/Curve integrations, "Current state"
above) — smoke-test the `/coins/list?include_platform=true` join and the "No cap data" /
"stale" UI states against the live tape before trusting them for a real launch.

Phase 2 (execution) is largely already built on top of the tape this session touched —
wallet connect, per-row LI.FI quote with an explicit confirm step, route/fee display, and
mainnet-gating all exist in `components/StockSwapModal.tsx` already. See the note left in
`BUILD_SPEC.md` under Phase 2.

## Session update (2026-09-04, continued) — live-join blocker + Phase 3 arb detection

Was asked to smoke-test the Phase 1 CoinGecko/LI.FI join against live data before doing
anything else. Confirmed by hand (`curl` through the sandbox's egress proxy) that this
sandbox blocks **both** `api.coingecko.com` and `li.quest` outright (403 on CONNECT,
`connect_rejected` per `/__agentproxy/status`) — the exact same class of restriction
already on record in this file for `ydaemon.yearn.fi`/`api.curve.finance`. The address
join has still never run against live data. Do not re-attempt this smoke test from a
Claude Code **sandbox** session — it will hit the same block. It needs to run somewhere
with real egress: `npm run smoke:stocks` (added this session,
`scripts/smoke-stock-market-data.mjs`, now also a step in `production-smoke.yml`) hits
the public `/api/lifi/stocks` route and fails if the unmatched or stale ratio looks
structurally broken rather than like normal coverage gaps (a handful of unmatched rows is
expected — non-EVM issuance, thin/delisted names; see `/admin/stocks`). **Run
`npm run smoke:stocks` against production, or open `/admin/stocks`, before trusting the
Phase 1 mapping table or building further on top of it.**

Added the Phase 1 P1 divergence check that was skipped in the first pass, since it's also
Phase 3's prerequisite: `StockToken#priceDivergencePct` (`lib/lifi/stocks.ts`) compares
LI.FI's `priceUsd` against CoinGecko's own spot price (`current_price`, now captured
alongside `total_volume` in `lib/lifi/marketCap.ts`) for the same matched coin, flagged at
`PRICE_DIVERGENCE_FLAG_PCT = 1.5`. Surfaced in a new `/admin/stocks` table — a run where
many rows diverge by a similar amount would mean the join is wrong (e.g. a platform id
mapped to the wrong chain), not that every token individually mispriced.

Built Phase 3 P0 (cross-chain spread detection) on top of that:

- `lib/lifi/stockArb.ts#computeStockArbRows` groups a token's chain instances by
  CoinGecko's `cgeckoId` — Phase 1's proven-same-asset identity — **never** by ticker
  symbol, so this doesn't inherit the exact misattribution risk Phase 1 fixed. It compares
  LI.FI's own `priceUsd` *across chains* for that asset (this is the cross-chain signal;
  Phase 1's `priceDivergencePct` above is the cross-*source*, same-chain signal — they are
  not the same check). `MIN_SPREAD_PCT = 0.5` filters noise; rows sort by spread desc.
- `MIN_24H_VOLUME_USD = 50_000` is the "minimum-liquidity filter" the spec asks for, using
  CoinGecko's global 24h volume as a coarse proxy — this is **not** on-chain DEX depth on
  either leg's specific chain, since no real per-chain liquidity source exists in this app
  yet. Rows below it are kept visible but marked "Non-executable" with the trade button
  disabled, rather than dropped outright, matching the Phase 1 "never silently drop a row"
  fix earlier in this same file.
- `components/StockArbPanel.tsx` renders the top spreads inside `StockDesk`, fed the full
  un-deduped multi-chain catalog (not the chain/issuer-filtered, `preferOneChainPerSymbol`
  view used by the main tape — arb needs to see every chain instance at once). "Buy cheaper
  leg" opens the existing `StockSwapModal` pre-filled with the lower-priced chain instance —
  there is no cross-chain atomic execution in this app, so the actionable half of "capture
  the spread" is buying the underpriced leg, not an automated round-trip.

Not done: Phase 3's two P1 nice-to-haves (historical spread chart, threshold alerts) and
live verification of any of this — same sandbox network block as above. `npm run
typecheck`, `npm run lint`, and `npm run build` all pass clean. Before trusting the arb
panel's numbers: confirm the Phase 1 join first (see above), then sanity-check a handful
of `computeStockArbRows` outputs by hand against LI.FI's actual per-chain prices.

## Session update (2026-09-05) — Phase 3 rebuilt against a fuller spec

Was handed a materially more detailed Phase 3 spec than the terse bullets in the original
`BUILD_SPEC.md` (now folded in, replacing that section — read it there, not here, for the
full acceptance criteria). Reconciled the prior day's first-pass Phase 3 work against it:

- **Liquidity gate is now a real LI.FI quote, not the CoinGecko-volume proxy.**
  `lib/lifi/stockArb.ts#enrichArbRows` fires one `/v1/quote` per candidate row (bounded to
  the top `ARB_ENRICH_LIMIT = 12` by gross spread, to cap external calls) for a
  `$1,000` probe buy of the low (cheap) leg, using `getAddress('0x...dead')` — a well-known
  burn address — as the required `fromAddress`. It never signs or sends anything; it is a
  GET-only quote call. The quote's implied execution price vs. that leg's own listed
  `priceUsd` gives a real price-impact number (`priceImpactPct`); `protocolFeeUsd` gives
  the fee. `MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY = 1.5` gates `liquidityOk`.
- **Fee-adjusted net spread**, subtracting both of those from gross. Important limitation
  that the spec's wording glossed over and this build states explicitly instead of
  quietly assuming away: **there is no cross-chain execution in this app**, so
  `netSpreadPct` only nets out the cost of *buying* the cheap leg — there's no sell-side
  quote on the expensive leg to net against, so it is not a full round-trip P&L. Said
  plainly in `lib/lifi/stockArb.ts` and in the panel's own copy so it doesn't read as a
  bigger promise than it is.
- **"Spread %" is now a real column + sort on the main tape** (`StockDesk.tsx`), not only
  the separate panel from the first pass — `useStockArbRows()` (new hook,
  `/api/lifi/stock-arb`, new route) attaches enriched rows onto matching tape rows by
  `cgeckoId`, and a "Sort: Spread" pill sits next to the existing chain/issuer filters.
  Kept the standalone `StockArbPanel` too (top-N summary) — the spec's acceptance
  criteria describes a tape column, the original Phase 3 draft's panel is still a useful
  "what are the biggest opportunities right now" view, and nothing about keeping both
  conflicts with the new spec.
- **Non-executable handling, per the acceptance criteria's own split:** a *verified*
  net spread ≤ 0 is dropped from the result set entirely (`enrichArbRows` filters it out
  — matches "excluded... entirely"). Everything else — thin liquidity, or enrichment
  that wasn't attempted/failed — stays visible, clearly marked ("Non-executable" /
  "Unverified"), never hidden. That split is deliberate: an *unverified* row's true net
  spread isn't known, so excluding it outright would be guessing in the other direction.
- **Staleness now inherited into the spread display**: `StockArbRow.matchStale` is true
  when either leg's Phase 1 `capStale` flag is set, shown as a "stale match" badge.
- New `npm run smoke:stock-arb` (`scripts/smoke-stock-arb.mjs`) — checks internal math
  consistency (recomputes gross spread from each row's own legs, checks net ≤ gross,
  checks the exclusion rule actually fired) and prints the top rows for a human to
  eyeball against LI.FI directly. Deliberately **not** added to the scheduled
  `production-smoke.yml` run (unlike `smoke:stocks`) — it fires real LI.FI quotes and is
  the least-tested piece in this whole build; run it by hand when validating this
  feature, not on an unattended 30-minute cron.

**Still blocked, same as every prior note on this topic:** this sandbox has no route to
`api.coingecko.com` or `li.quest`, so none of Phase 3 — the address grouping, the probe
quotes, the fee/impact math — has run against live data. The acceptance criteria's own
"manually verify 2-3 known multi-chain tokens" step has not happened and cannot happen
from here. Run `npm run smoke:stock-arb` against production, or open the tape and sort by
spread, before trusting any "executable" label this feature shows. `npm run typecheck`,
`npm run lint`, and `npm run build` all pass clean.

## Session update (2026-09-05, continued) — Phase 3b: round-trip spread verification

Was handed a Phase 3b spec pointing at the exact gap the last update's own copy already
half-admitted: Phase 3's "Spread %" only ever verified the *buy* leg. With no cross-chain
execution in the app, that number wasn't actually capturable — showing "Spread %" for a
half-verified figure was presenting an unverified claim as a verified one. Full detail is
now in `BUILD_SPEC.md`'s "Phase 3b" section (the terse version below is not a substitute).

**Did the spec's own step 1 immediately, before anything else:** relabeled the tape column,
sort pill, and panel copy to say "buy-leg spread" / "not a round trip" (commit `dd04523`),
so nothing misleading stayed live while the real fix was built.

**Then asked, rather than assumed, the one genuinely open product question:** the spec's
net-spread formula referenced a sell-leg quote and a conditional "bridge cost if
applicable" without saying what actually moves — bridge the purchased token, or assume the
user already holds capital on both chains. The spec itself flagged this as needing
resolution before implementation, not discovery mid-build, so it went to
`AskUserQuestion` instead of a guess. Answer: **bridge the actual purchased token.**

**What got built**, per that answer:
- `lib/lifi/stocks.ts#fetchLifiQuote` gained an optional `toChainId` param (defaults to
  `chainId`, so every existing same-chain caller — the Phase 2 swap route, the Phase 3
  buy-leg probe — is unaffected) and `LifiQuote` gained a `toChainId` field.
- `lib/lifi/stockArb.ts#verifyArbCandidate` now does two sequential quotes per candidate:
  the existing $1,000 buy-leg probe, then — only if that clears its own liquidity gate —
  a single **cross-chain** LI.FI quote (`fromChain` = cheap leg, `toChain` = expensive leg,
  `fromToken` = the token the buy quote would actually produce, `toToken` = USDC on the
  expensive chain) using the buy quote's real `toAmount` as input. LI.FI's own routing
  picks the bridge+swap path, so its output already nets out bridge cost and sell-side
  slippage in one number — no separate "bridge_cost_if_applicable" line item needed; a
  single combined quote is a more accurate answer to "what would I actually net" than
  reassembling one from parts LI.FI has already jointly optimized.
- `netSpreadPct` is now `(bridge-quote proceeds - $1,000) / $1,000` — a genuine round-trip
  figure. "Spread %" is restored as the label (it's earned now) in both `StockDesk.tsx`
  and `StockArbPanel.tsx`.
- **Deliberate departure from Phase 1/Phase 3's "mark, don't hide" stance**: a candidate
  that fails either leg's quote, either leg's liquidity gate (`buyLegPriceImpactPct` /
  `bridgeLegPriceImpactPct`, both checked against the existing
  `MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY`), or nets non-positive is **dropped entirely**, not
  shown marked "unverified." Phase 3b's own acceptance criteria says so directly: "a
  verified buy leg with an unverified sell leg is not enough to show a number." The
  `enrichmentVerified`/`liquidityOk` fields from Phase 3 are gone — `StockArbRow` has no
  unverified variant anymore; every row `fetchStockArbRows()` returns already cleared the
  whole pipeline. This is a considered exception to the "never silently drop a row"
  principle from earlier in this file, not a quiet regression of it — the reasoning is in
  `lib/lifi/stockArb.ts`'s module doc comment and in `BUILD_SPEC.md`.
- `ARB_ENRICH_LIMIT` cut from 12 to **8** (each candidate now costs up to two external
  calls, not one — worst case 16 vs. the old 12) and the cache TTL raised from 5 to 10
  minutes, since the whole build is now more expensive.
- **What still doesn't exist: executing the second leg.** `StockSwapModal` only signs
  same-chain swaps. "Buy cheaper leg" still only executes the buy; completing the verified
  bridge+sell happens outside the app for now. Said explicitly in the panel copy and in
  `BUILD_SPEC.md` rather than letting "round-trip verified" quietly imply "one-click round
  trip" — building that execution flow is real fund-moving surface this sandbox can't
  validate, and felt like the wrong thing to rush into the same commit as the verification
  fix.
- `npm run smoke:stock-arb` rewritten for the new contract: every returned row must have a
  defined, positive `netSpreadPct` no greater than `grossSpreadPct`, plus the diagnostic
  impact fields present. Zero rows is explicitly *not* treated as an automatic pass in the
  script's own output — round-trip verification is a high bar, and zero could mean "no
  opportunities" or "every candidate is silently erroring," which look identical without
  a human checking.

**Blocked, again, on the same thing:** this sandbox still has no route to
`api.coingecko.com` or `li.quest`. The cross-chain bridge-quote code path is brand new and
has *never* been exercised against live LI.FI — treat it as less proven than Phase 3's
original buy-only probe, which was already unverified. `npm run typecheck`, `npm run
lint`, and `npm run build` all pass clean. Run `npm run smoke:stock-arb` against
production before trusting a single "round-trip verified" number this feature shows.

## Session update (2026-09-07) — merged main (RWA Terminal) into the repo-split branch

The RWA Terminal work above (all four Phase-1-through-3b session updates) landed on `main`
via PR #51 while the repo-split branch was mid-flight, at the old flat repo paths (`app/`,
`components/`, `lib/`, `scripts/`) — merged into this branch afterward. Git's rename-aware
merge auto-applied most of it onto the equivalent `apps/web/` paths without help; five
brand-new files (`components/StockArbPanel.tsx`, `lib/hooks/useStockArbRows.ts`,
`lib/lifi/stockArb.ts`, `scripts/smoke-stock-arb.mjs`, `scripts/smoke-stock-market-data.mjs`)
and three new Next.js routes (`app/admin/stocks/page.tsx`,
`app/api/admin/stocks-unmatched/route.ts`, `app/api/lifi/stock-arb/route.ts`) needed a manual
`git mv` into `apps/web/` since they didn't exist yet at merge-base to rename from.
`BUILD_SPEC.md` stayed at the repo root, alongside `README.md`/`CLAUDE.md`, since it's
product/phase documentation rather than app code. `package.json` conflict resolved by adding
main's two new smoke scripts (`smoke:stocks`, `smoke:stock-arb`) into `apps/web/package.json`
(where the script files now live) and as matching delegating entries at the root, next to
the existing `smoke:public` one. Verified `npm run typecheck`, `npm run lint`, and
`npm run build` all still pass after the merge — see below.

## Session update (2026-09-07) — cut Convex/Curve/Frax/Panoptic from the catalog

Executed the cut decided during the Phase 0 review (recorded 2026-09-04 above) — that update
only recorded the decision, this one removes the code. Removed everywhere: `ProtocolId` union,
`ERC4626_PROTOCOLS`/`CONVERT_TO_ASSETS_PROTOCOLS`, `hasTokenEmissions`, the `Opportunity.curve`
and now-orphaned `Opportunity.convertibleFrom` fields, `aggregate.ts`'s fetch calls,
`cardBadges.ts`/`apyHistory.ts`/`opportunityDetails.ts`'s per-protocol branches, the `CURVE`/
`CONVEX`/`FRAX`/`PANOPTIC` exports in `lib/config/addresses.ts`, the standalone
`lib/protocols/{convex,curve,frax,panoptic}.ts` and `lib/abi/{convex,curvePool}.ts` files, and
every Curve/Convex/Panoptic branch inside `DepositWithdrawModal.tsx` (its Curve preview/
slippage/min-out block, ~100 lines, is gone entirely) and `HarvestRewards.tsx` (now
Moonwell-only — its Convex CRV/CVX claim path and reward lookup are gone). While already
rewriting `DepositWithdrawModal.tsx`'s withdraw branches, also collapsed the duplicate
`ERC4626_PROTOCOLS && protocol !== 'yearn-v3'` / `protocol === 'yearn-v3'` branches the Phase 0
survey flagged as redundant into one — same behavior, less code, and it was already being
touched by this same edit so this isn't a separate drive-by fix. `README.md`'s "Protocols
integrated" table was stale in the other direction too — it had never been updated when
Compound III/Morpho/Fluid/Moonwell were added in earlier sessions, so fixing it now made it
list all 9 kept protocols correctly instead of just adding the cut back in reverse. `npm run
typecheck`, `npm run lint`, and `npm run build` all pass clean (still 22 routes, nothing
regressed). This was prerequisite groundwork for Phase 2, not Phase 2 itself — Phase 2 (the
ERC4626Adapter extraction for Yearn v3/Morpho/Fluid into `packages/core`) starts next.

## Session update (2026-09-05, continued) — merged to main without live verification

PR #51 (this branch — Phase 1 + Phase 3 + Phase 3b, both session updates above) was
merged to `main` by the repo owner, who confirmed via the Vercel preview first. **Neither
`npm run smoke:stocks` nor `npm run smoke:stock-arb` was run before merging** — the PR's
own test-plan checkboxes for both are unchecked. This is a real, open gap, not a
formality: every number this feature shows (the CoinGecko/LI.FI address join, the
buy-leg probe, the brand-new cross-chain bridge-quote path) is still exactly as unverified
against live data as every prior note in this file says. It is now live in production
instead of sitting in a PR, which makes running those two commands against
`openhand.online` more urgent, not less. If a future session is asked to touch the stock
tape again, check whether that's happened yet before assuming any of this is trustworthy.

Also: while diagnosing why the preview "looked like the same site," it's worth recording
that both `/admin/stocks` and the tape's own "Cross-chain spread" panel/column render
**nothing at all** when `fetchStockArbRows()` returns zero rows — which round-trip
verification is deliberately strict enough to do often. A future session confirming this
feature works should check `/api/lifi/stock-arb`'s raw JSON directly (`{"rows":[...]}` vs
`{"rows":[]}`), not just eyeball the dashboard, since an empty result and a broken
endpoint look identical in the UI.

## Session update (2026-09-06) — live `/api/lifi/stocks` output reviewed; two fixes

The repo owner hit production's `/api/lifi/stocks` directly and pasted the raw JSON back
for review — the first real look at Phase 1's live output since PR #51 merged (see
2026-09-05 note above; the two smoke scripts still had not been run). Two findings, both
now fixed on this branch:

1. **`scripts/smoke-stock-market-data.mjs`'s `MAX_UNMATCHED_RATIO = 0.5` was miscalibrated.**
   Real production data shows the unmatched ratio running well above 50% — expected, not a
   bug: Ondo Global Markets + xStocks + Backed between them cover close to the full US
   equity universe on LI.FI's catalog, while CoinGecko's `tokenized-stock` category tracks
   only a fraction of that (maybe 100-150 names). The script's ratio check was failing on
   healthy coverage gaps, not real breakage. Fixed by raising the ratio ceiling to 0.97 and
   adding a second, ratio-independent check (`MIN_ABSOLUTE_MATCHES = 5` on catalogs of
   `MIN_ROWS_FOR_RATIO_CHECK = 20`+ rows) that actually catches the failure mode a ratio
   can't: the join finding almost nothing at all (wrong CoinGecko platform-id strings, a
   changed endpoint shape), independent of how large the catalog is.
2. **LI.FI's own `priceUSD` is frequently and severely wrong for tokenized stocks, and this
   was invisible to depositors.** The pasted production JSON showed `priceDivergencePct`
   values (a field Phase 1 already computed) as high as +835% on at least one row (NVDAx).
   That field was only ever surfaced in the admin divergence table
   (`/admin/stocks`), tuned at `PRICE_DIVERGENCE_FLAG_PCT = 1.5%` for spotting a broken
   *join* (many rows off by a similar amount). It was never shown to a depositor looking at
   the public tape, who had no way to know a listed price might be wildly off. Fixed with a
   second, higher, display-only threshold — `PRICE_DIVERGENCE_WARN_PCT = 10` in
   `lib/lifi/stocks.ts` — and a "⚠ price mismatch" badge in `components/StockDesk.tsx`,
   same "mark, don't hide" pattern as the existing `capStale` badge. Tooltip states the
   actual divergence and direction. This is display-only: `StockSwapModal` already
   re-quotes live at execution time regardless of the cached catalog's `priceUsd`, so this
   was never a funds-safety gap — it was a discovery/trust gap (a depositor eyeballing the
   tape had no way to know a number might be badly wrong before opening the swap modal).

Both fixes are narrow and don't touch the underlying join, arb, or quote logic — this was
about the display/monitoring layer catching up to what the live data already showed.
`npm run typecheck`, `npm run lint`, and `npm run build` all pass clean. Still not
verified: whether the new 0.97/absolute-match thresholds and the 10% warn threshold are
themselves well-tuned in practice — both were picked from a single data pull, not a
distribution. Run `npm run smoke:stocks` against production again and watch for either
threshold tripping on genuinely healthy data, or the new badge appearing so often (or so
rarely) that it stops being a useful signal — adjust the constants in
`lib/lifi/stocks.ts` / `scripts/smoke-stock-market-data.mjs` if so. `npm run
smoke:stock-arb` still has not been run against production — that gap from the prior
entry is unchanged.

## Session update (2026-09-07) — agent infrastructure spec checked in; B2 shipped

Checked in `AGENT_INFRASTRUCTURE_SPEC.md` — a two-track plan (Track A: research/monitoring
agents, Track B: dev-acceleration agents) that was pasted in full, explicitly scoped to
exclude any autonomous execution/fund-movement agent for now. Read that file, not this
summary, for the full text and per-item status; it's the same "check the spec into the
repo instead of leaving it only in a message" pattern as `BUILD_SPEC.md`.

Implemented the one item the spec's own sequencing puts first and calls cheapest
regardless of anything else — **B2, automated smoke-test reporting**
(`.github/workflows/production-smoke.yml`):

- Both smoke jobs now open (or comment on) a tracking GitHub issue
  (`production-smoke-failure` label) on failure, via `actions/github-script` using the
  workflow's own `GITHUB_TOKEN` — no new secrets. A subsequent passing run closes the
  issue automatically. Before this, a failure was only a red run in the Actions tab that
  required someone to go look.
- **`npm run smoke:stock-arb` is now scheduled too**, which the spec explicitly asked for
  ("wire these into a scheduled job... that runs automatically") — but on its own
  `0 */4 * * *` cron, separate from the existing `*/30 * * * *` cron the cheap checks
  (`smoke:public`, `smoke:stocks`) stay on. This is a deliberate, stated departure from
  putting it on the same 30-minute cadence: the 2026-09-05 entry above left
  `smoke:stock-arb` off the schedule specifically because it fires real LI.FI quotes per
  candidate row (up to `ARB_ENRICH_LIMIT × 2` = 16 quote calls per run) and is the
  least-tested piece of the whole build — running that every 30 minutes unattended would
  multiply external-API cost and risk on exactly the code this repo has repeatedly flagged
  as needing the most scrutiny, and conflicts with the new spec's own Track A guardrail
  ("scheduled agents polling LI.FI/CoinGecko... need their own budget"). A 4-hour cadence
  resolves the "someone has to remember to run this by hand" gap without ignoring that
  caution. `workflow_dispatch` still runs both jobs immediately on demand, as before.

**What from the spec was not built, and why:** A1 (arb/spread watcher with persisted
history + Slack/email alerts), A2 (new-listing scout with an admin-approval mapping flow),
and B3 (cross-deploy regression diffing) all need a decision this session can't make
silently — either a new persistence store (this app's only server-side table today is the
anonymous `site_events` one; a spread-history or metrics-history table is a different,
new piece of infrastructure) or an alerting destination (a Slack webhook URL, email
service) that isn't configured anywhere in this repo. A4 (data health watcher) is only
*partially* covered by B2 above: B2 turns the smoke script's existing fixed thresholds
into a tracked alert, which is fixed-threshold alerting, not the trend/spike detection
A4's own wording asks for ("staleness rates spike") — that needs the same persisted
history A1/B3 are blocked on. A3 (competitor/landscape watcher) isn't code at all — it's a
recurring research task, not something this session builds. B4 is explicitly sequenced
last in the spec itself. See `AGENT_INFRASTRUCTURE_SPEC.md` for the per-item detail and
status annotations, so a future session doesn't have to re-derive this from the diff.

No app code changed this session — only the GitHub Actions workflow and the new spec
doc. `npm run typecheck` and `npm run lint` pass clean (nothing to rebuild). The new
workflow YAML was parsed with `js-yaml`/PyYAML to confirm it's well-formed, but — same
caveat as everything else that depends on GitHub Actions in this repo — it has not
actually been exercised by a real workflow run yet (issue creation, the two cron
schedules firing correctly, the close-on-recovery step). Watch the Actions tab after this
merges, or trigger it manually via `workflow_dispatch`, before assuming the alerting
actually fires the way this description says it should.

## Session update (2026-09-07, continued) — persistence-layer spec checked in; schema drafted

Checked in `INFRA_PERSISTENCE_SPEC.md` — a Postgres persistence-layer plan (unblocks A1's
spread history and B3's regression diffing from `AGENT_INFRASTRUCTURE_SPEC.md`) that
explicitly listed three open questions before implementation could start.

Answered the engineering one from the repo itself, no need to ask: this repo has no ORM
or migration tool (nothing in `package.json`) — `migrations/002_site_analytics.sql`'s
hand-numbered raw-SQL, applied-by-hand pattern is the only precedent, so the new tables
follow that, not a framework.

The other two — Railway project topology, and retention window — were genuinely the
owner's call (irreversible-feeling infra decisions this session can't make silently, and
this sandbox has no Railway access to act on either answer anyway), so they went through
`AskUserQuestion` rather than a guess. Answered: **same Railway project as HYPERFLEX, but
a new, separate Postgres service/instance** (avoids the exact shared-instance failure mode
the spec cites, without the overhead of a whole new project), and **90-day retention**
(the spec's own suggested default).

With both answered, prepared the schema and connection code — but **stopped short of
wiring it to anything live**, since the database itself doesn't exist yet and this
sandbox can't provision it (no Railway credentials, same as every prior Vercel/Privy/
Transak ops step in this file):

- `migrations/003_agent_persistence.sql` — `spread_history`, `data_health_snapshot`,
  `alert_config`, matching `002`'s style exactly. Commented with the 90-day retention
  decision and the two `DELETE` statements to run on a schedule once this is live
  (commented out — not scheduled anywhere yet).
- `lib/agentDb.ts` — a lazy `pg.Pool` singleton keyed off a **new, separate**
  `AGENT_DB_URL` env var, mirroring `lib/db.ts`'s `DATABASE_URL`/`getPool()`/
  `analyticsEnabled()` shape exactly. Deliberately not sharing `DATABASE_URL` with
  `site_events` — that table is a privacy-scoped anonymous-analytics store (non-negotiable
  #9); this is unrelated agent-infrastructure monitoring data, and they shouldn't share a
  pool or instance even though (per the Railway answer) they can share a Railway project.

**Deliberately not built:** any actual write path (a `data_health_snapshot` row from the
smoke workflow, a `spread_history` row from Phase 3b's compute path) or wiring into
`production-smoke.yml` / `lib/lifi/stockArb.ts`. Beyond the database not existing yet,
there's a real open design question logged in `INFRA_PERSISTENCE_SPEC.md`'s new "Status"
section: should the standalone `scripts/smoke-stock-market-data.mjs` (a GitHub
Actions script with no `pg` dependency today) get a raw `AGENT_DB_URL` secret directly, or
should it POST to a new small authenticated app endpoint that holds the DB credentials
server-side — matching how every other secret in this repo (`TRANSAK_API_SECRET`,
`ADMIN_PASSWORD`) stays server-side only, never handed to a CI script? Left open rather
than guessed, since it's exactly the kind of thing better decided once there's a real
database to test either approach against.

`npm run typecheck`, `npm run lint`, and `npm run build` all pass clean. `lib/agentDb.ts`
has zero importers right now (by design — nothing wires to it yet) and `AGENT_DB_URL` is
unset everywhere, so this change is a complete no-op for the running app. Next step is
ops, not code: provision the new Postgres service, set `AGENT_DB_URL` (server-only, never
`NEXT_PUBLIC_*`) on Vercel, run `migrations/003_agent_persistence.sql` by hand against it,
and confirm `lib/agentDb.ts` actually connects — only then does resolving the write-path
question above become useful.

## Session update (2026-09-07, continued) — asked to provision + verify; neither is possible here

Asked this session to provision the Railway database and check it live. Both are
genuinely impossible from a Claude Code sandbox, for two separate reasons — said plainly
rather than attempted and quietly failed:

1. **No Railway access at all.** Checked for a Railway CLI, `RAILWAY_*` env vars, and a
   Railway MCP tool — none exist in this session. Same class of limitation as every prior
   Vercel/Privy/Transak dashboard step in this file: those all required the repo owner to
   act directly in the vendor's dashboard, and Railway is no different here.
2. **Even with a connection string, this sandbox can't open it.** Its egress proxy
   (`/root/.ccr/README.md`) explicitly lists "raw-TCP databases" under "Not supported
   through the proxy (report, do not work around)." So even pasting `AGENT_DB_URL` into
   this conversation wouldn't let a future sandbox session verify connectivity — a `pg`
   connection attempt from here fails against the proxy, not against the database. This is
   a durable constraint, not something to retry with a different approach next time.

**What got built instead**, so "check it live" has an actual answer once the database
exists — verification needs to happen somewhere with real network access, which for this
app is Vercel itself, not this sandbox:

- `app/api/admin/agent-db-health/route.ts` — password-gated (same `isAdminSession()`
  pattern as `/api/admin/stats`), connects via `lib/agentDb.ts#getAgentPool()`, runs
  `SELECT 1`, checks all three `migrations/003_agent_persistence.sql` tables exist via
  `to_regclass`, returns each table's row count.
- `/admin/agent-db` — renders that as a status page (connection OK/latency, migration
  applied/incomplete, a per-table exists/row-count list), linked from the main `/admin`
  dashboard next to the existing "Stock data coverage" link. Same "load a real page in a
  browser to see live state" pattern as `/admin/stocks`.

`INFRA_PERSISTENCE_SPEC.md` now has the full step-by-step (Railway dashboard → new
Postgres service in the same project as HYPERFLEX, not attached to its existing one → run
migration 003 by hand → set `AGENT_DB_URL` on Vercel, server-only → redeploy → open
`/admin/agent-db`) for the repo owner to actually do this. `npm run typecheck`, `npm run
lint`, and `npm run build` all pass clean; the two new routes appear in the build output
(`/admin/agent-db`, `/api/admin/agent-db-health`). Neither has been exercised against a
real database yet — that's exactly the point of building them, not a caveat to fix later.

## Session update (2026-09-11) — merged main (agent infra + persistence spec) again

Same situation as 2026-09-07: `main` moved again (PR #52 — the two sessions above, agent
infra spec + B2 smoke-alerting, and the persistence-layer spec/schema/health-check routes)
while this branch stayed on the repo-split path. Merged cleanly — git auto-applied the
`StockDesk.tsx`/`lib/lifi/stocks.ts`/`scripts/smoke-stock-market-data.mjs` changes onto their
`apps/web/` locations; `lib/agentDb.ts`, `migrations/003_agent_persistence.sql`,
`app/admin/agent-db/page.tsx`, and `app/api/admin/agent-db-health/route.ts` needed a manual
`git mv` into `apps/web/` (new files, nothing to rename from). `AGENT_INFRASTRUCTURE_SPEC.md`
and `INFRA_PERSISTENCE_SPEC.md` stayed at the repo root next to `BUILD_SPEC.md`. Only
conflict was this file (both sides appended new sections); resolved by keeping both in full.
None of this touches the yield catalog or `DepositWithdrawModal.tsx` — no interaction with
the Convex/Curve/Frax/Panoptic cut. Re-verify before continuing into Phase 2.

## Session update (2026-09-11, continued) — Phase 2: ERC-4626 batch extracted to packages/core

Extracted Yearn v3, Morpho, and Fluid — the ERC-4626 batch — into `packages/core`, the
first real adapter logic Phase 1's scaffold. Added `viem` as a real dependency of
`packages/core` (owner-approved before starting: same version apps/web already pins,
already in the workspace's install, no new transitive surface).

**What moved, and what didn't:**
- `packages/core/src/types.ts` — the `YieldAdapter`/`TxRequest`/`RateQuote`/`Position`/
  `ExitProfile` types, matching the original repo-split brief's interface shape. `getRate()`
  returns `RateQuote | null`, not a bare `RateQuote` — non-negotiable #3 (never fabricate an
  APY) needs the "couldn't read a confident rate" case representable at the type level, not
  just handled ad hoc. `ExitProfile` is instant/queued only — no one-way variant, since
  Convex (the only one-way exit in the original 13) was already cut.
- `packages/core/src/erc4626/ERC4626Adapter.ts` — the shared base class. `getPosition()`
  does the on-chain `balanceOf` → `convertToAssets` read; `buildDeposit`/`buildWithdraw`/
  `exitProfile()` never touch the injected `client` at all, so a caller building a tx for an
  opportunity it already knows the vault address for doesn't need one. Also exports
  `buildErc4626Deposit`/`buildErc4626Withdraw` as **plain functions** (no instance
  required) for exactly that case — see below.
- `packages/core/src/adapters/{yearn,morpho,fluid}.ts` — `YearnAdapter`/`MorphoAdapter`/
  `FluidAdapter`, each just overriding `getRate()` (the actual per-protocol difference:
  yDaemon fetch, Morpho GraphQL + DeFiLlama fallback, DeFiLlama-only). Yearn's vault set is
  discovered dynamically (`discoverYearnAdapters`) since yDaemon's vault list *is* the
  discovery mechanism — each returned adapter already carries the APY found at discovery
  time rather than re-fetching the whole list per `getRate()` call. Morpho/Fluid are static
  config (`createMorphoAdapters`/`createFluidAdapter`), so no discovery step needed.
- `packages/core/src/addresses.ts` — USDC (per chain), Morpho's vault list, and Fluid's
  `fUSDC` addresses **moved** (same values, same original citations, not re-derived) out of
  `apps/web/lib/config/addresses.ts` — removed there once nothing in `apps/web` referenced
  them anymore (confirmed by grep before deleting, `apyHistory.ts`'s Morpho lookup switched
  to import `MORPHO` from `@defiant/core` instead). USDC didn't have its own standalone
  export before — it was only ever the `usdc` field embedded in `AAVE_V3`'s per-chain
  config — so this is a new top-level export with the same address values, not an edit.
- `packages/core/src/defillama.ts` — a **copy**, not a move, of the parts of
  `apps/web/lib/protocols/defillama.ts` that Morpho/Fluid need. That file's other consumers
  (Compound, Moonwell, Sky, Maple — not migrated yet) still need the `apps/web` copy, so it
  couldn't be deleted. This is real, temporary duplication, not an oversight — delete the
  `apps/web` copy once every DeFiLlama-dependent protocol has its own adapter here.
- **`apps/web/lib/protocols/{yearn,morpho,fluid}.ts` are now thin bridges**, not the real
  logic — they call the package's adapters and map `RateQuote` + adapter fields onto this
  app's `Opportunity` catalog shape (display copy, `riskTier` — product decisions the
  adapter itself correctly doesn't own). `aggregate.ts` needed zero changes: the bridges
  kept the same exported function names/signatures.
- **`DepositWithdrawModal.tsx`'s ERC-4626 deposit/withdraw branches now call
  `buildErc4626Deposit`/`buildErc4626Withdraw` from `@defiant/core`** instead of hand-rolling
  the `erc4626Abi` call inline — the actual "adapters build unsigned transactions" boundary
  this whole repo split is for. `writeContractAsync`/wagmi signing still happens exactly
  where it always did, in this component; the adapter never sees a signer.
- **`lib/hooks/usePositions.ts` was deliberately left untouched.** It reads all nine
  protocols' balances through one batched `useReadContracts` call — a real multicall-style
  performance property. Switching Yearn/Morpho/Fluid to each adapter's own `getPosition()`
  would trade that for N separate RPC reads, and nothing about this batch's actual goal
  (adapters build unsigned tx, don't sign) required it. `getPosition()` still exists on
  every adapter here — for Phase 3's fork tests and for `packages/api` (Phase 5) — apps/web
  just doesn't call it yet.

**Wiring, not just code:** `next.config.mjs` gained `@defiant/core` in `transpilePackages`
(the package ships TS source directly — `package.json`'s `main`/`types` point at
`src/index.ts`, not a compiled `dist/` — so Next needs to transpile it like first-party
code, same reason `@privy-io/*` are already in that list). `apps/web/package.json` gained
`@defiant/core: "*"` as a real dependency. Root `tsconfig.base.json` switched from
`NodeNext`/`NodeNext` to `module: "esnext"` / `moduleResolution: "bundler"` — NodeNext's
mandatory `.js` extensions on relative imports fought against source being consumed via a
bundler, and `bundler` is what actually matches how `apps/web` consumes this package today.
**Consequence worth remembering**: if `packages/api` (Phase 5) ever runs as a plain `node`
process without its own bundler step, Node's ESM loader will require those extensions at
runtime that `bundler` resolution doesn't force at the source level — that's a problem for
whoever builds Phase 5, flagged in `packages/core/README.md`'s "Build" section, not solved
preemptively here.

`npm run typecheck`, `npm run lint`, and `npm run build` all pass clean across every
workspace; still 23 routes, `@defiant/core` transpiles into the build with no errors.
**Not verified**: none of this has run against a live RPC, yDaemon, Morpho's GraphQL API, or
DeFiLlama from this sandbox (same network-reachability caveat as every protocol integration
in this file) — the adapters' output has the same shape as the code they replaced, but
smoke-test a real Yearn/Morpho/Fluid deposit on testnet before trusting this over the
inline version it replaced.


