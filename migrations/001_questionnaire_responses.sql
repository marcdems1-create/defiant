-- Run once against your Postgres instance (Neon/Supabase/Railway console,
-- psql, TablePlus, whatever you use). Not auto-applied — there's no
-- migration runner wired up yet, this is the only migration that exists.
--
-- Stores the investment-style questionnaire answers, linked to a wallet
-- address, ONLY when the user explicitly opted in via the consent checkbox
-- in the UI (components/InvestmentStyleQuestionnaire.tsx). Never written to
-- without consented_at being set by that same request — see
-- app/api/preferences/route.ts.

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  wallet_address TEXT PRIMARY KEY,
  liquidity_need TEXT NOT NULL CHECK (liquidity_need IN ('immediate', 'flexible')),
  risk_comfort   TEXT NOT NULL CHECK (risk_comfort IN ('established', 'open')),
  priority       TEXT NOT NULL CHECK (priority IN ('yield', 'risk')),
  consented_at   TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
