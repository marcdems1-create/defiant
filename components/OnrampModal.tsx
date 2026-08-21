'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NETWORK_MODE } from '@/lib/wagmi';
import { chainName } from '@/lib/format';
import { track } from '@/lib/analytics/track';
import { TRANSAK_TERMS_URL, TRANSAK_TERMS_US_URL } from '@/lib/config/site';

export function OnrampModal({
  address,
  chainId,
  product = 'BUY',
  onClose,
}: {
  address: `0x${string}`;
  chainId: number;
  product?: 'BUY' | 'SELL';
  onClose: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [started, setStarted] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!started) return;
    track(product === 'SELL' ? 'offramp_open' : 'onramp_open', { chainId });
  }, [started, chainId, product]);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/onramp/widget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, chainId, product }),
        });
        const json = (await res.json()) as { url?: string; error?: string; staging?: boolean };
        if (cancelled) return;
        if (!res.ok || !json.url) {
          setError(json.error || (product === 'SELL' ? 'Could not open cash out' : 'Could not open buy USDC'));
          return;
        }
        setStaging(Boolean(json.staging));
        setSrc(json.url);
      } catch {
        if (!cancelled) setError(product === 'SELL' ? 'Could not open cash out' : 'Could not open buy USDC');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [started, address, chainId, product]);

  const notConfigured = error === 'Onramp is not configured';
  const buying = product !== 'SELL';

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 sm:p-4">
      <div className="bg-paper border border-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 max-h-[min(96dvh,100%)] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-medium">{buying ? 'Add USDC' : 'Cash out USDC'}</h2>
            <p className="text-xs text-ink/45 mt-1 leading-relaxed">
              Checkout is Transak, not Openhand. They {buying ? 'send USDC to' : 'receive USDC from'} this
              wallet.
            </p>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {!started && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink/65 leading-relaxed">
              Transak runs its own identity checks and is the merchant of record for CAD /
              Interac. Openhand never receives the funds.{' '}
              <Link href="/buy-usdc" className="text-accent hover:underline" onClick={onClose}>
                How this works
              </Link>
            </p>
            <label className="flex items-start gap-3 text-sm text-ink/75 leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-border bg-paper accent-accent"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                I have read and agree to Openhand&apos;s{' '}
                <Link href="/terms" className="text-accent hover:underline" target="_blank">
                  Terms of use
                </Link>{' '}
                and Transak&apos;s{' '}
                <a
                  href={TRANSAK_TERMS_URL}
                  className="text-accent hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
                {' '}
                (US:{' '}
                <a
                  href={TRANSAK_TERMS_US_URL}
                  className="text-accent hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  US terms
                </a>
                ). Unchecked by default.
              </span>
            </label>
            <button
              type="button"
              disabled={!accepted}
              onClick={() => setStarted(true)}
              className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2 hover:bg-accent/90 disabled:opacity-40 disabled:pointer-events-none"
            >
              Continue to Transak
            </button>
          </div>
        )}

        {started && staging && src && (
          <p className="text-xs text-ink/55 mb-3 leading-relaxed">
            Transak sandbox. Staging sends a test token (TRNSK), not the USDC this app deposits.
            Use Transak&apos;s sandbox card — not a real card.
          </p>
        )}
        {started && product === 'SELL' && src && !staging && (
          <p className="text-xs text-ink/55 mb-3 leading-relaxed">
            Checkout is Transak, not Openhand. They receive USDC from this wallet and pay out CAD.
          </p>
        )}

        {started && !src && !error && <p className="text-sm text-ink/50 py-8 text-center">Opening…</p>}

        {started && error && (
          <p className="text-sm text-ink/65 leading-relaxed">
            {notConfigured && NETWORK_MODE === 'testnet'
              ? 'Practice mode. Send test USDC to this wallet, or use a Base Sepolia faucet.'
              : notConfigured
                ? `Send USDC to this wallet on ${chainName(chainId)}.`
                : error}
            <span className="block font-mono text-xs text-ink/45 mt-2 break-all">{address}</span>
          </p>
        )}

        {started && src && (
          <iframe
            src={src}
            title={buying ? 'Buy USDC' : 'Cash out USDC'}
            className="w-full h-[min(630px,70dvh)] rounded-xl border border-border bg-paper"
            allow="clipboard-write; camera; microphone; payment"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>
  );
}
