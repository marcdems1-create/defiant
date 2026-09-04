'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || 'Could not sign in');
        return;
      }
      router.replace('/admin');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col gap-4"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
            Internal
          </p>
          <h1 className="text-2xl font-medium">Admin</h1>
          <p className="text-sm text-ink/50 mt-2">
            Site analytics only. Not linked from the public nav.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink/60">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded-lg border border-border bg-transparent px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="rounded-xl bg-accent text-paper font-medium text-sm py-2.5 disabled:opacity-40"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
