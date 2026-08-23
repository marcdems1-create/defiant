'use client';

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { id: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex p-0.5 rounded-xl bg-white/[0.06] border border-border"
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`flex-1 min-h-9 rounded-[10px] text-sm font-medium touch-manipulation transition-colors ${
              active ? 'bg-white/12 text-ink' : 'text-ink/45'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SheetHandle() {
  return (
    <div className="flex justify-center sm:hidden -mt-1 mb-3" aria-hidden>
      <div className="h-1 w-10 rounded-full bg-ink/25" />
    </div>
  );
}

export function SheetFrame({
  onClose,
  children,
  wide,
  zClass = 'z-[200]',
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  zClass?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-end sm:items-center justify-center bg-black/60 sm:px-4`}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} bg-paper border border-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[min(92dvh,100%)] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
        onClick={(event) => event.stopPropagation()}
      >
        <SheetHandle />
        {children}
      </div>
    </div>
  );
}

export function ScreenTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-[28px] md:text-3xl font-semibold tracking-tight leading-none">{children}</h1>
      {subtitle ? (
        <p className="text-xs md:text-sm text-ink/45 leading-relaxed">{subtitle}</p>
      ) : null}
    </header>
  );
}

export function IconCollection({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconMove({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 8h13.5M14 4.5 18.5 8 14 11.5M20 16H6.5M10 12.5 5.5 16 10 19.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDashboard({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 16.5 9.2 11l3.4 3.3L20 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 7h5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
