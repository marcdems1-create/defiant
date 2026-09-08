# Testnet Verification Runbook — Tier 1 (Aave / Lido / Yearn)

**Repo:** `marcdems1-create/defiant`
**Purpose:** Phase 1, Tier 1 of the end-of-year launch plan (see `CLAUDE.md` 2026-09-08). This
is the single most important unchecked box in this whole project: **no deposit or withdrawal
has ever been run against a live chain**, testnet or mainnet, for any protocol, at any point in
this project's history. This document exists to actually close that gap, with a human at a
keyboard and a real wallet — nothing here can be run from a sandboxed coding session, since
that has no browser, no real wallet, and (confirmed repeatedly in this repo) no outbound access
to public RPC endpoints either.

**Do not skip a step because "it's probably fine."** The entire point of this exercise is that
nothing in this app has earned that assumption yet.

---

## Prerequisites (do once)

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

## Per-protocol runbook

For each protocol below: **Setup → Deposit → Verify → Withdraw → Verify.** Do not move to the
next protocol until the current one's full cycle (deposit AND withdraw) has passed.

### Aave v3 (`lib/protocols/aave.ts`, Sepolia)

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

### Lido (`lib/protocols/lido.ts`, Sepolia only — no L2 deployment)

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

### Yearn v3 (`lib/protocols/yearn.ts`, all three testnets — **availability not guaranteed**)

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

## Result Log

Fill in one row per protocol per run. Keep every entry, including failed ones — a failed run
with a clear note on what broke is worth more to this project right now than a clean run with
no detail.

| Date | Protocol | Chain | Deposit tx | Withdraw tx | Pass/Fail | Notes |
|------|----------|-------|-----------|-------------|-----------|-------|
| | | | | | | |

## What "Tier 1 Passed" Means

All three protocols have at least one logged, clean deposit → verify → withdraw → verify cycle
above, with any findings (Yearn testnet availability, Lido's claim timing, anything else) fed
back into `CLAUDE.md` and, if code needs to change, fixed and re-run before moving to Phase 1's
Tier 2. Passing this gate is what unblocks Tier 2 (Curve/Convex/Frax/Sky/Maple) per the launch
plan — don't start Tier 2 work with Tier 1 still unresolved.
