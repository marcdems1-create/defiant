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
          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-accent/40" />
          <svg
            viewBox="0 0 24 24"
            className="plane-fly absolute -top-0.5 left-0 h-5 w-5 text-accent"
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
      <style jsx>{`
        .plane-fly {
          animation: plane-fly 1.2s ease-in-out infinite;
        }

        @keyframes plane-fly {
          0% {
            transform: translateX(0) translateY(1px) rotate(-9deg);
            opacity: 0.85;
          }
          50% {
            transform: translateX(160px) translateY(-3px) rotate(2deg);
            opacity: 1;
          }
          100% {
            transform: translateX(320px) translateY(1px) rotate(8deg);
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}
