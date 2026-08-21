import Link from 'next/link';

export default function OpportunityNotFound() {
  return (
    <div className="max-w-md">
      <h1 className="text-xl font-medium mb-2">Card not found</h1>
      <p className="text-sm text-ink/55 mb-4">
        This yield card may have rotated off the live list, or the link is outdated.
      </p>
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Browse the collection
      </Link>
    </div>
  );
}
