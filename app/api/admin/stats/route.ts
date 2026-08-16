import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin/auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

type CountRow = { n: string | number };
type DayRow = { day: Date | string; views: string | number; visitors: string | number };
type EventRow = { event: string; n: string | number };
type PathRow = { path: string; n: string | number };
type CardRow = { opportunity_id: string; opens: string | number; dones: string | number };

function num(value: string | number | undefined): number {
  return typeof value === 'number' ? value : parseInt(String(value ?? '0'), 10) || 0;
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ configured: false });
  }

  try {
    const [days, events, paths, cards, questionnaire, views24h, views7d, views30d, visitors7d, deposits7d, connects7d] =
      await Promise.all([
        pool.query<DayRow>(
          `SELECT date_trunc('day', occurred_at) AS day,
                  count(*) FILTER (WHERE event = 'page_view') AS views,
                  count(DISTINCT visitor_hash) AS visitors
           FROM site_events
           WHERE occurred_at > now() - interval '30 days'
           GROUP BY 1
           ORDER BY 1`,
        ),
        pool.query<EventRow>(
          `SELECT event, count(*)::int AS n
           FROM site_events
           WHERE occurred_at > now() - interval '30 days'
           GROUP BY event
           ORDER BY n DESC`,
        ),
        pool.query<PathRow>(
          `SELECT path, count(*)::int AS n
           FROM site_events
           WHERE event = 'page_view' AND path IS NOT NULL AND occurred_at > now() - interval '30 days'
           GROUP BY path
           ORDER BY n DESC
           LIMIT 12`,
        ),
        pool.query<CardRow>(
          `SELECT opportunity_id,
                  count(*) FILTER (WHERE event = 'deposit_open')::int AS opens,
                  count(*) FILTER (WHERE event IN ('deposit_done', 'withdraw_done'))::int AS dones
           FROM site_events
           WHERE opportunity_id IS NOT NULL AND occurred_at > now() - interval '30 days'
           GROUP BY opportunity_id
           ORDER BY opens DESC
           LIMIT 12`,
        ),
        pool
          .query<CountRow>(`SELECT count(*) AS n FROM questionnaire_responses`)
          .catch((): { rows: CountRow[] } => ({ rows: [{ n: 0 }] })),
        pool.query<CountRow>(
          `SELECT count(*) AS n FROM site_events WHERE event = 'page_view' AND occurred_at > now() - interval '1 day'`,
        ),
        pool.query<CountRow>(
          `SELECT count(*) AS n FROM site_events WHERE event = 'page_view' AND occurred_at > now() - interval '7 days'`,
        ),
        pool.query<CountRow>(
          `SELECT count(*) AS n FROM site_events WHERE event = 'page_view' AND occurred_at > now() - interval '30 days'`,
        ),
        pool.query<CountRow>(
          `SELECT count(DISTINCT visitor_hash) AS n FROM site_events WHERE occurred_at > now() - interval '7 days' AND visitor_hash IS NOT NULL`,
        ),
        pool.query<CountRow>(
          `SELECT count(*) AS n FROM site_events WHERE event = 'deposit_done' AND occurred_at > now() - interval '7 days'`,
        ),
        pool.query<CountRow>(
          `SELECT count(*) AS n FROM site_events WHERE event = 'connect_open' AND occurred_at > now() - interval '7 days'`,
        ),
      ]);

    return NextResponse.json({
      configured: true,
      totals: {
        views24h: num(views24h.rows[0]?.n),
        views7d: num(views7d.rows[0]?.n),
        views30d: num(views30d.rows[0]?.n),
        visitors7d: num(visitors7d.rows[0]?.n),
        deposits7d: num(deposits7d.rows[0]?.n),
        connects7d: num(connects7d.rows[0]?.n),
        questionnaire: num(questionnaire.rows[0]?.n),
      },
      days: days.rows.map((row) => ({
        day: typeof row.day === 'string' ? row.day : row.day.toISOString(),
        views: num(row.views),
        visitors: num(row.visitors),
      })),
      events: events.rows.map((row) => ({ event: row.event, n: num(row.n) })),
      paths: paths.rows.map((row) => ({ path: row.path, n: num(row.n) })),
      cards: cards.rows.map((row) => ({
        opportunityId: row.opportunity_id,
        opens: num(row.opens),
        dones: num(row.dones),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'query failed';
    return NextResponse.json({ configured: false, error: message }, { status: 500 });
  }
}
