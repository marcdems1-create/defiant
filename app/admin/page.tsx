'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  configured: boolean;
  error?: string;
  totals?: {
    views24h: number;
    views7d: number;
    views30d: number;
    visitors7d: number;
    deposits7d: number;
    connects7d: number;
    questionnaire: number;
  };
  days?: { day: string; views: number; visitors: number }[];
  events?: { event: string; n: number }[];
  paths?: { path: string; n: number }[];
  cards?: { opportunityId: string; opens: number; dones: number }[];
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/[0.02] p-5 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">{label}</div>
      <div className="text-2xl font-mono text-accent leading-tight">{value}</div>
      {sub && <div className="text-xs text-ink/50 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const json = (await res.json()) as Stats;
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || 'Could not load stats');
        return;
      }
      setStats(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  if (!stats && !error) {
    return <div className="p-8 text-sm text-ink/50">Loading analytics…</div>;
  }

  const maxViews = Math.max(1, ...(stats?.days?.map((d) => d.views) ?? [1]));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
            Internal
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Analytics</h1>
          <p className="text-sm text-ink/50 mt-2 max-w-xl leading-relaxed">
            First-party counts only. No wallet addresses, IPs, or third-party pixels. Unique
            visitors are an approximate daily hash — not a profile.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-ink/50 hover:text-ink shrink-0"
        >
          Sign out
        </button>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {stats && !stats.configured && (
        <div className="rounded-2xl border border-border p-6 text-sm text-ink/60 leading-relaxed">
          Analytics is off until <code className="font-mono text-accent">DATABASE_URL</code> is
          set and <code className="font-mono text-accent">migrations/002_site_analytics.sql</code>{' '}
          has been run. Tracking does not run without the database.
        </div>
      )}

      {stats?.configured && stats.totals && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Views · 24h" value={String(stats.totals.views24h)} />
            <StatCard label="Views · 7d" value={String(stats.totals.views7d)} />
            <StatCard
              label="Visitors · 7d"
              value={String(stats.totals.visitors7d)}
              sub="Approximate unique hashes per day"
            />
            <StatCard label="Views · 30d" value={String(stats.totals.views30d)} />
            <StatCard label="Connect clicks · 7d" value={String(stats.totals.connects7d)} />
            <StatCard
              label="Deposits confirmed · 7d"
              value={String(stats.totals.deposits7d)}
              sub="Client reported tx confirmed"
            />
            <StatCard
              label="Questionnaire saves"
              value={String(stats.totals.questionnaire)}
              sub="Opt-in + signature only"
            />
          </section>

          <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
            <h2 className="text-sm font-medium mb-4">Page views · 30 days</h2>
            <div className="flex items-end gap-1 h-40">
              {(stats.days?.length ?? 0) === 0 && (
                <p className="text-sm text-ink/45">No events yet.</p>
              )}
              {stats.days?.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col justify-end items-center gap-1 h-full">
                  <div
                    className="w-full rounded-sm bg-accent/80 min-h-[2px]"
                    style={{ height: `${Math.round((d.views / maxViews) * 100)}%` }}
                    title={`${d.day.slice(0, 10)} · ${d.views} views · ${d.visitors} visitors`}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
              <h2 className="text-sm font-medium mb-4">Events · 30 days</h2>
              <ul className="flex flex-col gap-2 text-sm font-mono">
                {stats.events?.map((e) => (
                  <li key={e.event} className="flex justify-between">
                    <span className="text-ink/70">{e.event}</span>
                    <span>{e.n}</span>
                  </li>
                ))}
                {(stats.events?.length ?? 0) === 0 && <li className="text-ink/45">None yet.</li>}
              </ul>
            </section>
            <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
              <h2 className="text-sm font-medium mb-4">Paths · 30 days</h2>
              <ul className="flex flex-col gap-2 text-sm font-mono">
                {stats.paths?.map((p) => (
                  <li key={p.path} className="flex justify-between gap-4">
                    <span className="text-ink/70 truncate">{p.path}</span>
                    <span className="shrink-0">{p.n}</span>
                  </li>
                ))}
                {(stats.paths?.length ?? 0) === 0 && <li className="text-ink/45">None yet.</li>}
              </ul>
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
            <h2 className="text-sm font-medium mb-4">Cards · opens vs confirmed · 30 days</h2>
            <ul className="flex flex-col gap-2 text-sm font-mono">
              {stats.cards?.map((c) => (
                <li key={c.opportunityId} className="flex justify-between gap-4">
                  <span className="text-ink/70 truncate">{c.opportunityId}</span>
                  <span className="shrink-0 text-ink/50">
                    {c.opens} open · {c.dones} done
                  </span>
                </li>
              ))}
              {(stats.cards?.length ?? 0) === 0 && <li className="text-ink/45">None yet.</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
