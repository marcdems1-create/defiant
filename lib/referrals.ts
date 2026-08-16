/**
 * Referral system — client helpers + shared tier logic.
 *
 * Design notes (see also CLAUDE.md non-negotiables #8/#9):
 * - A referral binding links two wallet addresses (referrer -> referee), which
 *   is a social graph and therefore MORE privacy-sensitive than the
 *   questionnaire. It is written server-side ONLY with an explicit opt-in AND a
 *   wallet signature proving the referee controls their address — exactly the
 *   pattern in app/api/preferences/route.ts. See REFERRAL_CONSENT_MESSAGE.
 * - Rewards are intentionally NOT monetary yet. Fees are off (no treasury
 *   configured), so the visible reward is rank/status (tiers). The headline
 *   "fee-free deposits" perk is pre-designed but only becomes economically real
 *   once fees are enabled — at which point a referee's deposit produces an
 *   observable fee transfer to the treasury that can gate a "qualified"
 *   referral. Until then, a "referral" here means a referee who accepted the
 *   invite with a signature (labelled "joined", not "staked").
 */

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Fixed message the referee signs to prove they control the address being
 * linked to a referrer. Must stay byte-identical between client
 * (components/refer/AcceptInviteBanner.tsx) and server
 * (app/api/referrals/route.ts) — change both at once if ever edited.
 */
export const REFERRAL_CONSENT_MESSAGE =
  'I authorize Defiant to record that this wallet address joined via a referral link, linked to the referring wallet address. Defiant may use this to attribute referrals and unlock referral perks.';

const REF_CODE_KEY = 'defiant:referral:pending-code:v1';
const SEEN_TIER_KEY = 'defiant:referral:seen-tier:v1';

export function isWalletAddress(value: string | null | undefined): value is `0x${string}` {
  return typeof value === 'string' && WALLET_RE.test(value);
}

/** Persist an inbound ?ref= code (a referrer wallet address) until the user connects + accepts. */
export function captureRefCode(code: string) {
  if (typeof window === 'undefined' || !isWalletAddress(code)) return;
  window.localStorage.setItem(REF_CODE_KEY, code.toLowerCase());
}

export function getStoredRefCode(): `0x${string}` | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(REF_CODE_KEY);
  return isWalletAddress(raw) ? (raw as `0x${string}`) : null;
}

export function clearStoredRefCode() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REF_CODE_KEY);
}

/** Build the shareable referral link for a given referrer address. */
export function buildReferralLink(referrer: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://defiant.app';
  return `${origin}/?ref=${referrer}`;
}

export interface ReferralTier {
  key: string;
  name: string;
  /** Minimum referral count to reach this tier. */
  min: number;
  /** Badge color (metallic tier palette). */
  color: string;
  blurb: string;
}

/**
 * Rank ladder. Thresholds are intentionally gentle for an early program and
 * are trivial to tune. Names are deliberately friendly and gender-neutral
 * (avoiding militaristic connotations). Starter is the starting rank (min 0).
 */
export const REFERRAL_TIERS: ReferralTier[] = [
  { key: 'starter', name: 'Starter', min: 0, color: '#B87333', blurb: 'Just getting started.' },
  { key: 'connector', name: 'Connector', min: 1, color: '#AEB6BF', blurb: 'First friend on board.' },
  { key: 'builder', name: 'Builder', min: 5, color: '#E9B949', blurb: 'Growing your circle.' },
  { key: 'luminary', name: 'Luminary', min: 15, color: '#8BE9FD', blurb: 'Lighting the way.' },
];

export interface TierProgress {
  current: ReferralTier;
  currentIndex: number;
  next: ReferralTier | null;
  /** 0..1 progress from current tier's threshold to the next tier's threshold. */
  progressToNext: number;
  /** Referrals still needed to reach the next tier (0 if maxed). */
  toNext: number;
}

export function tierForCount(count: number): TierProgress {
  let currentIndex = 0;
  for (let i = 0; i < REFERRAL_TIERS.length; i++) {
    if (count >= REFERRAL_TIERS[i].min) currentIndex = i;
  }
  const current = REFERRAL_TIERS[currentIndex];
  const next = REFERRAL_TIERS[currentIndex + 1] ?? null;
  if (!next) {
    return { current, currentIndex, next: null, progressToNext: 1, toNext: 0 };
  }
  const span = next.min - current.min;
  const done = Math.min(count - current.min, span);
  return {
    current,
    currentIndex,
    next,
    progressToNext: span > 0 ? done / span : 1,
    toNext: Math.max(next.min - count, 0),
  };
}

/** Track the highest tier the user has already celebrated, so the unlock modal fires once per tier. */
export function getSeenTierIndex(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(SEEN_TIER_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function setSeenTierIndex(index: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEEN_TIER_KEY, String(index));
}

export interface ReferralStats {
  address: string;
  /** Number of referees who joined via this address's link. */
  referrals: number;
  /** The address that referred this wallet, if any. */
  referredBy: string | null;
}
