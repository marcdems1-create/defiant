import { Pool } from 'pg';

/**
 * Server-only. Never import this from a 'use client' component — it will
 * pull the `pg` driver (and a real DB connection string) into the browser
 * bundle. Only import from Route Handlers (app/api/**\/route.ts).
 *
 * Lazy singleton so `DATABASE_URL` is only read/connected-to when a request
 * actually needs it, not at module-import time (same reasoning as
 * lib/wagmi.ts's getWagmiConfig() — see CLAUDE.md).
 */
let _pool: Pool | undefined;

export function getDb(): Pool {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Questionnaire response storage is disabled until it is — see README "Data collection".',
    );
  }

  _pool = new Pool({
    connectionString,
    // Neon/Supabase/Railway-hosted Postgres all require SSL and use certs
    // not in Node's default trust store; this is the standard escape hatch
    // for managed Postgres providers, not a blanket "skip verification."
    ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  });

  return _pool;
}
