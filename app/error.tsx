'use client';

import { useEffect } from 'react';

const CHUNK_LOAD_ERROR_RE =
  /chunkloaderror|loading (css )?chunk \d+ failed|failed to fetch dynamically imported module/i;
const CHUNK_RELOAD_KEY = 'oh.chunk-reload-attempted';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkLoadError = CHUNK_LOAD_ERROR_RE.test(error.message);

  useEffect(() => {
    if (!isChunkLoadError) return;
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;

    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  }, [isChunkLoadError]);

  const handleRetry = () => {
    if (isChunkLoadError && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-sm text-ink/70 leading-relaxed">
        <p className="text-ink font-medium mb-2">Openhand could not load.</p>
        <p className="font-mono text-xs break-words text-danger mb-4">{error.message}</p>
        {isChunkLoadError ? (
          <p className="text-xs text-ink/50 mb-4 leading-relaxed">
            A stale deployment asset was requested. Openhand is attempting a one-time hard
            reload to recover.
          </p>
        ) : null}
        <p className="text-xs text-ink/50 mb-4 leading-relaxed">
          If this mentions an origin or Privy, add both{' '}
          <span className="font-mono">https://openhand.online</span> and{' '}
          <span className="font-mono">https://www.openhand.online</span> in the Privy
          dashboard allowed origins. Vercel currently sends visitors to www.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2"
        >
          {isChunkLoadError ? 'Hard reload' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
