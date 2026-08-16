'use client';

import { useEffect } from 'react';
import { NETWORK_MODE } from '@/lib/wagmi';
import { chainName } from '@/lib/format';
import { onrampAvailable, onramperWidgetSrc } from '@/lib/config/onramper';
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
  const src = onramperWidgetSrc(address, chainId);
  const live = onrampAvailable() && Boolean(src);

  useEffect(() => {
    track('onramp_open', { chainId });
  }, [chainId]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-paper border border-border rounded-2xl w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-medium">Add USDC</h2>
            <p className="text-xs text-ink/50 mt-1">
              Buys go to your wallet on {chainName(chainId)}. Openhand never holds the funds.
            </p>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {NETWORK_MODE === 'testnet' && (
          <p className="text-sm text-ink/65 leading-relaxed">
            This app is in practice mode. Card purchases send real USDC on mainnet, which this
            screen cannot use. Use a Base Sepolia USDC faucet, or switch the app to mainnet
            when you are ready for real funds.
          </p>
        )}

        {NETWORK_MODE === 'mainnet' && !live && (
          <p className="text-sm text-ink/65 leading-relaxed">
            Card purchase is not configured yet. Send USDC to this wallet on{' '}
            {chainName(chainId)}, then come back to deposit.
            <span className="block font-mono text-xs text-ink/45 mt-2 break-all">{address}</span>
          </p>
        )}

        {live && src && (
          <iframe
            src={src}
            title="Buy USDC"
            className="w-full h-[630px] rounded-xl border border-border bg-paper"
            allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
          />
        )}
      </div>
    </div>
  );
}
