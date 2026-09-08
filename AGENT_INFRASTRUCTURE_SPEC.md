# Agent Infrastructure: Research/Monitoring + Dev Acceleration

**Repo:** `marcdems1-create/defiant`
**Scope:** Two agent tracks, deliberately excluding autonomous execution/fund movement for now.
**Applies to:** `defiant` (primary), `openhand.online` (secondary — smaller surface, apply
learnings after defiant proves out).

Checked into the repo (2026-09-07) so future sessions have the full spec in-tree instead of
only in a pasted message, following the same pattern as `BUILD_SPEC.md`. Status annotations
below track what's actually shipped vs. still open — read those, not just the original text.

**⏸ Paused 2026-09-08 — Phase 0 of the end-of-year launch plan (see `CLAUDE.md`).** With a hard
December 31 launch deadline and solo capacity, every remaining Track A item (A1–A4: spread
watcher, new-listing scout, landscape watcher, data-health watcher) is on hold. None of them
are on the critical path to a launchable product — B2 (already shipped) covers the minimum
"don't ship silent regressions" bar for now. Resume these post-launch, not before. Track B's
already-shipped items (B2) stay as-is; B1/B3/B4 are likewise not launch-blocking and stay
paused alongside A1–A4.

---

## Why these two, and not execution agents

Execution agents (agents that move funds autonomously) compound every existing risk in the
stack — the Phase 3b round-trip quote path hasn't even been validated against live data yet
(see `CLAUDE.md`). Putting an autonomous agent on top of unverified quote logic is building on
sand. Research agents and dev agents both increase surface area and speed without that
exposure — they're the right on-ramp to agentic infrastructure, with execution agents as a
deliberate, later phase once the underlying data/quote layer has a track record.

---

## Track A: Research/Monitoring Agents

**Goal:** Continuous, autonomous surfacing of opportunities and anomalies across the
tokenized-RWA space — feeding the human (you, or eventually users) rather than acting
independently.

### A1 — Arb/Spread Watcher — not started
- Runs the Phase 3b round-trip quote logic on a schedule (not just on-demand tape load) across
  the full multi-chain token set, not just top-12-by-gross-spread.
- Persists spread history so you get a real time series, not just point-in-time snapshots —
  this is also the data source for the Phase 3 "historical spread sparkline" P1 item.
- Alerts (Slack/email/webhook) when net spread crosses a threshold you set, using the same
  liquidity/fee-adjusted logic already built — no new arb math, just a different trigger
  (scheduled agent vs. user page load).
- **Needs before building:** a persistence store for spread history (none exists yet — the
  only server-side store in this app is the anonymous `site_events` table, see
  non-negotiable #9 in `CLAUDE.md`; this would be a new, different table) and an alerting
  destination (Slack webhook URL, or email) that isn't configured anywhere in this repo yet.
  Both are ops decisions, not something to invent silently.

### A2 — New Listing Scout — not started
- Watches CoinGecko's tokenized-stock endpoint and LI.FI's token list for new entries not yet
  in defiant's address-keyed mapping.
- Surfaces candidates in the existing `/admin/stocks` unmatched view (extends Phase 1's admin
  pattern) with a proposed mapping, flagged for human approval before going live — do not
  auto-add new address mappings without review, since a bad mapping here reintroduces exactly
  the misattribution risk Phase 1 was built to prevent.
- `/admin/stocks` and `app/api/admin/stocks-unmatched/route.ts` already show the raw unmatched
  rows this would classify against — this extends that view, doesn't replace it.

### A3 — Competitor/Landscape Watcher — not code
- Periodic web-search-driven agent (not code you deploy — this is closer to a scheduled
  research task) tracking new RWA tokenization platforms, issuer launches (new
  Ondo/Backed/xStocks products), and regulatory movement relevant to tokenized equities.
- Output: a digest, not raw noise — summarized findings, not a firehose.
- Doesn't need custom infrastructure; it's a recurring prompt against current tools, and could
  run as a scheduled task rather than custom-built code.

### A4 — Data Health Watcher — partially covered by B2 below
- Monitors the things Phase 1/3 already flag (staleness, unmatched rows, failed liquidity
  probes) and turns "someone has to remember to check `/admin/stocks`" into a proactive alert
  when the unmatched list grows past a threshold or staleness rates spike.
- **What's actually shipped (2026-09-07):** `scripts/smoke-stock-market-data.mjs` already
  computes unmatched ratio, absolute match count, and staleness ratio against fixed
  thresholds (see `CLAUDE.md` 2026-09-06 entry for the current calibration), and the B2
  workflow change below turns a threshold trip into a tracked GitHub issue instead of a
  red run nobody notices. That is fixed-threshold alerting, not the trend/spike detection
  this item originally asked for ("grows past a threshold **or staleness rates spike**") —
  a real spike detector needs a persisted history of past runs to compare against, which
  doesn't exist yet (same gap as A1's persistence need above). Treat the threshold-based
  version as the cheap first cut, not the finished item.

