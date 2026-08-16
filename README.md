# Openhand

Public site: [openhand.online](https://openhand.online). GitHub repo: `defiant`.

A non-custodial DeFi yield interface. Connect your own wallet, compare live on-chain yield
across Aave v3, Lido, Yearn v3, and Curve, and deposit or withdraw with transactions you sign
yourself. Openhand never takes custody of user funds — there is no pooled contract, no admin
key, no path for the app itself to move anyone's money.

> **Naming note:** this is deliberately *not* marketed as a "savings app" anywhere in the
> product. DeFi yield carries smart-contract, market, and liquidity risk and is not deposit-
> insured the way a bank savings account is (no FDIC/CDIC/FSCS-equivalent coverage anywhere).
> Calling it a savings product would misrepresent that risk to users — see the regulatory
> section below.

## Production domain

The product ships as **Openhand** at `https://openhand.online`. Point the Namecheap
zone at Vercel (not the parking page) and add the domain on the Vercel project:

1. In Namecheap, delete the URL Redirect on `@` and the parking `CNAME` on `www`.
2. Apex `A` record: Host `@` → `216.198.79.1` (the value on this project's Vercel domain card).
3. `CNAME` Host `www` → `cname.vercel-dns.com` (not `name.vercel-dns.com`).
4. In Vercel → Project → Settings → Domains, add `openhand.online` and
   `www.openhand.online`. Set the apex as primary.
5. Set `NEXT_PUBLIC_SITE_URL=https://openhand.online` on the Vercel project.
6. Register that origin in Reown / WalletConnect and in Onramper’s allowlist.
   `*.vercel.app` preview URLs are not the production host.

## Why non-custodial

Two designs were possible for this product: hold user funds and deploy them into yield
protocols on their behalf (custodial), or let users connect their own wallet and sign their
own transactions (non-custodial). This build is non-custodial by construction:

- The app never holds a private key, seed phrase, or user funds at any point.
- Every deposit/withdraw/approve is a transaction the connected wallet signs directly.
- There is no admin-controlled pool, vault, or multisig the app operates.

This matters globally, not in any one jurisdiction: a custodial model that pools and deploys
client funds plausibly triggers money-transmitter/money-services-business licensing and/or
securities or derivatives regulation almost everywhere it might operate — state-by-state
money transmitter licensing and state/SEC securities law in the US, MiCA CASP authorization
in the EU, FCA registration in the UK, FINTRAC/CSA rules in Canada, and analogous regimes
elsewhere. A non-custodial interface that never intermediates funds is a fundamentally
different, much lighter regulatory posture in all of them. **This is not legal advice** — get
a real compliance review, per-jurisdiction, before any public launch, marketing push, or
jurisdiction-specific claims. The architecture choice reduces regulatory surface area across
every market this reaches; it does not eliminate it in any of them.

## Stack

- Next.js 14 (App Router) + TypeScript
- [wagmi](https://wagmi.sh) + [viem](https://viem.sh) for wallet connection and contract calls
- [RainbowKit](https://rainbowkit.com) for the connect UI when Privy is unset
- [Privy](https://www.privy.io) (optional) for email / passkey embedded wallets — see below
- Tailwind CSS
- No backend, no database. Everything reads directly from-chain or from each protocol's
  public read-only API.

## First-time wallets (Privy)

Openhand does **not** generate or store private keys. A brand-new user who has never
used a wallet can still get an address:

1. A Privy app ID is already in the client (`cmstzz2zb009k0el4fzr8x8jb`). Override
   with `NEXT_PUBLIC_PRIVY_APP_ID`, or set it to `off` for RainbowKit-only connect.
2. In the Privy dashboard: enable **Email**, **Passkeys**, and **embedded Ethereum wallets**.
   Add `https://openhand.online` and `https://www.openhand.online` as allowed origins.
3. Connect offers email or a passkey first. Privy creates an embedded wallet for users
   who do not already have one. MetaMask / Rainbow / Rabby / WalletConnect remain available.
   Coinbase is not featured.
4. Onramper (when wired) should receive that connected address as the destination.
   Onramper does not create the wallet.

Email is processed by **Privy**, not written to Openhand's database. Set
`NEXT_PUBLIC_PRIVY_APP_ID=off` for RainbowKit-only connect. This is a third-party
wallet vendor, not custody by Openhand — still get a compliance read before
treating email login as production-ready.

## First session

A first-time visitor sees a three-step path, not the full market:

1. **Get started** — email or passkey (Privy). Existing wallets stay behind “Continue with a wallet.”
2. **Add USDC** — if the wallet is empty, Buy USDC opens Onramper on mainnet (needs
   `NEXT_PUBLIC_ONRAMPER_API_KEY`). Practice / testnet mode does not open a card purchase.
3. **Start here** — one USDC card on Base (or Base Sepolia). That is a default first path,
   not a scored recommendation. Filters, the PWA install banner, and the full collection
   appear after they hold a position.

Deposit amounts for USDC are in dollars. Approve/deposit buttons say what they are signing.

## Protocols integrated

| Protocol | Chains | Asset | Deposit | Withdraw |
|---|---|---|---|---|
| Aave v3 | Ethereum, Base, Arbitrum | USDC | `Pool.supply()` | `Pool.withdraw()` — instant |
| Lido | Ethereum only (no L2 deployment) | ETH → stETH | `stETH.submit()` | Request queue, **1-5 days** to finalize, then `claimWithdrawal()` |
| Yearn v3 | Ethereum, Base, Arbitrum | USDC vaults | ERC-4626 `deposit()` | ERC-4626 `redeem()` — instant, subject to vault liquidity |
| Curve | Ethereum only (no testnet deployment) | USDC → LP (2 pools, see below) | `Pool.add_liquidity()` | `Pool.remove_liquidity_one_coin()` — instant, subject to pool liquidity |

Curve is two pools, not one — `lib/config/addresses.ts`'s `CURVE[chainId]` is an array, and
`lib/protocols/curve.ts` turns each configured entry into its own opportunity:

| Pool | Coins | Why it's here |
|---|---|---|
| crvUSD/USDC (factory plain pool) | USDC, crvUSD | Biggest TVL gainer among Curve's crvUSD pools (Curve's own "Best Yields & Key Metrics" weekly post, 2026-08-13) |
| 3pool | DAI, USDC, USDT | Curve's flagship — "one of the most liquid and widely referenced pools in all of DeFi" |

Both were picked specifically for liquidity, and both had to actually contain USDC to
qualify — single-sided `add_liquidity` only works with a pool's own coins, so a highly liquid
pool that doesn't hold USDC at all (crvUSD/USDT, for instance) isn't something this app can
deposit into without a swap step it doesn't build. 3pool is architecturally different from
every other Curve pool here: it predates Curve's factory-pool pattern, so its LP token (3Crv)
is a **separate contract** from the swap pool, its `add_liquidity`/`calc_token_amount` take a
3-element amounts array instead of 2, and `lib/abi/curvePool.ts` exports distinct
`curvePoolAbi2Coin`/`curvePoolAbi3Coin` ABIs for exactly this reason — `CurvePoolConfig.
numCoins` in `lib/config/addresses.ts` is what picks the right one at runtime.

Contract addresses live in `lib/config/addresses.ts`, pulled from
[bgd-labs/aave-address-book](https://github.com/bgd-labs/aave-address-book) (Aave's own
canonical registry) and [lidofinance/docs](https://github.com/lidofinance/docs) on
2026-08-13. Both Curve pool addresses were verified the same day, but indirectly — this
sandbox's network policy blocks Curve's own docs/API domains, so it's cross-referenced
against multiple independent third-party sources instead (see the `CURVE` comment in
`lib/config/addresses.ts` for exactly which ones and why that's an acceptable substitute).
**Re-verify against those sources before any mainnet deploy** — don't assume addresses stay
correct indefinitely.

## Fees

A flat basis-point fee on deposit and withdrawal — 0.25% each way by default
(`lib/config/fees.ts`). Mechanically it is a **separate wallet-signed transfer to a treasury
address**, never a cut taken inside the deposit/withdraw call itself:

- **Deposit**: the fee is sent to the treasury first, then the *remaining* amount is what
  actually gets approved and deposited into the protocol.
- **Withdraw (Aave/Yearn)**: the full gross amount is withdrawn from the protocol into the
  wallet first, then the fee is sent to the treasury out of what just landed.
- **Withdraw (Lido)**: fee is charged at *claim* time, not request time — the requested ETH
  isn't in the wallet yet when a withdrawal is only requested, so charging a fee then would
  come out of unrelated funds. `LidoWithdrawalRequests.tsx` takes the fee right after
  `claimWithdrawal()` lands ETH in the wallet.

This keeps the non-custodial claim intact — the fee transaction is a plain transfer the user
signs, not something a contract deducts from funds passing through it. The cost is UX: an
extra signature per deposit/withdrawal when fees are enabled.

**Fees are off by default.** `getTreasuryAddress()` in `lib/config/fees.ts` returns
`undefined` — and every fee code path no-ops — until `NEXT_PUBLIC_TREASURY_ADDRESS` is set to
a real address. There is no fallback address; an unset or malformed value disables fees
entirely rather than sending anywhere unintended.

## Investment-style filter (not advice)

`/opportunities` shows a short questionnaire on first visit (`InvestmentStyleQuestionnaire`,
answers cached in `localStorage`). It asks about liquidity need, comfort with newer
protocols, and whether yield or risk matters more — and uses the answers only to **filter and
sort** the existing opportunity list (`lib/preferences.ts`'s `applyPreferences()`). It never
computes a suitability score, never recommends a specific product or allocation, and every
screen it touches carries a "not financial advice" line and a one-click "show everything"
escape hatch. The filter/sort behavior is entirely local and works whether or not the user
opts into the data-saving step below — see "Data collection" for what that step does.

**This distinction is load-bearing, not cosmetic.** Risk-profiling-plus-recommendation is the
exact pattern that requires robo-advisers (Betterment, Wealthfront) to register as investment
advisers in the US, and the analogous suitability-assessment regimes elsewhere (MiFID II in
the EU, etc.). A preference filter that only reorders/hides existing self-serve options is a
meaningfully different, much lighter regulatory posture — but only as long as it stays a
filter. Do not evolve this into scored recommendations or allocation percentages without the
same compliance review called out above.

## Data collection

The only place this app stores anything server-side, at all, is an explicit opt-in on the
questionnaire: a checkbox, unchecked by default, that saves the three answers **linked to
the connected wallet address** so they can be used to improve the product and — per how this
was scoped — potentially to contact the user about relevant updates later. This is the app's
first feature that touches personal data, and it's built with that treated as a real
constraint, not an afterthought:

- **Opt-in, not opt-out.** The checkbox defaults to unchecked. Declining doesn't degrade the
  product — the local filter/sort works identically either way.
- **Consent is cryptographically proven, not just claimed.** Checking the box and clicking
  Apply prompts a free wallet signature (`useSignMessage`, no transaction, no gas) over a
  fixed message (`CONSENT_MESSAGE` in `lib/preferences.ts`). `POST /api/preferences`
  (`app/api/preferences/route.ts`) verifies that signature against the claimed wallet address
  with viem's `verifyMessage()` before writing anything — without a valid signature, the
  request is rejected with 401. This exists specifically so nobody can POST answers
  attributed to a wallet address they don't control; a "consent" that isn't tied to a proof
  of ownership isn't real consent.
- **Minimal fields.** `wallet_address`, the three answers, and a `consented_at` timestamp —
  see `migrations/001_questionnaire_responses.sql`. No email, no IP address, no device
  fingerprint, nothing beyond what was explicitly asked for.
- **No backend existed before this.** Everything else in the app is either a direct on-chain
  read or a call to a protocol's own public API — see `lib/db.ts`'s comment for why the
  Postgres pool is a lazy singleton (same reasoning as `lib/wagmi.ts`'s `getWagmiConfig()`,
  just for a different crash mode: importing `pg` into a client bundle rather than an SSR
  crash). `DATABASE_URL` is unset by default; the save path simply errors until it's
  configured, everything else in the app is unaffected.

**What's explicitly NOT built yet, and must exist before this goes anywhere near real users:**
a privacy policy describing this collection, a data retention policy, and a self-service (or
at minimum request-based) deletion mechanism — most privacy regimes that would plausibly
apply once real wallet-linked data is being stored (GDPR, CCPA/CPRA, PIPEDA, and others)
require some version of a right to erasure and a stated lawful basis/purpose for processing.
**This is not legal advice** — get a real privacy/compliance review before enabling this in
front of real users, same as the fee model and the custody architecture above.

## Safety defaults

- `NEXT_PUBLIC_NETWORK_MODE=testnet` by default (`.env.example`). The app runs against
  Sepolia / Base Sepolia / Arbitrum Sepolia until this is explicitly flipped to `mainnet`.
  A banner in the UI always shows which mode is active.
- Every ERC-20 approval is scoped to the exact deposit amount — never an unbounded
  (`type(uint256).max`) approval. Smaller blast radius if a spender contract is ever
  compromised, and avoids wallet "risky approval" warnings.
- Aave/Yearn withdrawals use the user's live on-chain balance as the max, not a
  withdraw-everything sentinel — what you see in the UI is what gets requested.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID at minimum (free at https://cloud.reown.com)
# NEXT_PUBLIC_TREASURY_ADDRESS is optional — fees stay disabled until it's set (see "Fees")
# DATABASE_URL is optional — questionnaire opt-in save stays broken until it's set AND
# migrations/001_questionnaire_responses.sql has been run against it (see "Data collection")
npm run dev
```

## Known simplifications — read before extending

- **Yearn's API response shape is unverified against the live endpoint.** This sandbox's
  network policy blocked reaching `ydaemon.yearn.fi` while building this, so
  `lib/protocols/yearn.ts` parses defensively (returns `null`/skips rather than guessing a
  wrong APY) but the field names (`apr.forwardAPR.netAPR` etc.) should be smoke-tested
  against a real vault the first time this actually runs.
- **Lido withdrawal approvals aren't allowance-checked live** — `DepositWithdrawModal`
  always submits a fresh `approve` before `requestWithdrawals` rather than reading current
  stETH→WithdrawalQueue allowance first. Harmless (redundant approve, no correctness issue)
  but means an extra wallet signature on repeat withdrawals. See the comment in
  `components/DepositWithdrawModal.tsx`.
- **USDC only** for Aave and Yearn — no other assets wired up yet. Extending to more assets
  means adding entries to `lib/config/addresses.ts` and generalizing the reserve/vault filter
  in `lib/protocols/aave.ts` / `yearn.ts` beyond a single hardcoded USDC address.
- **No protocol risk scoring or TVL/liquidity display.** APY is shown with zero context on
  underlying risk (smart contract audit status, vault strategy composition, Aave utilization
  rate). A real "savings"-adjacent product needs this before it's honest to a non-technical
  user — see the North Star framing from a sibling project's CLAUDE.md: never let a number
  imply safety it hasn't earned.
- **No slippage/price-impact handling for Aave, Lido, or Yearn** — deposits and withdrawals
  are 1:1 at the protocol's own exchange rate, so this isn't applicable to those three as
  built. **Curve is the exception**: `add_liquidity`/`remove_liquidity_one_coin` behave like a
  swap, so `DepositWithdrawModal` previews the expected output via `calc_token_amount`/
  `calc_withdraw_one_coin` and submits a 1%-tolerance min-out rather than 0 — the first place
  in this app that does real slippage protection. Same thing would be needed if a DEX-based
  instant-Lido-exit path is ever added.
- **Curve's shown APY is base trading-fee yield only, not gauge-inclusive.** Earning this
  pool's separate CRV emissions requires staking the LP token in its gauge, which this app
  doesn't do — so the CRV-reward APR Curve's API also reports is deliberately left out rather
  than shown as if a plain depositor here would earn it. See `lib/protocols/curve.ts`.
- **Curve's API response shape is unverified against the live endpoint** — same constraint as
  Yearn's above: this sandbox's network policy blocks reaching `api.curve.finance` while
  building, so `lib/protocols/curve.ts` parses defensively (skips the pool rather than
  guessing a wrong APY) but the field names should be smoke-tested against the real endpoint
  the first time this runs.
- **Fee amount is a hardcoded constant, not configurable per-session or A/B tested** —
  `DEPOSIT_FEE_BPS`/`WITHDRAW_FEE_BPS` in `lib/config/fees.ts`. Changing the fee is a one-line
  edit and a redeploy, nothing more sophisticated exists yet.
- **The two-step fee flow has no partial-failure recovery.** Untested against a live testnet:
  two separate signed transactions per action (deposit: fee transfer then supply/deposit;
  Aave/Yearn withdraw: withdraw then fee transfer) means two places a user can reject or a
  wallet can error mid-flow. If one leg succeeds and the other then fails, the UI currently
  just surfaces the error — there's no automatic refund/retry/resume orchestration. Worth
  hardening before real money is at stake.
- **No privacy policy, retention policy, or deletion mechanism yet** for the opt-in
  questionnaire data — see "Data collection." Needed before this runs in front of real users,
  not before some later "polish" pass.
- **No migration runner.** `migrations/001_questionnaire_responses.sql` is applied by hand
  (psql, or your Postgres host's SQL console) — there's exactly one migration and no tracking
  of which have run. Fine at this scale, revisit if the schema grows.
- **The consent signature has no expiry or nonce.** `CONSENT_MESSAGE` is a fixed string, so a
  captured signature could in principle be replayed to re-save the same preferences again —
  low-severity since replaying it can't change what's stored to anything the original signer
  didn't already agree to, but worth a nonce if this pattern gets reused for anything with
  higher stakes than a preferences upsert.

## File map

| Path | What |
|---|---|
| `lib/wagmi.ts` | Chain list + wallet connector config, testnet/mainnet switch |
| `lib/config/addresses.ts` | All verified contract addresses, per chain |
| `lib/config/fees.ts` | Fee bps constants, treasury address resolution/validation |
| `lib/db.ts` | Server-only lazy Postgres pool. Never import from a client component. |
| `lib/abi/*` | Minimal hand-written ABIs (ERC-20, ERC-4626, Aave Pool + UiPoolDataProvider, Lido stETH + WithdrawalQueue, Curve pool in 2-coin/3-coin variants) |
| `lib/protocols/{aave,lido,yearn,curve}.ts` | Per-protocol opportunity fetchers (APY + deposit target + liquidity/riskTier metadata) |
| `lib/protocols/aggregate.ts` | Combines all four into one sorted list |
| `lib/preferences.ts` | Questionnaire answer storage, the filter/sort function (never scoring/recommendation), and the shared `CONSENT_MESSAGE` string |
| `lib/hooks/useOpportunities.ts` | React Query wrapper, 60s refresh |
| `lib/hooks/usePositions.ts` | Batched on-chain read of the connected wallet's live balances across every opportunity |
| `lib/hooks/useSendFee.ts` | Sends the fee transfer (native or ERC-20) to the treasury address, no-ops if unconfigured |
| `components/DepositWithdrawModal.tsx` | The actual transaction flow — fee transfer + approve/deposit/withdraw per protocol |
| `components/LidoWithdrawalRequests.tsx` | Pending Lido withdrawal queue requests + claim + fee-on-claim |
| `components/InvestmentStyleQuestionnaire.tsx` | The preference questionnaire — filter/sort only (see "Investment-style filter") + the signature-gated opt-in save (see "Data collection") |
| `app/api/preferences/route.ts` | The one write path to the database — validates + signature-verifies before any insert |
| `migrations/001_questionnaire_responses.sql` | The only schema in this app. Applied by hand, no migration runner. |
| `app/page.tsx` | Portfolio dashboard (connect-wallet hero when disconnected) |
| `app/opportunities/page.tsx` | Full opportunity comparison list, questionnaire-gated on first visit |
