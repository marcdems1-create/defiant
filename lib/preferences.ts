import type { Opportunity } from '@/lib/protocols/types';

export interface InvestmentPreferences {
  liquidityNeed: 'immediate' | 'flexible';
  riskComfort: 'established' | 'open';
  priority: 'yield' | 'risk';
}

const STORAGE_KEY = 'openhand:preferences:v1';
const SKIPPED_KEY = 'openhand:preferences:skipped:v1';

/**
 * Fixed message the wallet signs to prove it owns the address a saved
 * questionnaire response is attributed to. Must stay byte-identical between
 * client (components/InvestmentStyleQuestionnaire.tsx) and server
 * (app/api/preferences/route.ts) — changing this string invalidates the
 * signature check on both sides simultaneously, which is fine, just change
 * both at once.
 */
export const CONSENT_MESSAGE =
  'I authorize Openhand to store these browse filter settings for the connected wallet address. Openhand may use them to improve the product and may send relevant updates.';

export function wasSkipped(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SKIPPED_KEY) === '1';
}

export function markSkipped() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SKIPPED_KEY, '1');
}

export function getPreferences(): InvestmentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InvestmentPreferences;
  } catch {
    return null;
  }
}

export function setPreferences(prefs: InvestmentPreferences) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function clearPreferences() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Preference-based filter/sort only — never a recommendation or suitability
 * score. This narrows and orders what's shown; it never asserts that any
 * option is "right for you." See components/InvestmentStyleQuestionnaire.tsx
 * for the disclaimer shown alongside it.
 */
export function applyPreferences(
  opportunities: Opportunity[],
  prefs: InvestmentPreferences | null,
): Opportunity[] {
  if (!prefs) return opportunities;

  let filtered = opportunities;
  if (prefs.liquidityNeed === 'immediate') {
    filtered = filtered.filter((o) => o.liquidity === 'instant');
  }
  if (prefs.riskComfort === 'established') {
    filtered = filtered.filter((o) => o.riskTier === 'established');
  }

  return [...filtered].sort((a, b) => {
    if (prefs.priority === 'yield') return b.apy - a.apy;

    // priority === 'risk': established before emerging, instant before
    // delayed, highest APY as the final tiebreak within each bucket.
    const riskRank = (o: Opportunity) => (o.riskTier === 'established' ? 0 : 1);
    const liquidityRank = (o: Opportunity) => (o.liquidity === 'instant' ? 0 : 1);
    if (riskRank(a) !== riskRank(b)) return riskRank(a) - riskRank(b);
    if (liquidityRank(a) !== liquidityRank(b)) return liquidityRank(a) - liquidityRank(b);
    return b.apy - a.apy;
  });
}
