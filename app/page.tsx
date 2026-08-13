'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { usePositions } from '@/lib/hooks/usePositions';
import { PositionCard } from '@/components/PositionCard';
import { ConnectButtonClient } from '@/components/ConnectButtonClient';

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { data: opportunities } = useOpportunities();
  const { positions, isLoading: positionsLoading } = usePositions(opportunities);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center text-center gap-6 py-20">
        <h1 className="text-3xl font-medium max-w-lg">
          Your own wallet. Your own keys. Real on-chain yield.
        </h1>
        <p className="text-ink/60 max-w-md text-sm leading-relaxed">
          Defiant never holds your funds. Connect your wallet, compare live yield across Aave,
          Lido, and Yearn, and deposit or withdraw with transactions you sign yourself.
        </p>
        <ConnectButtonClient />
        <Link href="/opportunities" className="text-sm text-accent hover:underline">
          Browse opportunities without connecting →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-medium mb-1">Portfolio</h1>
      <p className="text-ink/50 text-sm mb-6">
        Live balances read directly from-chain. Nothing here is cached server-side.
      </p>

      {positionsLoading && <div className="text-ink/50 text-sm">Loading positions…</div>}

      {!positionsLoading && positions.length === 0 && (
        <div className="border border-border rounded-lg p-6 text-center">
          <div className="text-ink/70 text-sm mb-3">No open positions yet.</div>
          <Link
            href="/opportunities"
            className="inline-block px-4 py-2 rounded-md bg-accent text-paper text-sm font-medium"
          >
            Browse opportunities
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {positions.map((p) => (
          <PositionCard key={p.opportunity.id} position={p} />
        ))}
      </div>
    </div>
  );
}
