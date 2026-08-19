'use client';

export function TransactionSentIndicator({
  status,
  hash,
}: {
  status: 'approving' | 'acting';
  hash: `0x${string}`;
}) {
  return (
    <div className="mb-3 rounded border border-accent/35 bg-accent/10 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="relative h-5 flex-1 overflow-hidden rounded">
          <div
            className="absolute left-0 right-0 top-1/2 border-t border-dashed"
            style={{ borderColor: 'rgba(62, 207, 142, 0.45)' }}
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute -top-0.5 left-0 h-5 w-5 text-accent animate-plane-fly"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M22 2 11 13" />
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
          </svg>
        </div>
        <span className="text-xs text-ink/75 whitespace-nowrap">
          {status === 'approving' ? 'Approval sent' : 'Transaction sent'}
        </span>
      </div>
      <div className="text-[11px] text-ink/55 mt-1">
        Waiting for chain confirmation · {hash.slice(0, 6)}…{hash.slice(-4)}
      </div>
    </div>
  );
}
