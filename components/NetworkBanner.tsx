import { NETWORK_MODE } from '@/lib/wagmi';

export function NetworkBanner() {
  if (NETWORK_MODE === 'testnet') {
    return (
      <div className="w-full bg-warn/10 border-b border-warn/30 text-warn text-sm text-center py-1.5 px-4">
        Practice mode — test networks only, not real dollars.
      </div>
    );
  }

  return (
    <div className="w-full bg-danger/10 border-b border-danger/30 text-danger text-sm text-center py-1.5 px-4">
      Mainnet mode — transactions move real funds.
    </div>
  );
}
