-- First-party site analytics. Applied by hand, same as 001.
--
-- Privacy: no wallet address, no IP, no user-agent, no cookies on visitors.
-- visitor_hash is sha256(daily-salt + IP) truncated — used only to count
-- unique-ish visitors per day. The IP itself is never stored. Event names
-- and public catalog ids only. Disable by unsetting DATABASE_URL.

CREATE TABLE IF NOT EXISTS site_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event TEXT NOT NULL,
  path TEXT,
  opportunity_id TEXT,
  chain_id INTEGER,
  visitor_hash TEXT
);

CREATE INDEX IF NOT EXISTS site_events_occurred_at_idx ON site_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS site_events_event_idx ON site_events (event);
CREATE INDEX IF NOT EXISTS site_events_visitor_day_idx ON site_events (visitor_hash, occurred_at);
