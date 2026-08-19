import Link from 'next/link';

export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-2xl mx-auto flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-accent transition-colors w-fit"
      >
        <span aria-hidden>←</span> Back to collection
      </Link>
      <header className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono">Legal</p>
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        <p className="text-xs text-ink/40">Last updated {updated}</p>
      </header>
      <div className="flex flex-col gap-5 text-sm text-ink/70 leading-relaxed">{children}</div>
    </article>
  );
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-medium text-ink mt-2">{children}</h2>;
}
