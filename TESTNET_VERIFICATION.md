# Transaction Verification Runbook — Tiers 1 & 2

**Repo:** `marcdems1-create/defiant`
**Purpose:** Phase 1 of the end-of-year launch plan (see `CLAUDE.md` 2026-09-08). This is the
single most important unchecked box in this whole project: **no deposit or withdrawal has ever
been run against a live chain**, testnet or mainnet, for any protocol, at any point in this
project's history. This document exists to actually close that gap, with a human at a keyboard
and a real wallet — nothing here can be run from a sandboxed coding session, since that has no
browser, no real wallet, and (confirmed repeatedly in this repo) no outbound access to public
RPC endpoints either.

**Do not skip a step because "it's probably fine."** The entire point of this exercise is that
nothing in this app has earned that assumption yet.

Two tiers, two different methodologies, because they face a genuinely different constraint:
Tier 1's three protocols all have real Sepolia/testnet deployments, so they get tested the
straightforward way. **Tier 2's five protocols do not — confirmed this session, every one of
them is mainnet-only** (Curve and Convex say so in their own code comments; Frax, Sky's Spark
PSM, and Maple's addresses simply have no testnet entry in `lib/config/addresses.ts` at all).
See the Tier 2 section below for why that changes the approach rather than just being "the same
thing, but scarier."

---

## Tier 1 — Testnet (Aave / Lido / Yearn)

### Prerequisites (do once)

1. **A browser wallet** (MetaMask or similar) — not Privy's embedded wallet for this exercise,
   so you can inspect the raw transaction before signing. Set `NEXT_PUBLIC_NETWORK_MODE` unset
   or `testnet` (the default — see `.env.example`) so the app runs against Sepolia / Base
   Sepolia / Arbitrum Sepolia.
2. **Testnet ETH** on all three chains, for gas:
   - Sepolia: [sepoliafaucet.com](https://sepoliafaucet.com) or Alchemy/Infura's faucets.
   - Base Sepolia: [bridge.base.org](https://bridge.base.org) (bridge Sepolia ETH) or a Base
     faucet.
   - Arbitrum Sepolia: [Arbitrum's bridge](https://bridge.arbitrum.io) from Sepolia, or a
     dedicated faucet.
3. **RPC URLs** for all three testnets set in `.env.local`
   (`NEXT_PUBLIC_RPC_SEPOLIA`/`_BASE_SEPOLIA`/`_ARBITRUM_SEPOLIA` — a free tier from Alchemy,
   Infura, or a public endpoint works). The app has no default baked in; without these it may
   fall back to a rate-limited public RPC or fail outright.
4. Run the app locally (`npm run dev`) against this config, or use a Vercel preview deploy with
   the same env vars — either works, since this only needs a running instance and a real
   browser wallet, not any special sandbox access.

---

### Per-protocol runbook

For each protocol below: **Setup → Deposit → Verify → Withdraw → Verify.** Do not move to the
next protocol until the current one's full cycle (deposit AND withdraw) has passed.

#### Aave v3 (`lib/protocols/aave.ts`, Sepolia)

- **Setup:** Aave publishes an official Sepolia testnet faucet at
  [app.aave.com](https://app.aave.com) (switch network to Sepolia, use the in-app "Faucet" —
  mints test USDC directly to your connected wallet, no swap needed).
- **Deposit:** Open the Aave v3 USDC card on the Openhand tape → Deposit → enter an amount →
  confirm the `approve` transaction (check it's scoped to the exact amount, not
  `type(uint256).max` — non-negotiable #2) → confirm the `supply` transaction.
- **Verify:** Your wallet's aUSDC (or displayed position) balance increases by roughly the
  deposited amount. The app's own position display updates without a manual refresh.
- **Withdraw:** Withdraw the same or a partial amount → confirm the transaction (no approval
  needed for withdraw, since it's your own aToken being burned).
- **Verify:** USDC balance returns to your wallet; position balance decreases accordingly.
- **Watch for:** `lib/protocols/aave.ts` reads `getReservesData` live — if the card doesn't
  show up in the tape at all on Sepolia, that's a config/address problem, not a UI bug; check
  `lib/config/addresses.ts`'s Sepolia entry first.

#### Lido (`lib/protocols/lido.ts`, Sepolia only — no L2 deployment)

- **Setup:** No faucet needed beyond testnet ETH itself — Lido's deposit *is* the swap (native
  ETH in, stETH out).
- **Deposit:** Open the Lido card → Deposit → enter an ETH amount → confirm the `submit`
  transaction (`DepositWithdrawModal.tsx` line ~495).
- **Verify:** stETH balance appears in your wallet roughly equal to the ETH deposited (1:1 at
  submission; it rebases afterward — don't expect growth within a test session).
- **Withdraw — this is the one with real complexity, not instant:**
  1. Request: confirm the `approve` (stETH → WithdrawalQueue) then `requestWithdrawals`
     transaction. **Known gap** (per README "Known simplifications"): the app always submits a
     fresh approve rather than checking existing allowance — expect an extra signature here
     even on a second withdrawal; that's a known, accepted redundancy, not a bug to chase.
  2. Wait: on Sepolia this can still take real time to become finalized/claimable (mirrors
     mainnet's queue mechanics, though possibly faster on testnet — note actual wait time
     observed for the log below).
  3. Claim: `components/LidoWithdrawalRequests.tsx` should show the pending request and, once
     claimable, a Claim button. Confirm that transaction.
- **Verify:** ETH returns to your wallet after claim.
- **Watch for:** this async request→claim flow, not the simple deposit, is where a real bug is
  most likely to hide — it's the most stateful, multi-transaction path in the whole Tier 1 set.

#### Yearn v3 (`lib/protocols/yearn.ts`, all three testnets — **availability not guaranteed**)

- **Step 0, before anything else:** Yearn has **no hardcoded vault addresses** in this repo —
  `fetchYearnOpportunities` queries yDaemon's live API (`ydaemon.yearn.fi/{chainId}/vaults/all`)
  for whatever v3 USDC vaults currently exist on that chain. **Check whether a Yearn card even
  appears in the tape on each testnet before doing anything else.** If it doesn't, that is
  itself the finding — Yearn may simply not maintain an active v3 USDC vault on that testnet —
  and it needs to be logged as a real launch-planning input (can Yearn be verified on any
  testnet at all, or does it need to go straight to a small mainnet test like Curve does),
  not treated as "something to fix."
- **If a card does appear — Setup:** get testnet USDC (Aave's Sepolia faucet mints USDC too;
  for Base/Arbitrum Sepolia, check whether the specific vault's underlying token has its own
  faucet, since it may not be the same USDC as Aave's).
- **Deposit:** standard ERC-4626 `approve` + `deposit`.
- **Verify:** vault share balance increases.
- **Withdraw:** ERC-4626 `redeem`.
- **Verify:** USDC returns to wallet.
- **Watch for:** yDaemon's field-shape assumptions (`apr.forwardAPR.netAPR` etc., see
  `lib/protocols/yearn.ts`'s own comment) have never been confirmed against a live response —
  if the card shows up but the APY looks obviously wrong (zero, absurdly high, `NaN`-adjacent),
  that confirms the parsing needs a second look before this ships.

---

## Tier 2 — Mainnet-Fork First (Curve / Convex / Frax / Sky / Maple)

**Why this tier is different, not just scarier:** confirmed this session — none of these five
protocols exist on any public testnet at all:

- `lib/protocols/curve.ts`'s own comment: "Curve doesn't deploy either configured pool to any
  testnet."
- `lib/protocols/convex.ts`'s own comment: "Mainnet only; Convex does not deploy to testnets."
- `lib/config/addresses.ts`'s `FRAX`, `SPARK_PSM` (Sky), and `MAPLE` constants each have
  **only mainnet chain IDs as keys** — no Sepolia/Base Sepolia/Arbitrum Sepolia entry exists to
  even attempt.

So "just use testnet like Tier 1" isn't an option here. The original plan's instinct — "budget
explicit time and a small real-amount mainnet test" — is directionally right but skips a much
safer, standard, and free intermediate step that should happen first: **fork mainnet locally
and test against the real deployed contracts with fake money**, before ever putting a real
dollar at risk.

### Recommended tooling: Foundry's `anvil`

[Foundry](https://book.getfoundry.sh/getting-started/installation) is a single-binary install
(`curl -L https://foundry.paradigm.xyz | bash && foundryup`), no Node dependency tree needed
beyond what this repo already has. Its `anvil` component forks live mainnet state at the block
you choose:

```bash
anvil --fork-url <a mainnet RPC URL, e.g. from Alchemy/Infura> --fork-block-number latest
```

This gives you a local RPC endpoint (`http://127.0.0.1:8545` by default) that has **every real
contract this app talks to — Curve pools, the CRV Depositor, Spark's PSM, Maple's pool — with
their actual live state**, but where you can mint yourself arbitrary ETH/USDC for free
(`anvil_setBalance`, or impersonate a whale address that already holds a lot of the token via
`anvil_impersonateAccount` and move funds from it). Point the app's mainnet RPC config at this
local endpoint instead of a real provider, connect a wallet with a well-known Anvil test private
key (Anvil prints ten funded accounts and their keys on startup — safe to use, they are
publicly known test keys, never reuse one anywhere real), and the entire deposit/withdraw flow
below can be exercised against real contract logic with zero real money at risk, unlimited
retries, and no gas cost.

**This is not a substitute for one final real-money test** — a fork can't validate your actual
production RPC provider, real gas pricing, or a real wallet's live signing UX end-to-end. But it
is the right place to catch a wrong function signature, a bad slippage calc, or a misread
contract address, all of which are far cheaper to find here than on a live transaction.

### Per-protocol runbook (fork first, then one small real-money confirmation)

#### Curve (`lib/protocols/curve.ts`, Ethereum mainnet only, two pools)

- **On the fork:** deposit USDC into both configured pools (crvUSD/USDC and 3pool) — they use
  **different ABI variants** (`curvePoolAbi2Coin` vs `curvePoolAbi3Coin`,
  `DepositWithdrawModal` branches on `opportunity.curve.numCoins`), so both need their own run,
  not just one as a stand-in for the other. Confirm `add_liquidity` succeeds, LP token balance
  appears, and `calc_token_amount`'s preview roughly matches what you actually received.
  Withdraw via `remove_liquidity_one_coin` back to USDC, confirm the 1%-tolerance min-out
  (`calc_withdraw_one_coin`) didn't revert and didn't let through an unreasonably bad price.
- **On mainnet, real money, small amount only:** repeat once for each pool. This is explicitly
  the least-proven integration in the app per this repo's own history — treat a clean fork run
  as necessary, not sufficient, before trusting it live.

#### Convex (`lib/protocols/convex.ts`) — one-way conversion, test this assumption specifically

- **On the fork:** deposit CRV via `CrvDepositor.deposit()` (two-call sequence per
  `components/DepositWithdrawModal.tsx`) and confirm cvxCRV lands in the rewards pool, staked.
  **Specifically verify the one-way claim is true** — the code comment says Convex's own docs
  call this "irreversible... you will not be able to convert cvxCRV to CRV using the platform."
  Confirm the UI copy matches that reality exactly; a user needs to understand this before
  signing, not discover it after.
- **Withdraw:** `cvxCrvRewards.withdraw()` — confirm this returns cvxCRV, not CRV, matching the
  description text ("cvxCRV cannot be converted back to CRV, only traded or unstaked as
  cvxCRV").
- **Mainnet confirmation:** small amount, same sequence.

#### Frax (`lib/protocols/frax.ts`, sfrxUSD, plain ERC-4626)

- **On the fork:** standard `approve` + `deposit` + `redeem` cycle, same shape as Yearn's Tier 1
  test. Lowest-complexity protocol in this tier.
- **Mainnet confirmation:** small amount.

#### Sky (`lib/protocols/sky.ts`, sUSDS via Spark PSM3, Base + Arbitrum)

- **On the fork:** fork **Base or Arbitrum**, not Ethereum, for this one (`anvil --fork-url
  <a Base or Arbitrum RPC>`). `swapExactIn` both directions (USDC→sUSDS, sUSDS→USDC) against the
  PSM. Confirm it's genuinely 1:1 minus only gas, no protocol fee, matching the description.
- **Mainnet confirmation:** small amount, on **both** Base and Arbitrum — they're separate PSM
  deployments, a bug on one doesn't guarantee the same on the other.

#### Maple (`lib/protocols/maple.ts`, syrupUSDC, Ethereum) — has an external dependency, start this one early

- **Before any technical test:** the wallet you'll use needs lender authorization on
  **syrup.fi** itself — `fetchMapleLenderStatus()` reads this live, and
  `DepositWithdrawModal.tsx` blocks deposit for an `unauthorized` wallet. **Openhand cannot
  grant this itself.** Start this authorization now, in parallel with everything else in this
  document, since its timeline isn't under this project's control.
- **On the fork:** once authorized (or by impersonating an already-authorized whale address on
  the fork to at least test the happy path), deposit via `SyrupRouter.deposit()` with the
  `MAPLE_DEPOSIT_DATA` partner tag. Confirm `asset()` reads back USDC as expected.
- **Withdraw is the real test here:** `PoolV2.requestRedeem()` — this is an async FIFO queue,
  not an instant redeem. The description text says "often hours to a couple of days... up to 30
  days documented when liquidity is tight." Confirm `fetchMaplePositionStatus()` correctly
  reflects `redeemRequested` state and eventual availability — this is the second most
  stateful, multi-step withdrawal flow in the whole app after Lido's.
- **Mainnet confirmation:** only once your own wallet is genuinely lender-authorized — don't try
  to route around that requirement.

---

## Result Log

Fill in one row per protocol per run — testnet, mainnet-fork, and final mainnet confirmations
all get their own row. Keep every entry, including failed ones — a failed run with a clear note
on what broke is worth more to this project right now than a clean run with no detail.

| Date | Protocol | Environment (testnet / fork / mainnet) | Chain | Deposit tx | Withdraw tx | Pass/Fail | Notes |
|------|----------|------------------------------------------|-------|-----------|-------------|-----------|-------|
| | | | | | | | |

## What "Passed" Means

**Tier 1:** all three protocols have at least one logged, clean deposit → verify → withdraw →
verify cycle on testnet, with any findings (Yearn testnet availability, Lido's claim timing,
anything else) fed back into `CLAUDE.md` and, if code needs to change, fixed and re-run.

**Tier 2:** all five protocols have a clean fork-tested cycle **and** a clean small-real-amount
mainnet confirmation, with Maple's syrup.fi lender authorization actually granted (not
bypassed) before its mainnet confirmation counts. Passing Tier 1's gate is what unblocks
starting Tier 2 per the launch plan — don't start Tier 2 work with Tier 1 still unresolved, and
don't call Tier 2 "done" on fork results alone.
