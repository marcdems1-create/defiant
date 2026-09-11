'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TableStatus {
  name: string;
  exists: boolean;
}

interface Data {
  configured: boolean;
  connected?: boolean;
  latencyMs?: number;
  tables?: TableStatus[];
  counts?: Record<string, number>;
  allTablesPresent?: boolean;
  error?: string;
}

export default function AdminAgentDbPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/admin/agent-db-health');
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const json = (await res.json()) as Data;
      if (cancelled) return;
      if (!res.ok && json.configured) {
        // configured but connection/query failed — still show the error, not a generic one
        setData(json);
        return;
      }
      if (!res.ok) {
        setError(json.error || 'Could not load agent DB health');
        return;
      }
      setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          Internal
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Agent persistence DB</h1>
        <p className="text-sm text-ink/50 mt-2 max-w-xl leading-relaxed">
          Connectivity check for <code className="font-mono text-accent">AGENT_DB_URL</code> —
          the agent-infrastructure database (`spread_history` / `data_health_snapshot` /
          `alert_config`, see <code className="font-mono text-accent">INFRA_PERSISTENCE_SPEC.md</code>),
          deliberately separate from the analytics database behind the main{' '}
          <a href="/admin" className="text-accent hover:underline">Analytics</a> page. Nothing
          reads or writes this database yet — this page only confirms it&apos;s reachable and
          has the expected tables, ahead of wiring any real write path to it.
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!data && !error && <div className="text-sm text-ink/50">Checking…</div>}

      {data && !data.configured && (
        <div className="rounded-2xl border border-border bg-white/[0.02] p-6 text-sm text-ink/60 leading-relaxed">
          <code className="font-mono text-warn">AGENT_DB_URL</code> is not set. Provision the
          Postgres service on Railway, set this env var on Vercel (server-only, never{' '}
          <code className="font-mono">NEXT_PUBLIC_*</code>), run{' '}
          <code className="font-mono">migrations/003_agent_persistence.sql</code> against it by
          hand, and redeploy — then reload this page.
        </div>
      )}

      {data && data.configured && !data.connected && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 text-sm leading-relaxed">
          <div className="font-medium text-danger mb-1">Connection failed</div>
          <div className="text-ink/60">
            <code className="font-mono">AGENT_DB_URL</code> is set but the query failed:
          </div>
          <pre className="mt-2 text-xs font-mono text-ink/70 whitespace-pre-wrap">{data.error}</pre>
        </div>
      )}

      {data && data.connected && (
        <>
          <section className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
                Connection
              </div>
              <div className="text-2xl font-mono text-accent leading-tight">OK</div>
              <div className="text-xs text-ink/50 mt-1">{data.latencyMs}ms round trip</div>
            </div>
            <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
                Migration 003
              </div>
              <div className={`text-2xl font-mono leading-tight ${data.allTablesPresent ? 'text-accent' : 'text-warn'}`}>
                {data.allTablesPresent ? 'Applied' : 'Incomplete'}
              </div>
              <div className="text-xs text-ink/50 mt-1">
                {data.tables?.filter((t) => t.exists).length ?? 0} of {data.tables?.length ?? 0} tables present
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
            <h2 className="text-sm font-medium mb-4">Tables</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink/40">
                  <th className="pb-2 pr-4">Table</th>
                  <th className="pb-2 pr-4">Present</th>
                  <th className="pb-2">Row count</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {data.tables?.map((t) => (
                  <tr key={t.name} className="border-t border-border/60">
                    <td className="py-2 pr-4">{t.name}</td>
                    <td className={`py-2 pr-4 ${t.exists ? 'text-accent' : 'text-danger'}`}>
                      {t.exists ? 'yes' : 'missing'}
                    </td>
                    <td className="py-2">
                      {t.exists ? (data.counts?.[t.name] ?? 0) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
