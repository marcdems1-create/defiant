import { Pool } from 'pg';

// Lazy singleton — never import this file from a client component, same rule as lib/db.ts.
//
// Deliberately a SEPARATE pool/env var from lib/db.ts's DATABASE_URL. That pool backs
// site_events, an anonymous-analytics store with its own privacy scope (non-negotiable #9);
// this one backs agent-infrastructure tables (spread_history, data_health_snapshot,
// alert_config — migrations/003_agent_persistence.sql) that have nothing to do with visitor
// analytics. Decided 2026-09-07 (INFRA_PERSISTENCE_SPEC.md): same Railway project as
// HYPERFLEX, but its own Postgres service/instance — the HYPERFLEX incident this spec cites
// was three sites sharing one Postgres instance and exhausting its connection pool, so this
// stays its own instance with its own env var, not a schema reachable through DATABASE_URL.

let pool: Pool | undefined;

export function getAgentPool(): Pool | undefined {
  const url = process.env.AGENT_DB_URL;
  if (!url) return undefined;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 4 });
  }
  return pool;
}

export function agentPersistenceEnabled(): boolean {
  return Boolean(process.env.AGENT_DB_URL);
}
