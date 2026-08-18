/**
 * Maple syrupUSDC — verified 2026-08-18 against Maple's own integration docs
 * (https://docs.maple.finance/integrate/ethereum-mainnet/smart-contract-integration
 * and frontend-integration). Deposit goes through SyrupRouter; exit is
 * `requestRedeem` on PoolV2 (FIFO queue, funds are pushed when processed).
 */
export const mapleSyrupRouterAbi = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'depositData', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

export const maplePoolAbi = [
  {
    type: 'function',
    name: 'requestRedeem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'convertToExitShares',
    stateMutability: 'view',
    inputs: [{ name: 'assets_', type: 'uint256' }],
    outputs: [{ name: 'shares_', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'convertToAssets',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'convertToShares',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
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
    name: 'asset',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;
