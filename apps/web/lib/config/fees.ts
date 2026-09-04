/**
 * Deposit/withdraw treasury fee — KEEP DISABLED.
 *
 * The code path is a flat bps cut taken as a separate wallet-signed transfer
 * to a treasury address, never skimmed inside supply()/deposit()/submit().
 * Do not set NEXT_PUBLIC_TREASURY_ADDRESS. Monetize on Transak's partner fee
 * (Buy USDC) and optional 0x swapFeeBps (convert-then-deposit only). See
 * README "Fees" and CLAUDE.md non-negotiable #6 (2026-08-17).
 */
export const DEPOSIT_FEE_BPS = 25; // 0.25%
export const WITHDRAW_FEE_BPS = 25; // 0.25%

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Same treasury address is reused across every chain (Ethereum/Base/Arbitrum
 * all support the same address format). Not set by default — until
 * NEXT_PUBLIC_TREASURY_ADDRESS is configured, feesEnabled() is false and no
 * fee transfer is ever attempted. Never fall back to a hardcoded address:
 * an unset treasury must disable fees, not silently send funds somewhere
 * unintended.
 */
export function getTreasuryAddress(): `0x${string}` | undefined {
  const raw = process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim();
  if (!raw) return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return undefined;
  if (raw.toLowerCase() === ZERO_ADDRESS) return undefined;
  return raw as `0x${string}`;
}

export function feesEnabled(): boolean {
  return getTreasuryAddress() !== undefined;
}

export function computeFee(amount: bigint, bps: number): bigint {
  return (amount * BigInt(bps)) / 10_000n;
}
