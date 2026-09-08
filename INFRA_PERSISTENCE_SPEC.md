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

## Status (2026-09-07, continued) — provisioning and live verification cannot happen from here

Asked this session to provision the Railway database and check it live. Neither half of that
is possible from a Claude Code sandbox, for two separate, unrelated reasons — not one thing
blocking both:

1. **Provisioning:** this sandbox has no Railway CLI, no `RAILWAY_*` credentials, and no
   Railway MCP tool — confirmed by checking for all three. Every prior ops step in this repo
   that needed a third-party dashboard (Vercel env vars, Privy app settings, Transak KYB/
   allowlisting) has required the repo owner to act directly in that dashboard; Railway is no
   different. **This has to happen in the Railway dashboard (or the Railway CLI on your own
   machine), not from here.**
2. **Live verification:** even with a connection string in hand, this sandbox's egress proxy
   explicitly does not support raw-TCP database connections (`/root/.ccr/README.md`: "Not
   supported through the proxy (report, do not work around): ... raw-TCP databases"). So even
   after you provision it, pasting `AGENT_DB_URL` into this conversation would not let this
   session confirm it's reachable — a `pg` connection attempt from here would just hang or
   fail against the proxy, not against the database.

**What was built instead, so verification can happen somewhere that actually has network
access:** `app/api/admin/agent-db-health/route.ts` (password-gated, same
`isAdminSession()` pattern as `/api/admin/stats`) connects via `lib/agentDb.ts#getAgentPool()`,
runs `SELECT 1`, checks all three tables from migration 003 exist via `to_regclass`, and
returns each one's row count. `/admin/agent-db` (linked from the main `/admin` page) renders
that as a status page — the same "police the live state through a page you can actually load in
a browser, not through Claude Code" pattern as `/admin/stocks`. This runs on Vercel, which has
real network access, so it's the actual answer to "check it live" once the database exists.

**To finish this yourself:**
1. Railway dashboard → your project → New → Database → PostgreSQL (per the Ops answer above:
   same project as HYPERFLEX, new service — do not attach it to HYPERFLEX's existing Postgres
   service).
2. Copy that service's connection string.
3. Run `migrations/003_agent_persistence.sql` against it by hand (`psql "$CONNECTION_STRING" -f migrations/003_agent_persistence.sql`,
   or any Postgres client — same manual-apply pattern as `002_site_analytics.sql`).
4. Vercel → Settings → Environment Variables → add `AGENT_DB_URL` = that connection string,
   server-only (do not prefix it `NEXT_PUBLIC_*`).
5. Redeploy.
6. Open `https://www.openhand.online/admin/agent-db` (log into `/admin` first if needed) — it
   should show "Connection: OK" and all three tables present with 0 rows.

## Status (2026-09-08) — database provisioned; write paths wired

The repo owner provisioned the database and ran the migration (a fully separate Railway
**project** rather than a same-project new service — the actual final topology decision,
slightly more isolated than the "same project" answer above; both were valid options per
the Ops question, so this isn't a deviation worth re-litigating, just the record of which
one actually happened). `migrations/003_agent_persistence.sql` ran clean against it
(`CREATE TABLE` × 3, `CREATE INDEX` × 3). `AGENT_DB_URL` is now set on Vercel.

That resolved the last open design question from the prior Status section — how
`scripts/smoke-stock-market-data.mjs` (a CI script with no `pg` dependency) should get a
`data_health_snapshot` row written without handing it raw database credentials. Decided:
**a small authenticated ingest endpoint**, not a raw `AGENT_DB_URL` GitHub Actions secret —
matching this repo's existing posture that secrets stay server-side only
(`TRANSAK_API_SECRET`, `ADMIN_PASSWORD`) and are never handed to a CI script.

What got built:

- **`spread_history` writes** — `lib/lifi/stockArb.ts#buildArbRows` now fire-and-forgets an
  insert of every verified `StockArbRow` after each fresh (non-cached) computation. Gated on
  `agentPersistenceEnabled()`; a write failure is caught and logged, never thrown — this must
  never be able to break the live tape or arb panel. Deliberately narrower than the table's
  own schema comment invites: only fully round-trip-verified rows are persisted right now
  (`liquidity_ok` is always `true`, `net_spread_pct` always non-null in every row this writes)
  — raw candidates that got dropped during verification are not yet logged as "seen, not
  executable." That richer version is a documented future enhancement, not an oversight.
- **`data_health_snapshot` writes** — new `app/api/agent/health-snapshot/route.ts`, a
  write-only POST endpoint authenticated by a shared bearer token (new `AGENT_INGEST_TOKEN`
  env var, checked against `Authorization: Bearer <token>`). `scripts/smoke-stock-market-data.mjs`
  now POSTs its computed numbers there after every run — skipped (not failed) when
  `AGENT_INGEST_TOKEN` isn't set, and a write failure only logs a warning, never affects the
  smoke check's own pass/fail exit code. `production-smoke.yml`'s `smoke:stocks` step now
  passes `secrets.AGENT_INGEST_TOKEN` through as an env var.
- `.env.example` documents both new env vars (`AGENT_DB_URL`, `AGENT_INGEST_TOKEN`).

All four response branches of the new endpoint were exercised locally against a throwaway
`next start` (no token configured → 503; wrong bearer → 401; correct bearer with no
`AGENT_DB_URL` → 503; correct bearer with a fake unreachable `AGENT_DB_URL` → 500 with the
real Postgres connection error) — this is the most any piece of this build has been verified
before reaching production, precisely because it was finally possible to run a local server
and hit it directly rather than needing live CoinGecko/LI.FI egress. `npm run typecheck`,
`npm run lint`, and `npm run build` all pass clean.

**Still not verified against the real production database or a real GitHub Actions run:**
whether `AGENT_INGEST_TOKEN` actually gets set as a GitHub Actions secret (ops step, not
code — add it under repo Settings → Secrets and variables → Actions), whether a live
`smoke:stocks` run actually produces a `data_health_snapshot` row, and whether a live tape
load actually produces `spread_history` rows. Check `/admin/agent-db`'s row counts after the
next scheduled smoke run and the next stock-arb cache refresh to confirm both.

If step 6 shows anything else, the error message it displays is the actual Postgres/driver
error, not a guess from this session — read it directly rather than asking here first.
