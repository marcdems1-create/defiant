'use client';

import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/config/site';

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
        <p className="text-ink font-medium mb-2">Openhand could not load this page.</p>
        <p className="text-sm text-ink/60 mb-4 leading-relaxed">
          The rest of the site — including{' '}
          <Link href="/about" className="text-accent hover:underline">
            About
          </Link>
          ,{' '}
          <Link href="/terms" className="text-accent hover:underline">
            Terms
          </Link>
          , and{' '}
          <Link href="/support" className="text-accent hover:underline">
            Support
          </Link>{' '}
          — does not need a wallet. Try again, or email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-mono">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2"
        >
          Try again
        </button>
        <details className="mt-4 text-xs text-ink/40">
          <summary className="cursor-pointer">Technical detail</summary>
          <p className="font-mono break-words text-ink/55 mt-2">{error.message}</p>
        </details>
      </div>
    </div>
  );
}
