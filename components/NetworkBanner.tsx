import { NETWORK_MODE } from '@/lib/wagmi';

export function NetworkBanner() {
  if (NETWORK_MODE === 'testnet') {
    return (
      <div className="w-full bg-warn/10 border-b border-warn/30 text-warn text-[11px] md:text-sm text-center py-1 px-4">
        Practice mode — test networks only, not real dollars.
      </div>
    );
  }

  return (
    <div className="w-full bg-white/[0.04] border-b border-border text-ink/50 text-[11px] md:text-sm text-center py-1 px-4">
      Openhand is currently in beta. Use at your own risk.
    </div>
  );
}
