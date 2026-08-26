'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [copied, setCopied] = useState(false);
  const buying = product !== 'SELL';
  const network = chainName(chainId);

  useEffect(() => {
    track(product === 'SELL' ? 'offramp_open' : 'onramp_open', { chainId });
  }, [chainId, product]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 sm:p-4">
      <div className="bg-paper border border-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 max-h-[min(96dvh,100%)] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-medium">{buying ? 'Add USDC' : 'Cash out'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {buying ? (
          <div className="flex flex-col gap-4 text-sm text-ink/70 leading-relaxed">
            <p>
              {NETWORK_MODE === 'testnet'
                ? 'Practice mode. Send test USDC to this wallet, or use a Base Sepolia faucet.'
                : `Openhand does not sell USDC. Send USDC to this wallet on ${network}, then deposit.`}
            </p>
            {NETWORK_MODE === 'mainnet' && (
              <p>
                Buy USDC wherever you already can, then withdraw it here. Use the {network}{' '}
                network — the wrong chain will not show up in this app.{' '}
                <Link href="/buy-usdc" className="text-accent hover:underline" onClick={onClose}>
                  How this works
                </Link>
              </p>
            )}
            <div className="rounded-xl border border-border bg-white/[0.02] p-3 flex flex-col gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink/40 font-mono">
                {network} address
              </p>
              <p className="font-mono text-xs text-ink/80 break-all">{address}</p>
              <button
                type="button"
                onClick={() => void copyAddress()}
                className="self-start rounded-lg border border-border text-sm px-3 py-1.5 hover:border-ink/40"
              >
                {copied ? 'Copied' : 'Copy address'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink/70 leading-relaxed">
            In-app cash out is not available. Send USDC from this wallet to an account you
            already use to sell crypto. Openhand never holds it.
            <span className="block font-mono text-xs text-ink/45 mt-2 break-all">{address}</span>
          </p>
        )}
      </div>
    </div>
  );
}
