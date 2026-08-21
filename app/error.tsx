'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/config/site';
import {
  CHUNK_RELOAD_KEY,
  isChunkLoadError,
  reloadOnceForStaleChunk,
} from '@/lib/chunkLoadError';

export default function AppError({
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

  const handleRetry = () => {
    if (chunkError && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    reset();
  };

  if (chunkError && !reloadAlreadyTried) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-ink/60">Refreshing…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-sm text-ink/70 leading-relaxed">
        <p className="text-ink font-medium mb-2">This page could not load.</p>
        <p className="text-sm text-ink/60 mb-4 leading-relaxed">
          Company and legal pages do not need a wallet:{' '}
          <Link href="/about" className="text-accent hover:underline">
            About
          </Link>
          ,{' '}
          <Link href="/terms" className="text-accent hover:underline">
            Terms
          </Link>
          ,{' '}
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy
          </Link>
          ,{' '}
          <Link href="/refunds" className="text-accent hover:underline">
            Refunds
          </Link>
          ,{' '}
          <Link href="/contact" className="text-accent hover:underline">
            Contact
          </Link>
          . Or email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-mono">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2"
        >
          {chunkError ? 'Hard reload' : 'Try again'}
        </button>
        <details className="mt-4 text-xs text-ink/40">
          <summary className="cursor-pointer">Technical detail</summary>
          <p className="font-mono break-words text-ink/55 mt-2">{error.message}</p>
        </details>
      </div>
    </div>
  );
}
