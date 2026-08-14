# Defiant

A non-custodial DeFi yield interface. Connect your own wallet, compare live on-chain yield
across Aave v3, Lido, Yearn v3, Curve, Frax, and Convex, and deposit or withdraw with transactions you sign
yourself. Defiant never takes custody of user funds — there is no pooled contract, no admin
key, no path for the app itself to move anyone's money.

> **Naming note:** this is deliberately *not* marketed as a "savings app" anywhere in the
> product. DeFi yield carries smart-contract, market, and liquidity risk and is not deposit-
> insured the way a bank savings account is (no FDIC/CDIC/FSCS-equivalent coverage anywhere).
> Calling it a savings product would misrepresent that risk to users — see the regulatory
> section below.

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
- [RainbowKit](https://rainbowkit.com) for the connect UI
- Tailwind CSS
- No backend, no database. Everything reads directly from-chain or from each protocol's
  public read-only API.

## Protocols integrated

| Protocol | Chains | Asset | Deposit | Withdraw |
|---|---|---|---|---|
| Aave v3 | Ethereum, Base, Arbitrum | USDC | `Pool.supply()` | `Pool.withdraw()` — instant |
| Lido | Ethereum only (no L2 deployment) | ETH → stETH | `stETH.submit()` | Request queue, **1-5 days** to finalize, then `claimWithdrawal()` |
| Yearn v3 | Ethereum, Base, Arbitrum | USDC vaults | ERC-4626 `deposit()` | ERC-4626 `redeem()` — instant, subject to vault liquidity |
| Curve (scrvUSD) | Ethereum only | crvUSD | ERC-4626 `deposit()` | ERC-4626 `redeem()` — instant, funds sit idle in the vault |
| Frax (sfrxUSD) | Ethereum only | frxUSD | ERC-4626 `deposit()` | ERC-4626 `redeem()` — instant |
| Convex (cvxCRV) | Ethereum only | CRV → cvxCRV | `CrvDepositor.deposit()` — converts + stakes, **irreversible** | `BaseRewardPool.withdraw()` — returns cvxCRV, not CRV |

Curve/Frax/Convex are all higher-risk than Aave/Lido/Yearn — they're layered on other
protocols and/or newer stable designs, and the app shows an explicit "Higher risk" badge on
these opportunities rather than letting APY alone imply safety (see "Known simplifications"
below — this is a coarse signal, not real risk scoring).

**Fee-on-conversion:** opportunities whose deposit asset isn't USDC (Curve/Frax/Convex above)
can optionally be funded by converting from USDC first, via 0x's Swap API
(`lib/swap/zeroex.ts`). This stays non-custodial — the swap transaction is built by the app
but always signed and sent by the connected wallet, never a backend signer — and takes a
configurable fee (`NEXT_PUBLIC_SWAP_FEE_BPS`) paid to `NEXT_PUBLIC_SWAP_FEE_RECIPIENT`
atomically inside that same transaction. See `.env.example`.

Contract addresses live in `lib/config/addresses.ts`, pulled from
[bgd-labs/aave-address-book](https://github.com/bgd-labs/aave-address-book) (Aave's own
canonical registry) and [lidofinance/docs](https://github.com/lidofinance/docs) on
2026-08-13. Curve and Convex addresses were pulled directly from docs.curve.fi and
docs.convexfinance.com on 2026-08-12. The Frax sfrxUSD address was re-verified 2026-08-13
against two independent sources (Etherscan's own curated address tag + CoinGecko's
contract lookup, both agreeing) after docs.frax.finance's specific frxUSD/sfrxUSD page
proved unreachable directly — see the full note in `lib/config/addresses.ts`. **Re-verify
against official sources before any mainnet deploy** — don't assume addresses stay correct
indefinitely.

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
- **Curve/Frax/Convex APY comes from DeFiLlama's public yields API**
  (`lib/protocols/defillama.ts`), not each protocol's own API — same defensive
  "skip rather than guess" parsing as Yearn, but this sandbox couldn't reach
  `yields.llama.fi` to confirm the live field names either. Smoke-test before trusting
  displayed APYs, same caveat as Yearn above.
- **The 0x conversion flow (`lib/swap/zeroex.ts`) has never been transaction-tested.**
  Response field names (`transaction.to/data/value`, `issues.allowance.spender`) are
  best-guess against 0x's documented API shape, not a live-verified response — get a real
  API key and smoke-test a quote before trusting this with funds.
- ~~Convex's ABI (`lib/abi/convex.ts`) is unverified against a block explorer's ABI.~~
  Verified 2026-08-13 against the actual open-source contract code
  (github.com/convex-eth/platform) — every signature matches, and both contract
  addresses carry confirming Etherscan address tags. See the comment in
  `lib/abi/convex.ts`.
- **Convex's Booster/LP-staking path (the "real" boosted CRV+CVX+bribes yield) is not
  built** — only the simpler single-sided cvxCRV stake is wired up. See "What to build
  next" in `CLAUDE.md` for the scoped-out multi-step, multi-token-reward version.
- **veCRV/veFXS direct governance locking is deliberately not offered** — up to 4-year
  non-transferable locks don't fit this app's instant deposit/withdraw assumptions.
  Convex's cvxCRV already gives the liquid version of that yield without lock UI.
- **No protocol risk scoring or TVL/liquidity display.** APY is shown with zero context on
  underlying risk (smart contract audit status, vault strategy composition, Aave utilization
  rate). A real "savings"-adjacent product needs this before it's honest to a non-technical
  user — see the North Star framing from a sibling project's CLAUDE.md: never let a number
  imply safety it hasn't earned.
- **No slippage/price-impact handling anywhere** — deposits and withdrawals are 1:1 at the
  protocol's own exchange rate; there's no DEX routing, so this isn't applicable to the three
  integrated protocols as built, but matters immediately if a DEX-based instant-Lido-exit path
  is ever added.

## File map

| Path | What |
|---|---|
| `lib/wagmi.ts` | Chain list + wallet connector config, testnet/mainnet switch |
| `lib/config/addresses.ts` | All verified contract addresses, per chain |
| `lib/abi/*` | Minimal hand-written ABIs (ERC-20, ERC-4626, Aave Pool + UiPoolDataProvider, Lido stETH + WithdrawalQueue, Convex CRV Depositor + cvxCRV Rewards) |
| `lib/protocols/{aave,lido,yearn,curve,frax,convex}.ts` | Per-protocol opportunity fetchers (APY + deposit target) |
| `lib/protocols/defillama.ts` | Shared APY lookup for Curve/Frax/Convex against DeFiLlama's yields API |
| `lib/protocols/aggregate.ts` | Combines all six into one sorted list |
| `lib/swap/zeroex.ts` | Non-custodial fee-on-conversion via 0x's Swap API |
| `lib/hooks/useOpportunities.ts` | React Query wrapper, 60s refresh |
| `lib/hooks/usePositions.ts` | Batched on-chain read of the connected wallet's live balances across every opportunity |
| `components/DepositWithdrawModal.tsx` | The actual transaction flow — approve/deposit/withdraw per protocol |
| `components/LidoWithdrawalRequests.tsx` | Pending Lido withdrawal queue requests + claim |
| `app/page.tsx` | Portfolio dashboard (connect-wallet hero when disconnected) |
| `app/opportunities/page.tsx` | Full opportunity comparison list |
