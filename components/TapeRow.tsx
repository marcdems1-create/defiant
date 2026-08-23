'use client';

import {
  formatTapeChangePct,
  formatTapeMarketCap,
  formatTapePrice,
  tapeChangeClass,
} from '@/lib/format';

export function TapePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 min-h-9 px-3.5 rounded-full text-sm border touch-manipulation transition-colors ${
        active ? 'bg-accent text-paper border-accent' : 'border-border text-ink/70 hover:border-ink/40'
      }`}
    >
      {children}
    </button>
  );
}

export function TapeFilterRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}

export const tapeSearchClassName =
  'w-full min-h-11 bg-white/[0.04] border border-border rounded-xl px-3.5 text-sm outline-none focus:border-accent placeholder:text-ink/35';

export function TapeRow({
  logoURI,
  symbol,
  name,
  detail,
  priceUsd,
  marketCapUsd,
  marketCapLabel,
  changePct24h,
  onOpen,
}: {
  logoURI?: string | null;
  symbol: string;
  name: string;
  detail: string;
  priceUsd: number;
  marketCapUsd?: number;
  marketCapLabel?: string;
  changePct24h?: number;
  onOpen: () => void;
}) {
  const price = formatTapePrice(priceUsd);
  const formattedCap =
    marketCapUsd !== undefined ? formatTapeMarketCap(marketCapUsd) : '';
  const capBit = formattedCap || marketCapLabel;
  const initials = symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || '?';
  const subtitle = [name, detail, capBit].filter(Boolean).join(' · ');

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full px-4 md:px-0 py-3.5 flex items-center gap-3 text-left touch-manipulation active:bg-white/[0.04]"
      >
        {logoURI ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoURI}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full bg-white/5 shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-white/5 text-[11px] font-mono flex items-center justify-center text-ink/50 shrink-0">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="font-medium text-[15px] leading-tight whitespace-nowrap">{symbol}</div>
          <div className="text-xs text-ink/45 truncate mt-0.5">{subtitle}</div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-[15px] tabular-nums leading-tight">{price ?? '—'}</div>
          {changePct24h !== undefined ? (
            <div className={`font-mono text-xs tabular-nums mt-0.5 ${tapeChangeClass(changePct24h)}`}>
              {formatTapeChangePct(changePct24h)}
            </div>
          ) : (
            <div className="font-mono text-xs text-ink/25 mt-0.5">—</div>
          )}
        </div>
      </button>
    </li>
  );
}
