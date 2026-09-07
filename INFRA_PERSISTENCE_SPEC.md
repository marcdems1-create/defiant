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
- **Ops — answered 2026-09-07:** Same Railway project as HYPERFLEX, but a **new, separate
  Postgres service/instance** within it — not a schema on HYPERFLEX's existing database, and
  not a fully separate Railway project either. This is the middle option: it avoids the exact
  failure mode that motivated this spec (three sites sharing one Postgres instance and
  exhausting its connection pool — a *shared instance* problem, which a separate service
  fully avoids) without the extra billing/access overhead of standing up a whole new project.
- **Product — answered 2026-09-07:** 90-day retention, per the spec's own suggested default —
  plenty for both A1's spread trends and B3's regression diffing, which look at recent history,
  not a long-term archive.

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

## Status (2026-09-07)

Both open questions answered (above). Prepared, ready for step 1 above, but **not yet
connected to anything live**:

- `migrations/003_agent_persistence.sql` — the three P0 tables, following the exact
  hand-applied-raw-SQL pattern `migrations/002_site_analytics.sql` already established. Not
  run against any database yet — there is no `AGENT_DB_URL` to run it against.
- `lib/agentDb.ts` — a lazy `pg.Pool` singleton keyed off a new `AGENT_DB_URL` env var,
  mirroring `lib/db.ts`'s `DATABASE_URL`/`getPool()`/`analyticsEnabled()` shape exactly. New,
  separate env var and connection pool by design (see the file's own header comment) —
  `site_events`' analytics store and this agent-infra store should never share a connection or
  a Postgres instance, even though (per the Ops answer) they can share a Railway *project*.

**Deliberately not built yet:** the actual write paths (a row written to `data_health_snapshot`
when the smoke workflow runs; a row written to `spread_history` when Phase 3b's round-trip
verification computes a candidate) and any wiring into `production-smoke.yml` or
`lib/lifi/stockArb.ts`. Two reasons to stop here rather than push further:

1. **The database doesn't exist yet.** Writing and wiring code against a table that has never
   been created, on a connection string that doesn't exist, would be exactly the kind of
   "shipped but never run against anything real" gap this repo's own `CLAUDE.md` has flagged
   repeatedly (Yearn's API shape, Curve's API shape, the entire Phase 1/3/3b stock-tape build)
   — better to wait for step 1 (provisioning) to actually happen than add one more unverified
   layer on top of several already-unverified ones.
2. **The write path itself has an open design question this session didn't resolve:** should
   `scripts/smoke-stock-market-data.mjs` (a standalone script, run from GitHub Actions, with no
   `pg` dependency or app code access today) get direct Postgres write access via a new
   `AGENT_DB_URL` GitHub Actions secret, or should it POST its computed numbers to a new,
   small, authenticated app endpoint that holds the DB credentials server-side instead (keeping
   the pattern every other secret in this repo already follows — `TRANSAK_API_SECRET`,
   `ADMIN_PASSWORD`, etc. — server-side only, never handed to a CI script)? The latter is more
   consistent with this repo's existing secret-handling posture, but needs a real decision on
   the endpoint's auth mechanism, which is exactly the kind of thing to design once it can
   actually be tested against a live database, not two ops-steps ahead of it.

**Next step, once the database is provisioned:** set `AGENT_DB_URL` (Vercel, server-only, not
`NEXT_PUBLIC_*`), run `migrations/003_agent_persistence.sql` against it by hand, and confirm
`lib/agentDb.ts` connects — then this spec's step 2 (`data_health_snapshot` wiring) is
unblocked, including resolving the write-path question above.
