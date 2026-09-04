/**
 * Spark PSM3 — verified 2026-08-18 against Spark's own docs
 * (https://docs.spark.fi/dev/savings/spark-psm) and the open-source
 * implementation at github.com/sparkdotfi/spark-psm (src/PSM3.sol).
 *
 * L2 sUSDS is a plain ERC-20, not ERC-4626. USDC ↔ sUSDS is a 1:1 (rate-oracle)
 * swap with no protocol fee beyond gas. `previewSwapExactIn` is the min-out source.
 */
export const sparkPsmAbi = [
  {
    type: 'function',
    name: 'usdc',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'susds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
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
] as const;
