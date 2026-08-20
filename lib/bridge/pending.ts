/**
 * In-browser record of LI.FI USDC moves started from Openhand.
 *
 * A move is not a yield deposit — USDC leaves one chain and lands in the
 * same wallet on another. If we forget that mid-flight, the dashboard shows
 * $0 cash and no position and a first-time user thinks the money is gone.
 * localStorage only; nothing wallet-linked is written to the database.
 */

export type StoredMoveStatus = 'PENDING' | 'DONE' | 'FAILED';

export interface StoredUsdcMove {
  txHash: `0x${string}`;
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  toAmount: string;
  tool: string;
  account: `0x${string}`;
  createdAt: number;
  opportunityId?: string;
  protocolLabel?: string;
  receivingTxHash?: `0x${string}`;
  status: StoredMoveStatus;
}

export const PENDING_USDC_MOVES_KEY = 'openhand.lifi.pending.v1';

const MAX_ROWS = 8;
const DONE_KEEP_MS = 24 * 60 * 60 * 1000;

function isTxHash(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isMove(row: unknown): row is StoredUsdcMove {
  if (!row || typeof row !== 'object') return false;
  const r = row as StoredUsdcMove;
  return (
    isTxHash(r.txHash) &&
    typeof r.fromChainId === 'number' &&
    typeof r.toChainId === 'number' &&
    typeof r.fromAmount === 'string' &&
    typeof r.toAmount === 'string' &&
    typeof r.account === 'string' &&
    typeof r.createdAt === 'number' &&
    (r.status === 'PENDING' || r.status === 'DONE' || r.status === 'FAILED')
  );
}

export function readStoredUsdcMoves(): StoredUsdcMove[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PENDING_USDC_MOVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(isMove).filter((row) => {
      if (row.status === 'PENDING' || row.status === 'FAILED') return true;
      return now - row.createdAt < DONE_KEEP_MS;
    });
  } catch {
    return [];
  }
}

export function writeStoredUsdcMoves(rows: StoredUsdcMove[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PENDING_USDC_MOVES_KEY, JSON.stringify(rows.slice(0, MAX_ROWS)));
  window.dispatchEvent(new Event('openhand:usdc-moves'));
}

export function upsertStoredUsdcMove(row: StoredUsdcMove) {
  const rows = readStoredUsdcMoves().filter((r) => r.txHash.toLowerCase() !== row.txHash.toLowerCase());
  writeStoredUsdcMoves([row, ...rows]);
}

export function patchStoredUsdcMove(
  txHash: `0x${string}`,
  patch: Partial<Pick<StoredUsdcMove, 'status' | 'receivingTxHash' | 'toAmount'>>,
) {
  const rows = readStoredUsdcMoves().map((r) =>
    r.txHash.toLowerCase() === txHash.toLowerCase() ? { ...r, ...patch } : r,
  );
  writeStoredUsdcMoves(rows);
}

export function dismissStoredUsdcMove(txHash: `0x${string}`) {
  writeStoredUsdcMoves(readStoredUsdcMoves().filter((r) => r.txHash.toLowerCase() !== txHash.toLowerCase()));
}

export function movesForAccount(account: `0x${string}` | undefined): StoredUsdcMove[] {
  if (!account) return [];
  const needle = account.toLowerCase();
  return readStoredUsdcMoves().filter((r) => r.account.toLowerCase() === needle);
}
