'use client';

export default function AdminError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-sm text-ink/70 leading-relaxed">
        <p className="text-ink font-medium mb-2">Admin could not load.</p>
        <p className="font-mono text-xs break-words text-danger">{error.message}</p>
      </div>
    </div>
  );
}
