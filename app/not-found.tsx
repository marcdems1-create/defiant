import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-sm text-ink/70 leading-relaxed">
        <p className="text-ink font-medium mb-2">That page is not here.</p>
        <p className="mb-4">
          Try the{' '}
          <Link href="/" className="text-accent hover:underline">
            collection
          </Link>
          ,{' '}
          <Link href="/about" className="text-accent hover:underline">
            about
          </Link>
          ,{' '}
          <Link href="/terms" className="text-accent hover:underline">
            terms
          </Link>
          , or{' '}
          <Link href="/support" className="text-accent hover:underline">
            support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