**Guardrails for all of Track A:**
- Read-only against external APIs and your own data — no write access to on-chain state, no
  wallet interaction, no execution.
- Rate-limit-aware — scheduled agents polling LI.FI/CoinGecko on top of live user traffic need
  their own budget, not competing with the smoke tests and live tape for the same quota. This
  is exactly why the B2 change below keeps `smoke:stock-arb` (which fires real LI.FI quotes)
  off the same 30-minute cadence as the cheap checks — see that section.

---

## Track B: Dev Acceleration Agents

**Goal:** Shorten the loop between "spec written" and "verified in production" — already
running a spec → Claude Code → review cycle; the question is what parts of that can run with
less manual round-tripping.

### B1 — Spec-to-PR Pipeline Discipline — process fix, not code
Nothing to build here — this is a process fix. The pattern already works (this session is the
proof). The gap is verification: every phase so far has shipped with "not tested against live
data from this sandbox" as a standing caveat (see every `CLAUDE.md` session update from
2026-09-04 onward). Before adding more agent throughput, close that loop: standardize a
**post-merge live-verification step** as a required, tracked step — not just a note in
`CLAUDE.md` that might get skipped under time pressure. B2 below is the concrete version of
this for the two existing smoke scripts; the discipline itself (don't merge phases whose spec
calls out a live-verification step without a plan for who runs it and when) is still on
whoever reviews the next PR, not something code can enforce by itself.

### B2 — Automated Smoke-Test Runner — shipped 2026-09-07
`.github/workflows/production-smoke.yml` already ran `smoke:public` + `smoke:stocks` on a
30-minute cron, but a failure only showed up as a red run in the Actions tab — nothing
proactive. Two changes:
- **Failure reporting.** Both jobs now open (or comment on) a tracking GitHub issue
  (label `production-smoke-failure`) on failure via `actions/github-script`, and close it
  automatically on the next passing run. No new secrets — uses the workflow's own
  `GITHUB_TOKEN` with an explicit `issues: write` permission. If issue creation ever 403s,
  check the repo's Settings → Actions → General → Workflow permissions default; the
  workflow-level `permissions:` block should be sufficient on its own, but a repository/org
  policy can still cap it.
- **`smoke:stock-arb` is now also scheduled**, not manual-only — but on its own `0 */4 * * *`
  cron (every 4 hours), not the 30-minute one. It was deliberately left off the original
  schedule (see `CLAUDE.md` 2026-09-05 entry) because it fires real LI.FI quotes per
  candidate row and is the least-tested piece of the whole stock-arb build. That reasoning
  still holds — this isn't reversing it, it's resolving the "someone has to remember to run
  this by hand" gap it left open, while keeping the call volume far below the cheap checks'
  cadence. A `workflow_dispatch` run still exercises both jobs immediately, same as before.

### B3 — Regression Watcher on Data Integrity — not started
- Given how much of this build has been about catching silent failures (dropped rows, symbol
  collisions, misleading labels), a lightweight agent that diffs key metrics between
  deploys — unmatched-row count, staleness rate, spread-candidate count — and flags sudden
  jumps, would catch the next silent regression before a user does.
- Same persistence gap as A1/A4: needs somewhere to store the previous run's numbers to diff
  against. Natural next step once B2's issue-based alerting has been observed for a while and
  there's a sense of what a "normal" run's numbers actually look like.

### B4 — Spec Generation Loop (later, not now) — not started, explicitly deferred
Once A1-A4 and B1-B3 are running and stable, the natural next step is an agent that reads
Track A's findings (new listings, competitor moves, data anomalies) and drafts the next build
spec itself, in the same format used in this session — for review, not auto-committed.
Explicitly sequenced last: this only works well once there's a track record of specs being
right, which is still being established (Phase 3b was the first phase where "get it right the
first time" was made explicit).

---

## Suggested Sequencing

1. **B2 (automated smoke tests)** — shipped 2026-09-07. Closes existing risk, cheapest to
   build, happens regardless of anything else.
2. **A4 (data health watcher)** — cheap threshold-based version riding on B2 shipped
   2026-09-07; real trend/spike detection still needs persisted history (not built).
3. **A1 (arb/spread watcher)** — highest strategic value, directly extends Phase 3b work
   already in flight. Blocked on a persistence + alerting-destination decision (see A1 above).
4. **A2 (new listing scout)** — extends Phase 1's admin pattern, moderate effort. Not started.
5. **A3 (landscape watcher)** — can start anytime, doesn't block on code changes; more a
   working habit than a build. Not started.
6. **B3 (regression watcher)** — after A1/A4 give a sense of what "normal" metric ranges look
   like. Not started.
7. **B4 (spec generation loop)** — later, once B1-B3/A1-A4 have a track record. Not started.

## Explicit Non-Goals (for now)
- No autonomous execution of trades or fund movement by any agent.
- No agent given write access to the address-keyed mapping without human approval.
- No user-facing agents yet (that's Track C, a separate future spec, not started here).
