/**
 * Phase 1 scaffold — empty on purpose. Phase 4 moves the existing risk
 * classification (today: the two-tier `riskTier: 'established' | 'emerging'`
 * field on Opportunity in apps/web/lib/protocols/types.ts, plus the
 * liquidity/badge logic in apps/web/lib/protocols/cardBadges.ts) into
 * versioned, typed records here — each one storing the reasoning behind a
 * rating, not just the label, so a rating change is diffable over time.
 */
export const RISK_PACKAGE_VERSION = '0.1.0';
