'use client';

import { useEffect, useState } from 'react';
import { NETWORK_MODE } from '@/lib/wagmi';
import { chainName } from '@/lib/format';
import { track } from '@/lib/analytics/track';

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
  const [src, setSrc] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track(product === 'SELL' ? 'offramp_open' : 'onramp_open', { chainId });
  }, [chainId, product]);

  useEffect(() => {
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
  }, [address, chainId, product]);

  const notConfigured = error === 'Onramp is not configured';

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 sm:p-4">
      <div className="bg-paper border border-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 max-h-[min(96dvh,100%)] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-medium">{product === 'SELL' ? 'Cash out USDC' : 'Add USDC'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {staging && src && (
          <p className="text-xs text-ink/55 mb-3 leading-relaxed">
            Transak sandbox. Staging sends a test token (TRNSK), not the USDC this app deposits.
            Use Transak&apos;s sandbox card — not a real card.
          </p>
        )}
        {product === 'SELL' && src && !staging && (
          <p className="text-xs text-ink/55 mb-3 leading-relaxed">
            Checkout is Transak, not Openhand. They receive USDC from this wallet and pay out CAD.
          </p>
        )}

        {!src && !error && <p className="text-sm text-ink/50 py-8 text-center">Opening…</p>}

        {error && (
          <p className="text-sm text-ink/65 leading-relaxed">
            {notConfigured && NETWORK_MODE === 'testnet'
              ? 'Practice mode. Send test USDC to this wallet, or use a Base Sepolia faucet.'
              : notConfigured
                ? `Send USDC to this wallet on ${chainName(chainId)}.`
                : error}
            <span className="block font-mono text-xs text-ink/45 mt-2 break-all">{address}</span>
          </p>
        )}

        {src && (
          <iframe
            src={src}
            title={product === 'SELL' ? 'Cash out USDC' : 'Buy USDC'}
            className="w-full h-[min(630px,70dvh)] rounded-xl border border-border bg-paper"
            allow="clipboard-write; camera; microphone; payment"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>
  );
}
