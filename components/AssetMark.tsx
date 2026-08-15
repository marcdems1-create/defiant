import { assetMark } from '@/lib/format';

export function AssetMark({
  symbol,
  size = 'card',
}: {
  symbol: string;
  size?: 'card' | 'hero';
}) {
  const { mark } = assetMark(symbol);
  const sizeClass = size === 'hero' ? 'text-[120px] sm:text-[140px]' : 'text-[92px]';

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden
    >
      <span
        className={`absolute -right-1 bottom-10 font-semibold leading-none tracking-tight text-ink/[0.11] ${sizeClass}`}
      >
        {mark}
      </span>
    </div>
  );
}
