/**
 * Curve StableSwap-NG "factory plain pool" interface. The pool contract IS
 * the LP token — there's no separate ERC-20 to track — so balance/allowance/
 * approve for a Curve position go through `erc20Abi` against this same
 * address. Only the 2-coin functions this app actually calls are included;
 * see `lib/config/addresses.ts`'s CURVE comment for how this shape was
 * verified against the deployed pool.
 */
export const curvePoolAbi = [
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
