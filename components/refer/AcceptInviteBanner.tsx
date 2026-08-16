'use client';

import { useState } from 'react';
import { useSignMessage } from 'wagmi';
import { REFERRAL_CONSENT_MESSAGE, clearStoredRefCode } from '@/lib/referrals';

type Status = 'idle' | 'signing' | 'saving' | 'done' | 'error';

/**
 * Shown to a referred user who's connected but not yet bound. Accepting is
 * opt-in (checkbox, unchecked) AND requires a wallet signature over the fixed
 * consent message — mirrors the questionnaire's consent+signature pattern.
 */
export function AcceptInviteBanner({
  refereeAddress,
  referrerCode,
  onBound,
}: {
  refereeAddress: `0x${string}`;
  referrerCode: `0x${string}`;
  onBound: () => void;
}) {
  const { signMessageAsync } = useSignMessage();
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const short = `${referrerCode.slice(0, 6)}…${referrerCode.slice(-4)}`;

  async function accept() {
    if (!consent) return;
    setError(null);
    setStatus('signing');
    try {
      const signature = await signMessageAsync({ message: REFERRAL_CONSENT_MESSAGE });
      setStatus('saving');
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refereeAddress, referrerAddress: referrerCode, signature }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not save referral');
      }
      clearStoredRefCode();
      setStatus('done');
      onBound();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not accept invite');
    }
  }

  return (
    <div className="border border-accent/40 bg-accent/5 rounded-lg p-4 mb-6">
      <div className="text-sm font-medium mb-1">You were invited to Defiant 🎉</div>
      <p className="text-xs text-ink/60 mb-3">
        Invited by <span className="font-mono">{short}</span>. Accept to join their crew and
        count toward their referral rank.
      </p>
      <label className="flex items-start gap-2 text-xs text-ink/60 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Record that this wallet joined via this referral link. Requires a free wallet
          signature — no transaction, no gas. Leave unchecked to skip.
        </span>
      </label>
      {error && <div className="text-xs text-danger mb-2 break-words">{error}</div>}
      <button
        onClick={accept}
        disabled={!consent || status === 'signing' || status === 'saving'}
        className="px-4 py-2 rounded-md bg-accent text-paper text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {status === 'signing'
          ? 'Waiting for signature…'
          : status === 'saving'
            ? 'Saving…'
            : 'Accept invite'}
      </button>
    </div>
  );
}
