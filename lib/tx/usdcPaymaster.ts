import {
  encodeFunctionData,
  encodePacked,
  getContract,
  hexToBigInt,
  http,
  maxUint256,
  parseErc6492Signature,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { toAccount } from 'viem/accounts';
import {
  createBundlerClient,
  toSimple7702SmartAccount,
} from 'viem/account-abstraction';
import { erc20Abi } from '@/lib/abi/erc20';
import {
  bundlerUrl,
  circlePaymasterAddress,
  circleUsdcAddress,
  gasPermitAmount,
  SIMPLE_7702_IMPLEMENTATION,
  STUB_ECDSA_SIGNATURE,
} from '@/lib/config/paymaster';
import { chains } from '@/lib/wagmi';
import { sign7702Authorization, type Sign7702Fn } from '@/lib/tx/sign7702';
import { estimateCappedGas } from '@/lib/tx/gas';

export type ContractCall = {
  address: `0x${string}`;
  abi: readonly { type?: string }[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId: number;
};

const eip2612Abi = [
  ...erc20Abi,
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

function packPaymasterData(params: {
  usdc: `0x${string}`;
  permitAmount: bigint;
  signature: `0x${string}`;
}): `0x${string}` {
  return encodePacked(
    ['uint8', 'address', 'uint256', 'bytes'],
    [0, params.usdc, params.permitAmount, params.signature],
  );
}

async function signUsdcPermit(params: {
  walletClient: WalletClient;
  owner: `0x${string}`;
  chainId: number;
  usdc: `0x${string}`;
  spender: `0x${string}`;
  permitAmount: bigint;
  publicClient: PublicClient;
}): Promise<`0x${string}`> {
  const token = getContract({
    client: params.publicClient,
    address: params.usdc,
    abi: eip2612Abi,
  });
  const [name, version, nonce] = await Promise.all([
    token.read.name(),
    token.read.version(),
    token.read.nonces([params.owner]),
  ]);

  const typedData = {
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit' as const,
    domain: {
      name,
      version,
      chainId: params.chainId,
      verifyingContract: params.usdc,
    },
    message: {
      owner: params.owner,
      spender: params.spender,
      value: params.permitAmount,
      nonce,
      // Circle Paymaster cannot read block.timestamp under ERC-4337 opcode
      // rules, so the deadline must be max uint256. The *value* is still
      // scoped to permitAmount — not an unbounded allowance.
      deadline: maxUint256,
    },
  };

  const wrapped = await params.walletClient.signTypedData({
    account: params.owner,
    ...typedData,
  });
  return parseErc6492Signature(wrapped).signature;
}

function toBundlerCalls(calls: ContractCall[]) {
  return calls.map((call) => ({
    to: call.address,
    data: encodeFunctionData({
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
    } as never),
    value: call.value ?? 0n,
  }));
}

/**
 * Submit one or more contract calls as a single ERC-4337 UserOp, gas paid in
 * USDC via Circle Paymaster. The connected wallet signs (7702 + permit +
 * UserOp). Openhand does not hold USDC, ETH, or a relayer key.
 */
export async function sendUsdcGasCalls(params: {
  walletClient: WalletClient;
  publicClient: PublicClient;
  owner: `0x${string}`;
  chainId: number;
  calls: ContractCall[];
  sign7702?: Sign7702Fn;
}): Promise<`0x${string}`> {
  const paymasterAddress = circlePaymasterAddress(params.chainId);
  const usdc = circleUsdcAddress(params.chainId);
  if (!paymasterAddress || !usdc) {
    throw new Error('USDC gas is not available on this network.');
  }
  if (params.calls.length === 0) {
    throw new Error('Nothing to send');
  }

  const chain = chains.find((c) => c.id === params.chainId);
  if (!chain) throw new Error('Unsupported network');

  const permitAmount = gasPermitAmount(params.chainId);
  const ownerAccount = toAccount({
    address: params.owner,
    async signMessage({ message }) {
      return params.walletClient.signMessage({ account: params.owner, message });
    },
    async signTypedData(typedData) {
      return params.walletClient.signTypedData({
        account: params.owner,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      } as never);
    },
    async signTransaction() {
      throw new Error('USDC-gas path does not send a raw transaction');
    },
    async signAuthorization(authorization) {
      return sign7702Authorization({
        walletClient: params.walletClient,
        sign7702: params.sign7702,
        authorization: {
          address: authorization.contractAddress ?? authorization.address,
          chainId: Number(authorization.chainId),
          nonce: Number(authorization.nonce),
        },
      });
    },
  });

  const account = await toSimple7702SmartAccount({
    client: params.publicClient,
    owner: ownerAccount as never,
    implementation: SIMPLE_7702_IMPLEMENTATION,
  });

  const paymaster = {
    async getPaymasterStubData() {
      return {
        paymaster: paymasterAddress,
        paymasterData: packPaymasterData({
          usdc,
          permitAmount,
          signature: STUB_ECDSA_SIGNATURE,
        }),
        paymasterVerificationGasLimit: 200_000n,
        paymasterPostOpGasLimit: 15_000n,
        isFinal: false,
      };
    },
    async getPaymasterData() {
      const permitSignature = await signUsdcPermit({
        walletClient: params.walletClient,
        owner: params.owner,
        chainId: params.chainId,
        usdc,
        spender: paymasterAddress,
        permitAmount,
        publicClient: params.publicClient as never,
      });
      return {
        paymaster: paymasterAddress,
        paymasterData: packPaymasterData({
          usdc,
          permitAmount,
          signature: permitSignature,
        }),
        paymasterVerificationGasLimit: 200_000n,
        paymasterPostOpGasLimit: 15_000n,
      };
    },
  };

  const bundlerClient = createBundlerClient({
    account,
    client: params.publicClient,
    chain,
    paymaster,
    transport: http(bundlerUrl(params.chainId)),
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient: bundler }) => {
        try {
          const result = (await bundler.request({
            method: 'pimlico_getUserOperationGasPrice' as never,
          })) as {
            standard?: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
          };
          const fees = result.standard;
          if (!fees?.maxFeePerGas) throw new Error('no pimlico fees');
          return {
            maxFeePerGas: hexToBigInt(fees.maxFeePerGas),
            maxPriorityFeePerGas: hexToBigInt(fees.maxPriorityFeePerGas),
          };
        } catch {
          const gas = await params.publicClient.estimateFeesPerGas();
          const maxPriority = gas.maxPriorityFeePerGas ?? 1n;
          return {
            maxFeePerGas: (gas.maxFeePerGas ?? maxPriority) * 2n,
            maxPriorityFeePerGas: maxPriority * 2n,
          };
        }
      },
    },
  });

  const delegated = await account.isDeployed();
  const authorization = delegated
    ? undefined
    : await sign7702Authorization({
        walletClient: params.walletClient,
        sign7702: params.sign7702,
        authorization: {
          address: SIMPLE_7702_IMPLEMENTATION,
          chainId: params.chainId,
          nonce: await params.publicClient.getTransactionCount({
            address: params.owner,
            blockTag: 'pending',
          }),
        },
      });

  const userOpHash = await bundlerClient.sendUserOperation({
    account,
    calls: toBundlerCalls(params.calls),
    ...(authorization ? { authorization } : {}),
  });

  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });
  const txHash = receipt.receipt.transactionHash as `0x${string}` | undefined;
  if (!txHash) {
    throw new Error('Bundler accepted the operation but no transaction hash came back.');
  }
  if (receipt.success === false) {
    throw new Error('Transaction reverted. The protocol rejected this deposit or withdrawal.');
  }
  return txHash;
}

export async function sendEthGasCalls(params: {
  writeContractAsync: (args: never) => Promise<`0x${string}`>;
  wait: (hash: `0x${string}`, chainId: number) => Promise<unknown>;
  account: `0x${string}`;
  calls: ContractCall[];
}): Promise<`0x${string}`> {
  let last: `0x${string}` | undefined;
  for (const call of params.calls) {
    const gas = await estimateCappedGas({ ...call, account: params.account });
    last = await params.writeContractAsync({ ...call, gas } as never);
    await params.wait(last, call.chainId);
  }
  if (!last) throw new Error('Nothing to send');
  return last;
}
