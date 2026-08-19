-- Wallet-linked referral attribution.
--
-- This table intentionally stores only referral attribution metadata. No funds
-- movement, no pooled balances, and no private keys.
--
-- Writes must come from an unchecked-by-default consent flow and a valid wallet
-- signature proving control of the address being linked.

CREATE TABLE IF NOT EXISTS referral_attributions (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ref_code TEXT NOT NULL,
  referred_address TEXT NOT NULL,
  consent_checked BOOLEAN NOT NULL DEFAULT TRUE,
  signed_message TEXT NOT NULL,
  signature TEXT NOT NULL,
  nonce TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  source_path TEXT,

  CONSTRAINT referral_code_format_chk CHECK (ref_code ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  CONSTRAINT referred_address_format_chk CHECK (referred_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT referral_consent_required_chk CHECK (consent_checked = TRUE)
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_attributions_referred_address_uidx
  ON referral_attributions (referred_address);
CREATE INDEX IF NOT EXISTS referral_attributions_ref_code_idx
  ON referral_attributions (ref_code);
CREATE INDEX IF NOT EXISTS referral_attributions_created_at_idx
  ON referral_attributions (created_at DESC);
