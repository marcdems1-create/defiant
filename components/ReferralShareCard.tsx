'use client';

import { useMemo, useState } from 'react';
import { referralCodeFromAddress } from '@/lib/referral/code';

export function ReferralShareCard({ address }: { address?: `0x${string}` }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (!address) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.openhand.online';
    const code = referralCodeFromAddress(address);
    return `${origin}/?ref=${code}`;
  }, [address]);

  async function copyShareLink() {
    if (!shareUrl) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not copy link';
      setError(message);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-4 md:p-5 flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">Invite</p>
      <h2 className="text-lg font-medium tracking-tight">Share your Openhand link</h2>
      <p className="text-sm text-ink/65 leading-relaxed">
        Invite friends to start from the same wallet → buy → deploy flow. Referral links are
        attribution-only in v1 and never move funds.
      </p>

      {!shareUrl ? (
        <p className="text-sm text-ink/55">
          Connect a wallet to generate your referral link.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-paper/60 px-3 py-2 text-xs font-mono break-all text-ink/75">
            {shareUrl}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void copyShareLink()}
              className="rounded-xl bg-accent text-paper text-sm font-medium px-4 py-2 hover:bg-accent/90 transition-colors"
            >
              {copied ? 'Copied' : 'Copy invite link'}
            </button>
            <span className="text-xs text-ink/45">No guaranteed cash rewards.</span>
          </div>
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
