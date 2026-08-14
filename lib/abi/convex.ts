/**
 * Minimal hand-written ABIs for Convex's CRV Depositor and cvxCRV Rewards (staking)
 * contracts. VERIFIED 2026-08-13 against the actual open-source contract code at
 * github.com/convex-eth/platform (contracts/contracts/CrvDepositor.sol and
 * BaseRewardPool.sol) — every signature below matches exactly, including confirming
 * `getReward()` is a genuine zero-argument overload alongside the contract's other
 * `getReward(address,bool)` variant (not a mismatch). Etherscan's own curated address
 * tags independently confirm both addresses' identity: "Convex Finance: CRV Depositor"
 * (0x8014595F2AB54cD7c604B00E9fb932176fDc86Ae) and "Convex Finance: cvxCRV Rewards"
 * (0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e). Still worth a final check of the exact
 * bytecode/verified-source tab on Etherscan directly before real funds touch this, but
 * this is no longer an unverified hand-write — it's been checked against source.
 */
export const crvDepositorAbi = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    // _lock=false takes the cheaper "swap on Curve if better priced" path instead of an
    // irreversible veCRV lock; _stakeAddress routes straight into cvxCRV Rewards so the
    // convert + stake happens as a single transaction, matching Convex's own UI flow.
    inputs: [
      { name: '_amount', type: 'uint256' },
      { name: '_lock', type: 'bool' },
      { name: '_stakeAddress', type: 'address' },
    ],
    outputs: [],
  },
] as const;

/** Convex's BaseRewardPool interface, as used for cvxCRV staking. */
export const cvxCrvRewardsAbi = [
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'claim', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getReward',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'earned',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
