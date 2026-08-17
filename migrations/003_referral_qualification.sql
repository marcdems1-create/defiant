-- Run once against Postgres (hand-applied, like 001/002).
--
-- Adds fee-event QUALIFICATION to referrals: a referee is "qualified" once they
-- have actually paid a fee (an observable treasury inflow from their address).
-- Only qualified referees count toward a referrer's rank-based fee discount, so
-- free wallet signups can't farm it. See app/api/referrals/qualify/route.ts and
-- README "Referral fee mesh".

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;

-- Referrer rank reads qualified referees; index the common filter.
CREATE INDEX IF NOT EXISTS referrals_qualified_idx
  ON referrals (referrer_address)
  WHERE qualified_at IS NOT NULL;
