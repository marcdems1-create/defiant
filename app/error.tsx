'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-sm text-ink/70 leading-relaxed">
        <p className="text-ink font-medium mb-2">Openhand could not load.</p>
        <p className="font-mono text-xs break-words text-danger mb-4">{error.message}</p>
        <p className="text-xs text-ink/50 mb-4 leading-relaxed">
          If this mentions an origin or Privy, add both{' '}
          <span className="font-mono">https://openhand.online</span> and{' '}
          <span className="font-mono">https://www.openhand.online</span> in the Privy
          dashboard allowed origins. Vercel currently sends visitors to www.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
