'use client';

import { useEffect, useState } from 'react';
import { NETWORK_MODE } from '@/lib/wagmi';
import { chainName } from '@/lib/format';
import { track } from '@/lib/analytics/track';

export function OnrampModal({
  address,
  chainId,
  onClose,
}: {
  address: `0x${string}`;
  chainId: number;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('onramp_open', { chainId });
  }, [chainId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/onramp/widget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, chainId }),
        });
        const json = (await res.json()) as { url?: string; error?: string; staging?: boolean };
        if (cancelled) return;
        if (!res.ok || !json.url) {
          setError(json.error || 'Could not open buy USDC');
          return;
        }
        setStaging(Boolean(json.staging));
        setSrc(json.url);
      } catch {
        if (!cancelled) setError('Could not open buy USDC');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, chainId]);

  const notConfigured = error === 'Onramp is not configured';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-paper border border-border rounded-2xl w-full max-w-lg p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-medium">Add USDC</h2>
            <p className="text-xs text-ink/50 mt-1">
              In Canada, Interac e-Transfer is the usual way. USDC goes to your wallet on{' '}
              {chainName(chainId)}. Openhand never holds the funds. Transak handles the buy and
              KYC.
            </p>
          </div>
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

        {!src && !error && <p className="text-sm text-ink/50 py-8 text-center">Opening Transak…</p>}

        {error && (
          <p className="text-sm text-ink/65 leading-relaxed">
            {notConfigured && NETWORK_MODE === 'testnet'
              ? 'This app is in practice mode. Set TRANSAK_STAGING with staging keys to try the Transak sandbox, or use a Base Sepolia USDC faucet.'
              : notConfigured
                ? `Interac / card purchase is not configured yet. Send USDC to this wallet on ${chainName(chainId)}, then come back to deposit.`
                : error}
            <span className="block font-mono text-xs text-ink/45 mt-2 break-all">{address}</span>
          </p>
        )}

        {src && (
          <iframe
            src={src}
            title="Buy USDC"
            className="w-full h-[630px] rounded-xl border border-border bg-paper"
            allow="clipboard-write; camera; microphone; payment"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>
  );
}
