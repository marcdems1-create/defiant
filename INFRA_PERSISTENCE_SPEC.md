# Defiant Infra: Persistence Layer for Agent Data

**Repo:** `marcdems1-create/defiant`
**Depends on:** Nothing new — unblocks A1 (spread watcher) and B3 (regression diffing) from
`AGENT_INFRASTRUCTURE_SPEC.md`.
**Current state:** Only table is `site_events` (anonymous analytics, `migrations/002_site_analytics.sql`,
`lib/db.ts`). No historical storage for spreads, mapping health, or alert config.

Checked into the repo 2026-09-07, same as `BUILD_SPEC.md` and `AGENT_INFRASTRUCTURE_SPEC.md` —
so this lives in-tree instead of only in a pasted message. Status/answers below are additions to
the original text, not a rewrite of it.

---

## Problem Statement

A1 and B3 both need to compare "now" against "before" — spread history over time, unmatched-row
counts over time. Right now every run is stateless; nothing persists between smoke-test runs or
cron ticks. This is the one piece both specs are blocked on.

## Decision: Postgres

Reuse Railway Postgres operational knowledge from HYPERFLEX (backup/restore, connection pooling,
migration patterns) rather than introducing a second datastore purely for this. The one thing to
get right from HYPERFLEX's own lessons: **do not share the instance across projects** — the
August/September HYPERFLEX incident was caused by three sites sharing one Postgres and exhausting
a connection pool. Defiant gets its own database, not a schema bolted onto HYPERFLEX's existing DB.

## Non-Goals
- Not migrating `site_events` off whatever it currently uses — leave analytics alone unless
  there's a separate reason to touch it.
- Not building a general-purpose "events" abstraction — two specific tables for two specific
  needs, not a speculative platform.
- Not building alert-destination UI in this pass — config via environment variable/simple table
  row is enough for now; a settings page is a later nice-to-have.

## Must-Have (P0)

- [ ] **New Railway Postgres database**, isolated from HYPERFLEX's instance, provisioned for
  defiant specifically.
- [ ] **`spread_history` table**: one row per (token pair, chains, timestamp) capturing gross
  spread, net spread, liquidity-check result, and the `matchStale` flag inherited at compute
  time. This is the data source for A1 and for Phase 3's deferred sparkline nice-to-have.
- [ ] **`data_health_snapshot` table**: one row per scheduled check capturing unmatched-row
  count, staleness rate, and failed-liquidity-probe count — the input B3 needs to diff between
  runs.
- [ ] **`alert_config` table**: minimal — destination type (webhook URL, email), threshold
  value, which watcher it applies to (`spread` or `data_health`), enabled flag. Store the
  webhook URL as a secret/env-reference, not plaintext, if it contains any token.
- [ ] **Retention policy**: define and implement a simple cutoff with a cleanup job — history
  tables grow unbounded otherwise, and nothing here needs indefinite retention yet.
- [ ] **Migration scripts** following the repo's existing pattern (see "Open Questions —
  Engineering," answered below — no new tool needed).

## Nice-to-Have (P1)
- [ ] Basic index/query helper for "spread trend for token X over last N days" — the exact
  shape A1's sparkline feature will need.
- [ ] A lightweight admin view (extends the `/admin/stocks` pattern) to see recent
  `data_health_snapshot` rows without querying the DB directly.

## Acceptance Criteria
- Given the new database is provisioned, when defiant's existing app or smoke tests run, then
  HYPERFLEX's database is completely unaffected — verify by checking HYPERFLEX's connection
  count/logs show no change.
- Given a spread computation runs (from Phase 3b's logic), when it completes, then a row is
  written to `spread_history` — whether that computation was triggered by a user's tape load or
  a future scheduled agent.
- Given `alert_config` is empty, when the persistence layer ships, then nothing behaves
  differently for end users — this is additive infrastructure, not a user-facing change yet.
- `npm run typecheck`, `npm run lint`, `npm run build` pass clean.
- New database connection tested against production before this is considered done — same
  live-verification discipline as every other phase.

## Open Questions

- **Engineering — answered 2026-09-07:** No migration tool exists in this repo (no Prisma,
  Knex, Drizzle, etc. in `package.json`). The existing pattern (`migrations/002_site_analytics.sql`,
  referencing an `001` that predates this session) is hand-numbered raw `.sql` files, applied by
  hand against `DATABASE_URL`, read via a lazy `pg.Pool` singleton (`lib/db.ts`) gated by
  `analyticsEnabled()`/equivalent boolean checks everywhere it's used. Follow that pattern exactly
  for the new tables (a `003_*.sql`, `004_*.sql`, ... file per table or per logical change) rather
  than introducing an ORM or migration framework for this. This mirrors `CLAUDE.md` rule #4's
  spirit (don't introduce new infra patterns casually) even though that rule is written about
  network mode specifically.
- **Ops — needs your call, asked separately.**
- **Product — needs your call, asked separately.**

## Suggested Sequencing
1. Provision the database and confirm isolation from HYPERFLEX first — this is the one
   irreversible-feeling step (getting connection/access right) and should be validated before
   any table design work. **This step happens outside Claude Code** — this sandbox has no
   Railway credentials or access, same as it never had Vercel/Privy/Transak dashboard access in
   every prior ops step logged in `CLAUDE.md`. Table/migration-file work below can be drafted in
   parallel, but the connection itself has to be created and tested by a human against the real
   Railway account.
2. `data_health_snapshot` + wiring it into the existing smoke-test workflow (cheapest win,
   unblocks B3 fastest).
3. `spread_history` + wiring into Phase 3b's compute path.
4. `alert_config` last, once there's actual data to alert on.
