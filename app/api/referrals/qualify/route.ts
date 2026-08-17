import { NextResponse } from 'next/server';
import { createPublicClient, http, type Chain } from 'viem';
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'viem/chains';
import { getDb } from '@/lib/db';
import { getTreasuryAddress, feesEnabled } from '@/lib/config/fees';

/**
 * Fee-event qualification. A referee becomes "qualified" (counts toward their
 * referrer's rank-based fee discount) once they have actually PAID A FEE — an
 * observable transfer to the treasury. The client calls this right after a
 * referee's fee transfer succeeds, passing the fee tx hash; the server
 * independently verifies the receipt on-chain (fee transfer FROM the referee TO
 * the treasury) before flipping qualified_at. Nothing is trusted from the
 * client beyond the tx hash, and it only ever runs when fees are enabled.
 *
 * Why this exists: it's the anti-sybil gate. Free wallet signups stay "joined"
 * but unqualified, so a referrer can't farm rank with throwaway wallets — each
 * qualified referral cost real fees. See README "Referral fee mesh".
 */

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_RE = /^0x[a-fA-F0-9]{64}$/;
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const VIEM_CHAINS: Record<number, { chain: Chain; rpcEnv: string }> = {
  [mainnet.id]: { chain: mainnet, rpcEnv: 'NEXT_PUBLIC_RPC_MAINNET' },
  [base.id]: { chain: base, rpcEnv: 'NEXT_PUBLIC_RPC_BASE' },
  [arbitrum.id]: { chain: arbitrum, rpcEnv: 'NEXT_PUBLIC_RPC_ARBITRUM' },
  [sepolia.id]: { chain: sepolia, rpcEnv: 'NEXT_PUBLIC_RPC_SEPOLIA' },
  [baseSepolia.id]: { chain: baseSepolia, rpcEnv: 'NEXT_PUBLIC_RPC_BASE_SEPOLIA' },
  [arbitrumSepolia.id]: { chain: arbitrumSepolia, rpcEnv: 'NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA' },
};

/** Lowercased address out of a 32-byte log topic. */
function addrFromTopic(topic: string | undefined): string | null {
  if (typeof topic !== 'string' || topic.length !== 66) return null;
  return `0x${topic.slice(26)}`.toLowerCase();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { refereeAddress, chainId, txHash } = body as Record<string, unknown>;
  if (typeof refereeAddress !== 'string' || !WALLET_RE.test(refereeAddress)) {
    return NextResponse.json({ error: 'Invalid refereeAddress' }, { status: 400 });
  }
  if (typeof txHash !== 'string' || !TX_RE.test(txHash)) {
    return NextResponse.json({ error: 'Invalid txHash' }, { status: 400 });
  }
  const cid = typeof chainId === 'number' ? chainId : Number(chainId);
  const chainEntry = VIEM_CHAINS[cid];
  if (!chainEntry) {
    return NextResponse.json({ error: 'Unsupported chainId' }, { status: 400 });
  }

  // No treasury => fees are off => there is no fee event to qualify against.
  const treasury = getTreasuryAddress();
  if (!feesEnabled() || !treasury) {
    return NextResponse.json({ qualified: false, reason: 'fees_disabled' });
  }
  const treasuryLc = treasury.toLowerCase();
  const refereeLc = refereeAddress.toLowerCase();

  let verified = false;
  try {
    const client = createPublicClient({
      chain: chainEntry.chain,
      transport: http(process.env[chainEntry.rpcEnv] || undefined),
    });
    const [tx, receipt] = await Promise.all([
      client.getTransaction({ hash: txHash as `0x${string}` }),
      client.getTransactionReceipt({ hash: txHash as `0x${string}` }),
    ]);

    const sentByReferee = tx.from?.toLowerCase() === refereeLc;
    const successful = receipt.status === 'success';

    // Native fee transfer (e.g. Lido ETH fee): tx straight to the treasury.
    const nativeToTreasury =
      tx.to?.toLowerCase() === treasuryLc && (tx.value ?? 0n) > 0n;

    // ERC-20 fee transfer: a Transfer(referee -> treasury) log in the receipt.
    const erc20ToTreasury = receipt.logs.some(
      (log) =>
        log.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
        addrFromTopic(log.topics[1]) === refereeLc &&
        addrFromTopic(log.topics[2]) === treasuryLc,
    );

    verified = successful && sentByReferee && (nativeToTreasury || erc20ToTreasury);
  } catch {
    return NextResponse.json({ error: 'Could not verify transaction' }, { status: 502 });
  }

  if (!verified) {
    return NextResponse.json({ qualified: false, reason: 'no_fee_transfer_found' });
  }

  try {
    const db = getDb();
    // Only marks an existing binding, and only the first time.
    const { rowCount } = await db.query(
      `UPDATE referrals SET qualified_at = now(), updated_at = now()
         WHERE referee_address = LOWER($1) AND qualified_at IS NULL`,
      [refereeAddress],
    );
    return NextResponse.json({ qualified: true, newlyQualified: (rowCount ?? 0) > 0 });
  } catch (e) {
    console.error('[api/referrals/qualify] DB update failed', e);
    return NextResponse.json({ error: 'Referral storage unavailable' }, { status: 503 });
  }
}
