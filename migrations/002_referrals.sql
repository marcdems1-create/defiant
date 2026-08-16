-- Run once against your Postgres instance (same as 001 — there's no migration
-- runner wired up yet, these are applied by hand).
--
-- Stores referral bindings: which wallet (referee) joined via which referrer's
-- link. Written ONLY when the referee explicitly opts in AND provides a wallet
-- signature over REFERRAL_CONSENT_MESSAGE proving they control referee_address
-- — see app/api/referrals/route.ts. This is a social graph, so it is treated
-- with the same consent + proof-of-ownership discipline as the questionnaire
-- (see CLAUDE.md non-negotiables #8/#9). Addresses are stored lowercased.
--
-- One referrer per referee, immutable once set (PRIMARY KEY + insert uses
-- ON CONFLICT DO NOTHING). Self-referral is rejected at the DB and API layers.

CREATE TABLE IF NOT EXISTS referrals (
  referee_address  TEXT PRIMARY KEY,
  referrer_address TEXT NOT NULL,
  consented_at     TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (referee_address <> referrer_address)
);

-- Referrer stats (count of referees per referrer) are read on the /refer page.
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_address);
