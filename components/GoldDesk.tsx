'use client';

import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useReadContracts } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import { stockChainLabel } from '@/lib/config/lifi';
import { formatTokenAmount } from '@/lib/format';
import { useGoldCatalog } from '@/lib/hooks/useGoldCatalog';
import { GOLD_ISSUER_LABEL, type GoldToken } from '@/lib/lifi/gold';
import { NETWORK_MODE } from '@/lib/wagmi';
import { GoldSwapModal } from './GoldSwapModal';

function formatUsd(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarketCap(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatUsd(n);
}

function formatChangePct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function changeClass(n: number): string {
  if (n > 0) return 'text-accent';
  if (n < 0) return 'text-danger';
  return 'text-ink/45';
}

export function GoldDesk() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, isError } = useGoldCatalog();
  const tokens = useMemo(() => data ?? [], [data]);
  const mainnet = NETWORK_MODE === 'mainnet';
  const [active, setActive] = useState<{ token: GoldToken; side: 'buy' | 'sell' } | null>(null);

  const balanceContracts = useMemo(
    () =>
      mainnet && address
        ? tokens.map((t) => ({
            address: t.address,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [address] as const,
            chainId: t.chainId,
          }))
        : [],
    [mainnet, address, tokens],
  );

  const balances = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: balanceContracts.length > 0 },
  });

  const holdings = useMemo(() => {
    if (!mainnet || !address) return [];
    const rows: { token: GoldToken; balance: bigint; usd: number }[] = [];
    tokens.forEach((t, i) => {
      const result = balances.data?.[i];
      if (!result || result.status !== 'success') return;
      const balance = result.result as bigint;
      if (balance <= 0n) return;
      const amount = Number(formatUnits(balance, t.decimals));
      if (!Number.isFinite(amount) || amount <= 0) return;
      rows.push({ token: t, balance, usd: amount * t.priceUsd });
    });
    return rows;
  }, [mainnet, address, tokens, balances.data]);

  const holdingUsd = holdings.reduce((sum, h) => sum + h.usd, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          Tokenized gold
        </p>
        <h2 className="text-lg font-medium">PAXG and XAUt via LI.FI</h2>
        <p className="text-sm text-ink/50 mt-1 max-w-2xl leading-relaxed">
          Official one-ounce gold tokens on Ethereum — Paxos Gold and Tether Gold. Gold pays no
          coupon; the number that moves is the metal&apos;s price, up or down. Not yield, not a
          savings product, not a pick. A row is skipped when LI.FI has no parseable price. You
          sign every swap. Openhand never holds the tokens.
        </p>
      </div>

      {isConnected && mainnet && holdings.length > 0 && (
        <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="text-sm font-medium">In this wallet</h3>
            <span className="text-xs font-mono text-accent">≈ {formatUsd(holdingUsd)}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {holdings.map((h) => (
              <li key={h.token.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {h.token.symbol}
                  <span className="text-ink/40 text-xs ml-2">{stockChainLabel(h.token.chainId)}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs">
                    {formatTokenAmount(h.balance, h.token.decimals)} · {formatUsd(h.usd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActive({ token: h.token, side: 'sell' })}
                    className="text-xs text-accent hover:underline"
                  >
                    Sell
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && <div className="text-ink/50 text-sm">Loading LI.FI catalog…</div>}
      {isError && (
        <div className="text-danger text-sm">Couldn&apos;t load tokenized gold. Try again.</div>
      )}
      {!isLoading && !isError && tokens.length === 0 && (
        <div className="text-ink/50 text-sm">
          LI.FI did not return a parseable price for the official gold tokens right now. Nothing
          is guessed.
        </div>
      )}

      {tokens.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/80">
          {tokens.map((t) => (
            <li key={t.id} className="py-3 flex items-center gap-3">
              {t.logoURI ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.logoURI}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full bg-white/5 shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/5 text-[10px] font-mono flex items-center justify-center text-ink/50 shrink-0">
                  {t.symbol.slice(0, 3)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{t.symbol}</div>
                <div className="text-xs text-ink/45 truncate">
                  {t.name} · {GOLD_ISSUER_LABEL[t.issuer]} · {stockChainLabel(t.chainId)}
                </div>
              </div>
              <div className="text-right shrink-0 min-w-[5.5rem]">
                <div className="font-mono text-sm">{formatUsd(t.priceUsd)}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink/35">
                  {t.marketCapUsd !== undefined
                    ? `Cap ${formatMarketCap(t.marketCapUsd)}`
                    : 'LI.FI last'}
                </div>
              </div>
              <div className="text-right shrink-0 min-w-[4.25rem]">
                {t.changePct24h !== undefined ? (
                  <>
                    <div className={`font-mono text-sm ${changeClass(t.changePct24h)}`}>
                      {formatChangePct(t.changePct24h)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-ink/35">24h</div>
                  </>
                ) : (
                  <div className="font-mono text-sm text-ink/25">—</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActive({ token: t, side: 'buy' })}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-paper text-xs font-medium"
              >
                Buy
              </button>
            </li>
          ))}
        </ul>
      )}

      {tokens.length > 0 && (
        <p className="text-xs text-ink/40">
          Sorted by CoinGecko token market cap when a cap parsed. Not a recommendation. Gold
          price can fall.
        </p>
      )}

      {!mainnet && (
        <p className="text-xs text-warn/90 border border-warn/20 bg-warn/5 rounded-lg px-4 py-3 leading-relaxed">
          Practice mode. The tape is live from LI.FI; buying or selling gold requires mainnet.
        </p>
      )}

      {active && (
        <GoldSwapModal
          token={active.token}
          initialSide={active.side}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
