'use client';

import { useEffect, useState } from 'react';
import { CONTACT_EMAIL } from '@/lib/config/site';
import {
  CHUNK_RELOAD_KEY,
  isChunkLoadError,
  reloadOnceForStaleChunk,
} from '@/lib/chunkLoadError';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error.message);
  const [reloadAlreadyTried] = useState(() => {
    if (typeof window === 'undefined') return false;
    return chunkError && window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
  });

  useEffect(() => {
    if (chunkError && !reloadAlreadyTried) reloadOnceForStaleChunk();
  }, [chunkError, reloadAlreadyTried]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0e11] text-[#f2f4f7] flex items-center justify-center px-6">
        {chunkError && !reloadAlreadyTried ? (
          <p className="text-sm text-white/60">Refreshing…</p>
        ) : (
          <div className="max-w-md text-sm leading-relaxed">
            <p className="font-medium mb-2">This page could not load.</p>
            <p className="text-white/60 mb-4">
              Legal pages:{' '}
              <a href="/terms" className="underline">
                Terms
              </a>
              ,{' '}
              <a href="/privacy" className="underline">
                Privacy
              </a>
              ,{' '}
              <a href="/contact" className="underline">
                Contact
              </a>
              . Or email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() => (chunkError ? window.location.reload() : reset())}
              className="rounded-xl bg-[#3dd68c] text-[#0b0e11] font-medium text-sm px-4 py-2"
            >
              {chunkError ? 'Hard reload' : 'Try again'}
            </button>
          </div>
        )}
      </body>
    </html>
  );
}
