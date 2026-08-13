export const stEthAbi = [
  {
    type: 'function',
    name: 'submit',
    stateMutability: 'payable',
    inputs: [{ name: '_referral', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: '_account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const lidoWithdrawalQueueAbi = [
  {
    type: 'function',
    name: 'requestWithdrawals',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_amounts', type: 'uint256[]' },
      { name: '_owner', type: 'address' },
    ],
    outputs: [{ name: 'requestIds', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'claimWithdrawal',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_requestId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getWithdrawalRequests',
    stateMutability: 'view',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [{ name: 'requestsIds', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getWithdrawalStatus',
    stateMutability: 'view',
    inputs: [{ name: '_requestIds', type: 'uint256[]' }],
    outputs: [
      {
        name: 'statuses',
        type: 'tuple[]',
        components: [
          { name: 'amountOfStETH', type: 'uint256' },
          { name: 'amountOfShares', type: 'uint256' },
          { name: 'owner', type: 'address' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'isFinalized', type: 'bool' },
          { name: 'isClaimed', type: 'bool' },
        ],
      },
    ],
  },
] as const;
