/**
 * Curve StableSwap pool interfaces. `add_liquidity`/`calc_token_amount`
 * take a fixed-length `uint256[N]` amounts array sized to the pool's coin
 * count, so a 2-coin factory pool (e.g. crvUSD/USDC) and a 3-coin pool
 * (3pool) need distinct ABI entries for those two functions — pick the
 * variant matching `CurvePoolConfig.numCoins` from `lib/config/addresses.ts`.
 * `remove_liquidity_one_coin`/`calc_withdraw_one_coin` take a single burn
 * amount + coin index regardless of pool size, so both variants share the
 * same shape for those two.
 */
export const curvePoolAbi2Coin = [
  {
    type: 'function',
    name: 'add_liquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_amounts', type: 'uint256[2]' },
      { name: '_min_mint_amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'calc_token_amount',
    stateMutability: 'view',
    inputs: [
      { name: '_amounts', type: 'uint256[2]' },
      { name: '_is_deposit', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'remove_liquidity_one_coin',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_burn_amount', type: 'uint256' },
      { name: 'i', type: 'int128' },
      { name: '_min_received', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'calc_withdraw_one_coin',
    stateMutability: 'view',
    inputs: [
      { name: '_burn_amount', type: 'uint256' },
      { name: 'i', type: 'int128' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/** Same shape as `curvePoolAbi2Coin`, sized for 3pool's 3-coin (DAI/USDC/USDT) amounts arrays. */
export const curvePoolAbi3Coin = [
  {
    type: 'function',
    name: 'add_liquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_amounts', type: 'uint256[3]' },
      { name: '_min_mint_amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'calc_token_amount',
    stateMutability: 'view',
    inputs: [
      { name: '_amounts', type: 'uint256[3]' },
      { name: '_is_deposit', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'remove_liquidity_one_coin',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_token_amount', type: 'uint256' },
      { name: 'i', type: 'int128' },
      { name: 'min_amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'calc_withdraw_one_coin',
    stateMutability: 'view',
    inputs: [
      { name: '_token_amount', type: 'uint256' },
      { name: 'i', type: 'int128' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
