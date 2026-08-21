'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0e11] text-[#f2f4f7] flex items-center justify-center px-6">
        <div className="max-w-md text-sm leading-relaxed">
          <p className="font-medium mb-2">Openhand could not load.</p>
          <p className="text-white/60 mb-4">
            Try again, or email{' '}
            <a href="mailto:hello@openhand.online" className="underline">
              hello@openhand.online
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-[#3dd68c] text-[#0b0e11] font-medium text-sm px-4 py-2"
          >
            Try again
          </button>
          <p className="font-mono text-xs break-words text-white/40 mt-4">{error.message}</p>
        </div>
      </body>
    </html>
  );
}
