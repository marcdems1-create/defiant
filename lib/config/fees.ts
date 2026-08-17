/**
 * Fee model: a flat basis-point cut on deposit and withdrawal, taken as a
 * separate wallet-signed transfer to a treasury address — never skimmed by
 * a contract that touches user funds. See README "Fees" for the full
 * mechanism and why it's two transactions, not one.
 *
 * Referral mesh (see README "Referral fee mesh"): the *effective* bps a wallet
 * pays is reduced by referral status — a referred user (referee) pays less,
 * and a referrer pays less on their OWN deposits as their rank climbs. This is
 * pure "don't charge" discounting: it moves no funds, so it's non-custodial by
 * construction and there's nothing to farm for profit (the only "reward" is a
 * bounded reduction of your own fee — always < the fee itself). Rank-based
 * referrer discounts are gated on QUALIFIED referrals (referees who actually
 * paid a fee), so they can't be farmed with free wallet signups.
 *
 * NOTE ON NUMBERS: these bps are the single source of truth and are meant to be
 * retuned here. `STANDARD_FEE_BPS` is intentionally above `REFEREE_FEE_BPS` so
 * the referee number is a genuine discount — a referee fee only makes sense as
 * a reduction when the standard fee sits above it.
 */

/** Standard fee everyone pays with no referral relationship (1.00%). */
export const STANDARD_FEE_BPS = 100;
/** Reduced fee for a referred user — a "50% off" coupon vs standard (0.50%). */
export const REFEREE_FEE_BPS = 50;
/**
 * Referrer self-discount by rank, indexed to REFERRAL_TIERS order
 * (Starter, Connector, Builder, Luminary). Applies to the referrer's OWN
 * deposits/withdrawals. Starter == standard (no discount yet).
 */
export const RANK_FEE_BPS = [100, 75, 50, 25];

// Kept for back-compat / display defaults; the standard schedule applies to
// both deposit and withdraw. Prefer feeBpsFor() for the effective rate.
export const DEPOSIT_FEE_BPS = STANDARD_FEE_BPS;
export const WITHDRAW_FEE_BPS = STANDARD_FEE_BPS;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface FeeContext {
  /** Wallet is a signature-bound referee (came in via someone's link). */
  isReferee?: boolean;
  /**
   * The wallet's own referrer rank index (0=Starter … 3=Luminary), derived
   * from its QUALIFIED referral count. Omit/undefined = no referrer discount.
   */
  referrerRankIndex?: number;
}

/**
 * Effective fee bps for a wallet given its referral context. Returns the best
 * (lowest) applicable rate, clamped to [0, STANDARD] — it can only ever reduce
 * the fee, never surcharge. With no referral relationship this is STANDARD.
 */
export function feeBpsFor(ctx: FeeContext = {}): number {
  const candidates = [STANDARD_FEE_BPS];
  if (ctx.isReferee) candidates.push(REFEREE_FEE_BPS);
  if (typeof ctx.referrerRankIndex === 'number' && ctx.referrerRankIndex >= 0) {
    const i = Math.min(ctx.referrerRankIndex, RANK_FEE_BPS.length - 1);
    candidates.push(RANK_FEE_BPS[i] ?? STANDARD_FEE_BPS);
  }
  const best = Math.min(...candidates);
  return Math.max(0, Math.min(best, STANDARD_FEE_BPS));
}

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
