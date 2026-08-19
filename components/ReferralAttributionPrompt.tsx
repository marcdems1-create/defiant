'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { getAddress } from 'viem';
import {
  buildReferralSignatureMessage,
  createReferralSignaturePayload,
  sanitizeReferralCode,
} from '@/lib/referral/shared';
import {
  capturePendingReferral,
  clearPendingReferral,
  readPendingReferral,
  type PendingReferral,
} from '@/lib/referral/storage';

type RegisterResponse = {
  ok?: boolean;
  configured?: boolean;
  status?: 'linked' | 'already_linked';
  error?: string;
};

export function ReferralAttributionPrompt() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [pending, setPending] = useState<PendingReferral | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPending(readPendingReferral());
  }, []);

  useEffect(() => {
    const refFromQuery = sanitizeReferralCode(searchParams.get('ref') ?? searchParams.get('referral'));
    if (refFromQuery && pathname) {
      try {
        setPending(capturePendingReferral(refFromQuery, pathname));
      } catch {
        // Ignore malformed query values.
      }
      return;
    }
    setPending(readPendingReferral());
  }, [pathname, searchParams]);

  const shortCode = useMemo(() => {
    if (!pending) return null;
    return pending.code.length > 16 ? `${pending.code.slice(0, 16)}…` : pending.code;
  }, [pending]);

  async function linkReferral() {
    if (!pending || !address) return;
    if (!consent) {
      setError('Please check consent before linking this referral code.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const normalizedAddress = getAddress(address);
      const payload = createReferralSignaturePayload(pending.code, normalizedAddress);
      const message = buildReferralSignatureMessage(payload);
      const signature = await signMessageAsync({ message });

      const res = await fetch('/api/referral/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: true,
          payload,
          signature,
          sourcePath: pathname ?? pending.sourcePath,
        }),
      });
      const json = (await res.json()) as RegisterResponse;
      if (!res.ok || !json.ok) {
        if (json.configured === false) {
          setError('Referral attribution is not configured yet.');
        } else {
          setError(json.error ?? 'Could not link referral right now.');
        }
        return;
      }

      if (json.status === 'already_linked') {
        setNotice('This wallet is already linked to a referral code.');
      } else {
        setNotice('Referral linked. Thanks for opting in.');
      }
      clearPendingReferral();
      setPending(null);
      setConsent(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sign referral consent.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isConnected || !address) return null;
  if (!pending && !notice) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 mt-4">
      <div className="rounded-2xl border border-border bg-white/[0.02] p-4 md:p-5 flex flex-col gap-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">Referral</p>

        {pending ? (
          <>
            <p className="text-sm text-ink/75 leading-relaxed">
              You landed with referral code <span className="font-mono text-ink">{shortCode}</span>.
              To link it to this wallet, consent and sign once. No funds move.
            </p>

            <label className="flex items-start gap-2 text-sm text-ink/75">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.currentTarget.checked)}
                className="mt-0.5"
              />
              <span>
                I consent to store this referral attribution for this wallet and confirm I control
                this address by signing a message.
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void linkReferral()}
                disabled={submitting}
                className="rounded-xl bg-accent text-paper text-sm font-medium px-4 py-2 disabled:opacity-60"
              >
                {submitting ? 'Linking…' : 'Link referral'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPendingReferral();
                  setPending(null);
                  setConsent(false);
                  setError(null);
                }}
                className="text-sm text-ink/55 hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-emerald-400">{notice}</p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </section>
  );
}
