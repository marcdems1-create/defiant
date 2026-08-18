import { Pool } from 'pg';

// Lazy singleton — never import this file from a client component. `pg` is
// Node-only; a client import would fail the Next build the same way an
// eager RainbowKit config does.

let pool: Pool | undefined;

export function getPool(): Pool | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 4 });
  }
  return pool;
}

export function analyticsEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
