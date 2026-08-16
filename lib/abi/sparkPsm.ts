/**
 * Spark PSM3 — the cross-chain Peg Stability Module that swaps USDC <-> USDS
 * <-> sUSDS at the current conversion rate with NO slippage and NO fees beyond
 * gas. On L2s (Base, Arbitrum, …) sUSDS is a plain value-accruing ERC-20 (not
 * ERC-4626), so acquiring/redeeming it is a single `swapExactIn` call through
 * this contract rather than a vault deposit/redeem.
 *
 * This is what lets Openhand facilitate USDC -> sUSDS -> USDC start to finish
 * in one signed action each way. See https://docs.spark.fi/dev/savings/spark-psm
 * and lib/config/addresses.ts (addresses verified on-chain via the PSM's own
 * usdc()/usds()/susds() getters).
 */
export const sparkPsmAbi = [
  {
    type: 'function',
    name: 'swapExactIn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetIn', type: 'address' },
      { name: 'assetOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'referralCode', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'previewSwapExactIn',
    stateMutability: 'view',
    inputs: [
      { name: 'assetIn', type: 'address' },
      { name: 'assetOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;
