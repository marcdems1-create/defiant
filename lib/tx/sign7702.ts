import type { SignedAuthorization, WalletClient } from 'viem';

type UnsignedAuth = {
  address: `0x${string}`;
  chainId: number;
  nonce: number;
};

export type Sign7702Fn = (input: {
  contractAddress: `0x${string}`;
  chainId?: number;
  nonce?: number;
}) => Promise<{
  address: `0x${string}`;
  chainId: number;
  nonce: number;
  r: `0x${string}`;
  s: `0x${string}`;
  yParity?: number;
  v?: bigint | number;
}>;

function asSigned(raw: unknown, fallback: UnsignedAuth): SignedAuthorization | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const inner =
    o.authorization && typeof o.authorization === 'object'
      ? (o.authorization as Record<string, unknown>)
      : o.data && typeof o.data === 'object'
        ? ((o.data as Record<string, unknown>).authorization as Record<string, unknown> | undefined) ?? o
        : o;
  if (!inner || typeof inner !== 'object') return null;
  const r = inner.r;
  const s = inner.s;
  if (typeof r !== 'string' || typeof s !== 'string') return null;
  const yParityRaw = inner.yParity ?? inner.y_parity ?? inner.v;
  let yParity = 1;
  if (typeof yParityRaw === 'number') yParity = yParityRaw === 27 || yParityRaw === 1 ? 1 : 0;
  else if (typeof yParityRaw === 'bigint') yParity = yParityRaw === 27n || yParityRaw === 1n ? 1 : 0;
  else if (typeof yParityRaw === 'string') {
    const n = Number(yParityRaw);
    yParity = n === 27 || n === 1 ? 1 : 0;
  }
  const chainId =
    typeof inner.chainId === 'number'
      ? inner.chainId
      : typeof inner.chain_id === 'number'
        ? inner.chain_id
        : fallback.chainId;
  const nonce =
    typeof inner.nonce === 'number'
      ? inner.nonce
      : typeof inner.nonce === 'bigint'
        ? Number(inner.nonce)
        : fallback.nonce;
  const address =
    (typeof inner.address === 'string' && inner.address.startsWith('0x')
      ? inner.address
      : typeof inner.contract === 'string' && inner.contract.startsWith('0x')
        ? inner.contract
        : fallback.address) as `0x${string}`;
  return {
    address,
    chainId,
    nonce,
    r: r as `0x${string}`,
    s: s as `0x${string}`,
    yParity,
  };
}

/**
 * Sign an EIP-7702 authorization so this EOA can submit ERC-4337 UserOps.
 * Prefers Privy (`useSign7702Authorization`), then wallet RPC, then a local
 * account on the viem WalletClient. JSON-RPC MetaMask often cannot do this —
 * those wallets still pay gas in ETH.
 */
export async function sign7702Authorization(params: {
  walletClient: WalletClient;
  authorization: UnsignedAuth;
  sign7702?: Sign7702Fn;
}): Promise<SignedAuthorization> {
  const { walletClient, authorization, sign7702 } = params;
  const contractAddress = authorization.address;

  if (sign7702) {
    const signed = await sign7702({
      contractAddress,
      chainId: authorization.chainId,
      nonce: authorization.nonce,
    });
    const normalized = asSigned(signed, authorization);
    if (normalized) return normalized;
  }

  const account = walletClient.account;
  if (account && 'signAuthorization' in account && typeof account.signAuthorization === 'function') {
    return account.signAuthorization({
      address: contractAddress,
      chainId: authorization.chainId,
      nonce: authorization.nonce,
    });
  }

  const attempts: Array<() => Promise<unknown>> = [
    () =>
      walletClient.request({
        method: 'eth_sign7702Authorization' as never,
        params: {
          contract: contractAddress,
          chain_id: authorization.chainId,
          nonce: authorization.nonce,
        } as never,
      }),
    () =>
      walletClient.request({
        method: 'eth_sign7702Authorization' as never,
        params: [
          {
            contract: contractAddress,
            chainId: authorization.chainId,
            nonce: authorization.nonce,
          },
        ] as never,
      }),
  ];

  for (const attempt of attempts) {
    try {
      const raw = await attempt();
      const normalized = asSigned(raw, authorization);
      if (normalized) return normalized;
    } catch {
      // try the next RPC shape
    }
  }

  throw new Error(
    'This wallet cannot pay gas in USDC (missing EIP-7702 signing). Use the email/passkey wallet, or send a little ETH on this chain.',
  );
}
