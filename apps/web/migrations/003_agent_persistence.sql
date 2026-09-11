-- Agent infrastructure persistence (INFRA_PERSISTENCE_SPEC.md). Applied by hand against a
-- dedicated Postgres instance, same manual pattern as 001/002 — no migration tool in this repo.
--
-- Deliberately a SEPARATE database/connection from site_events (migrations/002). Decided
-- 2026-09-07: same Railway project as HYPERFLEX, but its own Postgres service/instance, not a
-- schema bolted onto an existing one — the HYPERFLEX incident that motivated this was three
-- sites sharing one Postgres instance and exhausting its connection pool. Read via
-- lib/agentDb.ts's AGENT_DB_URL, never DATABASE_URL (site_events' anonymous-analytics store —
-- keep that one privacy-scoped and untouched by this).
--
-- Retention: 90 days, decided 2026-09-07. Neither table needs indefinite history yet; run the
-- DELETE below on a schedule (see the note at the bottom) once this is live.

CREATE TABLE IF NOT EXISTS spread_history (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- CoinGecko's coin id — Phase 1's proven-same-asset identity (lib/lifi/stocks.ts#cgeckoId).
  -- Never group/query this table by ticker symbol; see lib/lifi/stockArb.ts's own warning
  -- about why symbol-based grouping reintroduces the misattribution risk Phase 1 fixed.
  cgecko_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  low_chain_id INTEGER NOT NULL,
  high_chain_id INTEGER NOT NULL,
  low_price_usd DOUBLE PRECISION NOT NULL,
  high_price_usd DOUBLE PRECISION NOT NULL,
  gross_spread_pct DOUBLE PRECISION NOT NULL,
  -- NULL when the round-trip verification (Phase 3b) never ran or didn't clear the liquidity
  -- gate for this row — a candidate that fails is dropped from the live tape, but still worth
  -- recording here as "seen, not executable" for trend purposes. Never backfill a guessed value.
  net_spread_pct DOUBLE PRECISION,
  liquidity_ok BOOLEAN NOT NULL,
  match_stale BOOLEAN NOT NULL,
  bridge_tool TEXT
);

CREATE INDEX IF NOT EXISTS spread_history_recorded_at_idx ON spread_history (recorded_at DESC);
CREATE INDEX IF NOT EXISTS spread_history_cgecko_id_idx ON spread_history (cgecko_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS data_health_snapshot (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Mirrors scripts/smoke-stock-market-data.mjs's own computed numbers — this table is what
  -- lets a future check diff "now" against "before" instead of only checking a fixed threshold.
  catalog_rows INTEGER NOT NULL,
  matched_rows INTEGER NOT NULL,
  unmatched_rows INTEGER NOT NULL,
  stale_rows INTEGER NOT NULL,
  arb_candidate_rows INTEGER,
  arb_verified_rows INTEGER,
  smoke_passed BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS data_health_snapshot_recorded_at_idx ON data_health_snapshot (recorded_at DESC);

CREATE TABLE IF NOT EXISTS alert_config (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'spread' watches spread_history, 'data_health' watches data_health_snapshot.
  watcher TEXT NOT NULL CHECK (watcher IN ('spread', 'data_health')),
  -- 'webhook' or 'email'. The destination itself (a webhook URL, an email address) is not
  -- stored in this column directly when it's secret-shaped — store an env-var reference
  -- (e.g. 'env:SLACK_SPREAD_ALERT_WEBHOOK') and resolve it server-side, never a raw token in
  -- a plaintext DB column. A non-secret destination (a plain email address) can be stored
  -- directly.
  destination_type TEXT NOT NULL CHECK (destination_type IN ('webhook', 'email')),
  destination TEXT NOT NULL,
  threshold_value DOUBLE PRECISION NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false
);

-- Retention cleanup (90 days) — not yet scheduled anywhere; run by hand or wire into a cron
-- once this database is live. Intentionally two separate statements, not a stored procedure,
-- to match this repo's "no framework beyond raw SQL" convention (see file header).
-- DELETE FROM spread_history WHERE recorded_at < now() - interval '90 days';
-- DELETE FROM data_health_snapshot WHERE recorded_at < now() - interval '90 days';
