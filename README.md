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
6. Register that origin in Reown / WalletConnect, Privy, and Transak’s
   allowlist. `*.vercel.app` preview URLs are not the production host.

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
- Optional [Transak](https://transak.com) widget for CAD / Interac → USDC (mainnet only)
- Optional Postgres for first-party site analytics. Everything else reads directly
  on-chain or from each protocol's public read-only API.

## Install as an app

Openhand is a **Progressive Web App**, not an App Store / Play Store binary. Adding it
to the home screen opens a standalone window (no browser chrome) while staying
non-custodial: the same Privy / RainbowKit wallet still signs every transaction.
There is no Capacitor/Electron wrapper — those break WalletConnect return-to-app
and the Transak iframe, and they are not needed for a home-screen icon.

- **Android / desktop Chrome:** the Install prompt appears when Chrome considers the
  site installable (HTTPS, manifest, service worker). “Later” snoozes it for two weeks.
- **iPhone / iPad (Safari):** Share → Add to Home Screen. Chrome/Firefox on iOS cannot
  install PWAs; the hint only shows in Safari.
- **Standalone + wallets:** email / passkey (Privy) works inside the installed app.
  WalletConnect to an external wallet (MetaMask etc.) may bounce through Safari and
  not return — that is an iOS PWA limitation, not a custody change.

The service worker (`public/sw.js`) is an offline *shell* only. It does **not** cache
`/api/*`, HTML as live rates, or cross-origin RPC/protocol APIs. Stale APY must never
be shown as if it were live. Precache is `/offline.html` plus icons. Content-hashed
`/_next/static/*` is cache-first. Do not replace this with `next-pwa` / Serwist
defaults — those cache too much for a yield product.

## First-time wallets (Privy)

Openhand does **not** generate or store private keys. A brand-new user who has never
used a wallet can still get an address:

1. A Privy app ID is already in the client (`cmstzz2zb009k0el4fzr8x8jb`). Override
   with `NEXT_PUBLIC_PRIVY_APP_ID`, or set it to `off` for RainbowKit-only connect.
   That env var must be the **App ID** from App settings → Basics, never the App Secret.
   A secret there is inlined into public JS and crashes the site with “invalid Privy app ID”
   (that was the 2026-08-17 white-screen). Redeploy after changing it.
2. In the Privy dashboard: enable **Email**, **Passkeys**, and **embedded Ethereum wallets**.
   Add **both** `https://openhand.online` and `https://www.openhand.online` as allowed
   origins. Vercel currently 308s the apex to `www`; if only the apex is allowlisted,
   the public site white-screens (`Application error: a client-side exception`).
3. Connect offers email or a passkey first. Privy creates an embedded wallet for users
   who do not already have one. MetaMask / Rainbow / Rabby / WalletConnect remain available.
   Coinbase is not featured.
4. Transak (when wired) receives that connected address as the destination.
   Transak does not create the wallet.

Email is processed by **Privy**, not written to Openhand's database. Set
`NEXT_PUBLIC_PRIVY_APP_ID=off` for RainbowKit-only connect. This is a third-party
wallet vendor, not custody by Openhand — still get a compliance read before
treating email login as production-ready.

## First session

A first-time visitor sees a three-step path, then the full catalog:

1. **Deposit** — email or passkey (Privy) to get a wallet. Existing wallets stay behind “Continue with a wallet.”
2. **Add USDC** — if the wallet is empty, Buy USDC opens Transak (needs
   `TRANSAK_API_KEY` + `TRANSAK_API_SECRET`). CAD is the default fiat; Interac is
   the usual Canadian path. Transak staging (`TRANSAK_STAGING=true`) can be tested
   without flipping the app to mainnet; production buys need mainnet + production keys.
3. **Deposit** — browse the collection and pick a card. There is no featured or
   “start here” opportunity. Highlighting one product is a recommendation even with
   a disclaimer, so the app does not do it.

Deposit amounts for USDC are in dollars. Approve/deposit buttons say what they are signing.

## Buy USDC (Transak)

The first-session buy is a **third-party Transak checkout**, not an Openhand custody
path. USDC is sent to the **connected wallet**. Openhand never receives the funds,
never holds a Transak customer account, and does not store the wallet address from
this flow.

Transak is the onramp for Canadian no-coiners: FINTRAC-registered, CAD, Interac
e-Transfer, **no monthly partner fee** on the hosted widget (the $10k Transak fee
is Whitelabel API only — this app does not use that). MoonPay blocks Canada on
every USDC listing (ethereum / base / arbitrum — `notAllowedCountries` includes
`CA`; MoonPay: “Customers in Canada cannot purchase Stablecoins”), so it is not
used. Onramper’s aggregator was not adopted ($199/mo). Coinbase Onramp / Reown
AppKit onramp and Privy’s `useFiatOnramp` are card rails in Canada, not Interac.
Deposit / swap / referral stay on wagmi — only the buy iframe uses Transak.

**Reown stays.** Reown Cloud (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`) is
WalletConnect — how existing wallets connect. Transak does not replace it, and
Reown AppKit’s bundled onramp should not replace Transak. Allowlist
`openhand.online` in both dashboards.

Do not add a second onramp “just in case Transak is down” until Transak has been used in production. MoonPay, Privy card onramp, Coinbase Onramp, and Reown AppKit onramp cannot do this CAD / Interac / USDC job. Banxa could, later — it is a second partner KYB, not a free toggle. If the Transak session fails, the modal already shows the wallet address so the user can send USDC themselves.

**Setup (production):**

1. Partner account at [dashboard.transak.com](https://dashboard.transak.com) → Developers.
   Sign up with a **corporate email** on your own domain (e.g. `hello@openhand.online`).
   Gmail / Hotmail / Outlook / iCloud are rejected — you do **not** need to email sales
   for the hosted widget. Copy the API key and API secret. Staging keys are available
   immediately. Production also needs partner KYB (`https://forms.transak.com/kyb`)
   using the same email. After KYB, the dashboard **partner fee on the buy** is how
   Openhand monetizes (start ~0.5–1%; see "Fees"). Do not also turn on the deposit
   treasury cut.
2. Allowlist `openhand.online` and `www.openhand.online`.
3. On Vercel, set `TRANSAK_API_KEY` and `TRANSAK_API_SECRET` (server-only — never
   `NEXT_PUBLIC_*`). Optional `TRANSAK_STAGING=true` for Transak sandbox keys.
4. The app must be `NEXT_PUBLIC_NETWORK_MODE=mainnet` for **production** keys (real USDC).
   Staging keys (`TRANSAK_STAGING=true`) work while the app stays on testnet — see below.

This is Transak’s [Widget with API Customization](https://docs.transak.com/guides/widget-with-api-customization):
the backend calls Create Widget URL (`POST /api/v2/auth/session`) and the modal loads the
one-shot `widgetUrl` in an iframe. Prefills: CAD, country `CA`, USDC, network, connected
wallet (`disableWalletAddressForm`). We do **not** pass `userData` to skip Lite KYC — that
would mean Openhand collecting identity data. We do **not** set `hideExchangeScreen` — the
user still picks amount and Interac vs card. OTP, Standard KYC, payment, and confirm stay
inside Transak.

`POST /api/onramp/widget` mints a Partner Access Token from the secret (cached in
memory; Transak tokens last ~7 days) and then a **single-use widget URL** (~5 minutes).
The modal fetches a fresh session on every open. Transak requires the end-user IP as
`x-user-ip` for KYC/geo; Openhand forwards it and does not store it. `referrerDomain`
matches the page host (`localhost` locally, `www.openhand.online` in production) so
Transak’s Referer check passes. Allowlist those hosts in the Transak dashboard.

**Test (staging — no production KYB):**

1. Dashboard → Environment **Staging** → copy API key and secret.
2. Allowlist `localhost` (and `127.0.0.1`) plus the production hosts.
3. In `.env.local`: `TRANSAK_API_KEY`, `TRANSAK_API_SECRET`, `TRANSAK_STAGING=true`.
   Keep `NEXT_PUBLIC_NETWORK_MODE=testnet`.
4. `npm run dev`, connect a wallet, Buy USDC. Sandbox KYC always approves. CAD card:
   `4242424242424242`, expiry `10/33`, CVV `100`. 3DS password `Checkout1!`.
   Docs: [sandbox credentials](https://docs.transak.com/guides/sandbox-credentials).
5. Staging sends **TRNSK** (Transak test token) on Base Sepolia, not Circle USDC. Do not
   expect that balance to deposit into Aave in this app. Widget + checkout is the test.

Production keys + KYB are still required before real CAD hits a real wallet.

## Protocols integrated

| Protocol | Chains | Asset | Deposit | Withdraw |
|---|---|---|---|---|
| Aave v3 | Ethereum, Base, Arbitrum | USDC | `Pool.supply()` | `Pool.withdraw()` — instant |
| Lido | Ethereum only (no L2 deployment) | ETH → stETH | `stETH.submit()` | Request queue, **1-5 days** to finalize, then `claimWithdrawal()` |
| Yearn v3 | Ethereum, Base, Arbitrum | USDC vaults | ERC-4626 `deposit()` | ERC-4626 `redeem()` — instant, subject to vault liquidity |
| Curve | Ethereum only (no testnet deployment) | USDC → LP (2 pools, see below) | `Pool.add_liquidity()` | `Pool.remove_liquidity_one_coin()` — instant, subject to pool liquidity |
| Sky (sUSDS) | Base, Arbitrum (Spark PSM3; no testnet) | USDC ↔ sUSDS | `PSM.swapExactIn` | Same swap back to USDC — instant, subject to PSM liquidity |
| Maple (syrupUSDC) | Ethereum only | USDC | `SyrupRouter.deposit` (Maple lender auth required once) | `Pool.requestRedeem` — FIFO queue; USDC is pushed when processed |
| Panoptic (Unicorn USDC) | Ethereum only | USDC | ERC-4626 `deposit()` | ERC-4626 `redeem()` — instant, subject to vault liquidity |

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

Sky sUSDS on L2 uses Spark's PSM3 (official addresses in `lib/config/addresses.ts`,
[Spark PSM docs](https://docs.spark.fi/dev/savings/spark-psm)). Token addresses are read
from the PSM at runtime. Copy calls this the Sky protocol rate — not a "savings" product.
Maple syrupUSDC addresses and the `requestRedeem` flow come from
[Maple's Ethereum integration docs](https://docs.maple.finance/integrate/ethereum-mainnet/smart-contract-integration).
First-time Maple wallets must complete lender authorization on syrup.fi; Openhand cannot
sign Maple's allowlist.

Panoptic Unicorn USDC is a **catalog card**, not a featured strategy. Address from
[Panoptic deployment docs](https://panoptic.xyz/docs/contracts/deployment-addresses)
(2026-08-18). It is a third-party automated options/volatility vault: you sign an
ERC-4626 deposit; Panoptic's curator runs the trades. Copy does not call it
market-neutral or a recommendation. If `asset()` is not native USDC, or DeFiLlama has
no parseable Unicorn APY, the card is skipped rather than guessed. PLP WETH is not
listed (USDC-in only).

## Move USDC (Circle CCTP)

`/move` is a **tool**, not a yield opportunity and not a recommendation. It moves
native USDC you already hold across Ethereum, Base, and Arbitrum using Circle CCTP
**V2** (V1 is in wind-down). Flow: exact-amount `approve` → `depositForBurn` on the
source TokenMessenger → poll Circle's public Iris attestation → `receiveMessage` on
the destination MessageTransmitter. You sign both legs. Openhand never holds the
tokens, there is no Circle signup/KYB (that is Circle Mint, a different product),
and there is **no Openhand fee** on this path.

- Addresses: [Circle CCTP contract addresses](https://developers.circle.com/cctp/references/contract-addresses)
  (verified 2026-08-18). TokenMessengerV2 `0x28b5a0e9…cf5d` / MessageTransmitterV2
  `0x81D40F21…4B64` on Ethereum, Arbitrum, and Base (same bytes, domain IDs 0 / 3 / 6).
  Testnet uses the Sepolia counterparts on Circle's table.
- Burn token is **Circle-issued USDC**
  ([USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)).
  Bridged USDC.e and Aave's Sepolia faucet token cannot be burned.
- Standard Transfer only (`minFinalityThreshold = 2000`, `maxFee = 0`). Fast Transfer
  (Circle fee taken from the amount) is not wired.
- One burn is capped at $10 million (Circle). Pending burns are stored in **this
  browser's localStorage only** (`openhand.cctp.pending.v1`) — not the database.
- Iris is fetched server-side (`/api/cctp/attestation`) so the browser does not
  depend on Circle CORS. No API key. Missing attestation → wait / retry, never a
  guessed message.

**Token emissions (Moonwell WELL, Convex CRV/CVX):** claim is wallet-signed. After a claim,
you choose what percent of *just-claimed* tokens to sell to USDC via 0x (default 100% sell,
0% = hold). There is no backend seller or keeper — that would be custody.

**Not built (on purpose):** Uniswap V3 / Aerodrome concentrated LP, GMX, Pendle, and
one-click looping of stablecoin lending markets. Those are different products (impermanent
loss, trader PnL, maturity locks, or leverage). Looping in particular multiplies oracle,
rate, and liquidation risk — see "Looping" under Known simplifications.

## Fees

**Do not enable the deposit/withdraw treasury fee.** The code path exists
(`lib/config/fees.ts`, 0.25% each way as a separate wallet-signed transfer, never skimmed
inside `supply()`/`deposit()`/`submit()`), but a cut on every protocol tx is
money-transmitter-adjacent and a tax on putting dollars to work. Leave
`NEXT_PUBLIC_TREASURY_ADDRESS` unset. `getTreasuryAddress()` must keep returning `undefined`
on anything other than a valid, non-zero configured address — never add a hardcoded fallback.

**How Openhand monetizes (2026-08-17):**

1. **Transak partner fee on Buy USDC** (first dollar). Transak is the licensed onramp; they
   take CAD, run KYC, and send USDC to the user's wallet. After partner KYB, set a small
   partner fee in the Transak dashboard (start ~0.5–1% of the *buy*, not of later deposits).
   Openhand never receives the USDC. Repeat Aave/Yearn deposits stay fee-free. Confirm the
   split and payout with Transak — do not add a second treasury transfer for this.
2. **Bridge / convert trades — fee to a cold wallet.** Opt-in 0x `swapFeeBps` on
   convert-then-deposit (CRV / Frax / Convex) is already wired in `lib/swap/zeroex.ts`.
   Set `NEXT_PUBLIC_SWAP_FEE_RECIPIENT` to a **cold wallet** you do not use as an
   operating key. Do not put a swap in front of plain USDC → Aave. If a cross-chain
   bridge ships later: same pattern — user signs, fee is collected atomically to that
   cold wallet, Openhand never holds the bridged assets. Do not build a custodial
   bridge or send proceeds to a hot treasury (`NEXT_PUBLIC_TREASURY_ADDRESS` stays unset).
3. **CAD subscription later** (Stripe) for extras that are not yield: tax-lot export, alerts,
   history. No crypto through Openhand. Never a performance fee on yield.

Do not add Openhand-operated vaults, a skim inside a protocol call, an Openhand Interac
account, or a featured product with an affiliate.

The unused two-step treasury mechanism (documented here so it is not re-invented): fee
transfer first on deposit, then the remainder is approved and deposited; on Aave/Yearn
withdraw the gross amount lands in the wallet then the fee is sent; on Lido the fee is
taken at *claim* time, not request time (`LidoWithdrawalRequests.tsx`). Extra signature,
partial-failure with no auto-refund. Keep it dark.

## Not advice

Collection and card pages show a short risk disclosure (`RiskDisclaimer`): yield is not a
bank deposit, is not insured, is not guaranteed, and Openhand never holds funds. Browse
filters (yield, chain, asset) only hide/reorder the existing catalog. They never score
suitability or recommend a product or allocation.

**Do not add a questionnaire, risk score, or “best option for you.”** That pattern is what
pushes an interface toward investment-adviser-registration territory. Keep filters as
filters.

## Tokenized stocks (LI.FI)

The dashboard includes a browse-only tape of tokenized stocks and ETFs routed by
[LI.FI](https://li.fi) (`components/StockDesk.tsx`). This is **not** a yield card, not a
brokerage, and not a recommendation. Filters hide/reorder the catalog. Rows are
alphabetical. Nothing is featured.

- **Issuers shown:** xStocks, Ondo Tokenized, Backed — classified from LI.FI's catalog
  names (LI.FI has no public `stock` tag; only `stablecoin` is documented). Ambiguous
  names are skipped, not guessed. A row without a parseable `priceUSD` is skipped.
- **Swap:** USDC ↔ the selected token on the same chain. `POST /api/lifi/quote` calls
  LI.FI `/v1/quote`; the wallet signs `approve` (exact amount, never unlimited) then the
  returned `transactionRequest`. Openhand never holds the tokens. Addresses are
  checksummed with `getAddress` — LI.FI rejects the unchecksummed catalog address.
- **Mainnet only** to execute. Testnet still shows the live tape, buy/sell disabled.
- **Fees:** Openhand does not take an integrator cut. LI.FI may charge its own protocol
  fee inside the swap; the modal shows it when the quote reports `feeCosts`.
- **Regulatory:** tokenized stocks are securities-adjacent in many readings, often
  unavailable to US retail, and are not the listed share. Do not add a “best stock”,
  allocation, or suitability flow. Get a compliance read before marketing this as a
  stock product.

Optional `LIFI_API_KEY` (server-only) raises LI.FI rate limits. Catalog works without it.

## Site analytics

The only optional server-side store is first-party anonymous event counts. There is no
wallet-linked collection path — the old investment-style questionnaire and its
`questionnaire_responses` table were removed. This is **not** a third-party analytics pixel
(no Google Analytics, no Mixpanel, no tracking scripts).

A password-gated dashboard at `/admin` counts page views and a short allowlist of product
events (`page_view`, `connect_open`, `deposit_open`, `deposit_done`, `withdraw_open`,
`withdraw_done`, `onramp_open`). This is **not** linked from the public nav. `robots.txt`
disallows `/admin`.

- **Off until configured.** Events are dropped unless `DATABASE_URL` is set and
  `migrations/002_site_analytics.sql` has been run. `/admin` login is disabled unless
  `ADMIN_PASSWORD` is set.
- **No wallets, no IPs, no user-agents, no third-party pixels.** The ingest path
  (`POST /api/analytics/event`) stores only the event name, a sanitized public path, an
  optional catalog opportunity id, an optional chain id, and a truncated daily hash of
  (salt + IP). The IP itself is never written. The hash rotates each UTC day so it cannot
  be used as a long-lived profile.
- **Allowlisted events only.** Unknown event names are rejected. Paths under `/admin` and
  `/api` are dropped.
- **No wallet-linked writes.** Analytics does not attribute events to a wallet. If a future
  feature stores anything against an address, it needs an unchecked-by-default consent
  checkbox and a valid wallet signature — not a silent add.

**What's explicitly NOT built yet, and must exist before this store goes anywhere near real users:**
a privacy policy describing this collection, a data retention policy, and a self-service (or
at minimum request-based) deletion mechanism. The anonymous event table is a lighter category
than wallet-linked answers, but it is still in scope for that review. **This is not legal
advice** — get a real privacy/compliance review before enabling this in front of real users,
same as the fee model and the custody architecture above.

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
# NEXT_PUBLIC_TREASURY_ADDRESS stays blank — do not enable the deposit/withdraw
# treasury fee (see "Fees"). Monetize via Transak partner fee on Buy USDC.
# DATABASE_URL is optional — site analytics stays off until it's set AND
# migrations/002_site_analytics.sql has been run (see "Site analytics").
# ADMIN_PASSWORD is optional — /admin stays disabled until set.
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
- **No privacy policy, retention policy, or deletion mechanism yet** for the anonymous
  event table — see "Site analytics." Needed before this runs in front of real users,
  not before some later "polish" pass.
- **No migration runner.** `migrations/002_site_analytics.sql` is applied by hand (psql, or
  your Postgres host's SQL console) — no tracking of which have run. Fine at this scale,
  revisit if the schema grows.
- **Looping stablecoin pools is not a product here.** Recursive supply/borrow of the same
  stable (deposit USDC, borrow USDC, deposit again) is leverage, not a dollar park. A depeg
  or oracle miss can liquidate a "stable-stable" loop; borrow APY can exceed supply APY so
  the loop loses money while the headline rate looks high; utilization spikes cascade; and
  protocol-bug risk is multiplied by every loop layer. One-click looping would also look
  like a recommendation. Do not add it.
- **Maple first-time deposits need Maple's own lender authorization.** `authorizeAndDeposit`
  requires a signature from Maple, not from Openhand. We detect `isSyrupLender` via Maple's
  GraphQL API and send already-authorized wallets through `SyrupRouter.deposit`. Unauthorized
  wallets are pointed at syrup.fi.
- **Harvest sell-to-USDC needs `NEXT_PUBLIC_ZEROEX_API_KEY`.** Without it, Harvest still
  claims WELL/CRV/CVX to the connected wallet; the sell step is skipped rather than guessed.
- **CCTP Move has not been transaction-tested** against a live wallet/RPC. Standard
  Transfer attestation from Ethereum or L2s is often 15–19 minutes. If the mint
  signature is rejected after a successful burn, the burn stays in this browser's
  pending list for a manual mint — there is no server-side resume.
- **Panoptic Unicorn is hidden if DeFiLlama has no parseable Unicorn APY**, or if
  `asset()` is not native USDC. Do not substitute another pool's number. The vault
  itself has not been deposit-tested from this app.
- **Circle Fast Transfer is not built.** It would take a fee from the bridged amount.
  Standard Transfer is fee-free at Circle's layer and slower.

## File map

| Path | What |
|---|---|
| `lib/wagmi.ts` | Chain list + wallet connector config, testnet/mainnet switch |
| `lib/config/addresses.ts` | All verified contract addresses, per chain |
| `lib/config/fees.ts` | Fee bps constants, treasury address resolution/validation |
| `lib/config/transak.ts` | Transak env, CAD default, USDC network map. Server-only secrets. |
| `lib/transak/accessToken.ts` | Partner access-token cache. Never import from a client component. |
| `app/api/onramp/widget/route.ts` | One-shot Transak widget URL locked to the connected wallet |
| `components/OnrampModal.tsx` | Buy USDC iframe (Transak on mainnet; faucet copy on testnet) |
| `lib/db.ts` | Server-only lazy Postgres pool. Never import from a client component. |
| `lib/analytics/track.ts` | Client beacon — posts allowlisted events; swallows errors |
| `app/api/analytics/event/route.ts` | First-party event ingest (no wallet/IP stored) |
| `app/admin/page.tsx` | Password-gated analytics dashboard (not in public nav) |
| `migrations/002_site_analytics.sql` | Anonymous site event schema. Applied by hand. |
| `lib/abi/*` | Minimal hand-written ABIs (ERC-20, ERC-4626, Aave Pool + UiPoolDataProvider, Lido stETH + WithdrawalQueue, Curve pool in 2-coin/3-coin variants, Spark PSM, Maple router/pool, Moonwell comptroller, CCTP V2 TokenMessenger/MessageTransmitter) |
| `lib/config/cctp.ts` | CCTP V2 domains, messengers, native USDC per chain |
| `lib/cctp/attestation.ts` | bytes32 mint recipient + Iris parse (skip if attestation missing) |
| `app/api/cctp/attestation/route.ts` | Same-origin Iris pass-through. No wallet, no store. |
| `components/CctpMove.tsx` | User-signed burn → wait → mint. Pending list in localStorage. |
| `app/(public)/move/page.tsx` | Move USDC tool (not a strategy page) |
| `lib/protocols/{aave,lido,yearn,curve,sky,maple,panoptic}.ts` | Per-protocol opportunity fetchers (APY + deposit target + liquidity/riskTier metadata) |
| `lib/protocols/aggregate.ts` | Combines protocol fetchers into one sorted list |
| `lib/hooks/useOpportunities.ts` | React Query wrapper, 60s refresh |
| `lib/hooks/usePositions.ts` | Batched on-chain read of the connected wallet's live balances across every opportunity |
| `lib/hooks/useSendFee.ts` | Sends the fee transfer (native or ERC-20) to the treasury address, no-ops if unconfigured |
| `components/DepositWithdrawModal.tsx` | The actual transaction flow — fee transfer + approve/deposit/withdraw per protocol |
| `components/HarvestRewards.tsx` | Wallet-signed claim of WELL/CRV/CVX, then optional % sell to USDC via 0x |
| `components/LidoWithdrawalRequests.tsx` | Pending Lido withdrawal queue requests + claim + fee-on-claim |
| `components/MapleWithdrawalStatus.tsx` | Maple FIFO queue status (push payout, no claim tx) |
| `components/RiskDisclaimer.tsx` | Short on-page risk disclosure (not a questionnaire) |
| `app/manifest.ts` | PWA manifest (standalone, icons, home-screen shortcuts) |
| `public/sw.js` | Installability + offline shell. Must not cache APY/API/HTML as live. |
| `public/offline.html` | Offline fallback when a navigation fails |
| `lib/pwa.ts` | Standalone / iOS Safari / install-snooze helpers (client only) |
| `components/InstallAppBanner.tsx` | Home-screen install prompt (Chrome) / Safari hint |
| `lib/config/lifi.ts` | LI.FI API host, integrator name, stock chain IDs, Circle USDC lookup |
| `lib/lifi/stocks.ts` | Catalog filter + quote parser. Skip on parse failure — never guess a price. |
| `app/api/lifi/stocks/route.ts` | Cached stock catalog for the dashboard tape |
| `app/api/lifi/quote/route.ts` | USDC ↔ catalogued stock quote. Wallet signs the tx. |
| `components/StockDesk.tsx` | Dashboard browse + holdings-in-view |
| `components/StockSwapModal.tsx` | Approve + LI.FI swap, exact allowance |
| `app/page.tsx` | Collection browse (first-run hero when disconnected / no positions) |
| `app/opportunities/[id]/page.tsx` | Card detail |
