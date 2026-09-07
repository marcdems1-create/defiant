import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin/auth';
import { getAgentPool } from '@/lib/agentDb';

export const dynamic = 'force-dynamic';

const EXPECTED_TABLES = ['spread_history', 'data_health_snapshot', 'alert_config'] as const;

type TableRow = { to_regclass: string | null };
type CountRow = { n: string | number };

function num(value: string | number | undefined): number {
  return typeof value === 'number' ? value : parseInt(String(value ?? '0'), 10) || 0;
}

/**
 * Connectivity + schema check for the agent-persistence database
 * (INFRA_PERSISTENCE_SPEC.md, migrations/003_agent_persistence.sql). Separate from
 * /api/admin/stats, which is site_events/DATABASE_URL — this checks AGENT_DB_URL, a
 * deliberately different pool (see lib/agentDb.ts's header comment for why).
 *
 * This exists because the sandbox that built this feature has no way to open a raw
 * TCP connection to Postgres itself (its egress proxy explicitly does not support
 * raw-TCP databases) and no Railway credentials to provision one either — so this
 * endpoint is the only way to actually verify the database from outside a real
 * environment. Hit it after provisioning AGENT_DB_URL and running the migration.
 */
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const pool = getAgentPool();
  if (!pool) {
    return NextResponse.json({ configured: false });
  }

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;

    const tableChecks = await Promise.all(
      EXPECTED_TABLES.map((name) =>
        pool.query<TableRow>('SELECT to_regclass($1) AS to_regclass', [`public.${name}`]),
      ),
    );
    const tables = EXPECTED_TABLES.map((name, i) => ({
      name,
      exists: tableChecks[i].rows[0]?.to_regclass !== null,
    }));

    const existing = tables.filter((t) => t.exists).map((t) => t.name);
    const counts: Record<string, number> = {};
    if (existing.length > 0) {
      const countRows = await Promise.all(
        existing.map((name) => pool.query<CountRow>(`SELECT count(*) AS n FROM ${name}`)),
      );
      existing.forEach((name, i) => {
        counts[name] = num(countRows[i].rows[0]?.n);
      });
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      latencyMs,
      tables,
      counts,
      allTablesPresent: tables.every((t) => t.exists),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'query failed';
    return NextResponse.json({ configured: true, connected: false, error: message }, { status: 500 });
  }
}
