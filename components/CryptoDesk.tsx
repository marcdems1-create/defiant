'use client';

import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import {
  STOCK_CHAIN_IDS,
  STOCK_CHAIN_LABELS,
  stockChainLabel,
  type StockChainId,
} from '@/lib/config/lifi';
import { formatTokenAmount } from '@/lib/format';
import { useCryptoCatalog } from '@/lib/hooks/useCryptoCatalog';
import { CRYPTO_TAPE_SIZE, type CryptoToken } from '@/lib/lifi/crypto';
import { NETWORK_MODE } from '@/lib/wagmi';
import { CryptoSwapModal } from './CryptoSwapModal';

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

function Pill({
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
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active ? 'bg-accent text-paper border-accent' : 'border-border text-ink/70 hover:border-ink/40'
      }`}
    >
      {children}
    </button>
  );
}

export function CryptoDesk() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, isError } = useCryptoCatalog();
  const tokens = useMemo(() => data ?? [], [data]);
  const mainnet = NETWORK_MODE === 'mainnet';

  const [query, setQuery] = useState('');
  const [chainId, setChainId] = useState<StockChainId | 'all'>('all');
  const [active, setActive] = useState<{ token: CryptoToken; side: 'buy' | 'sell' } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tokens.filter((t) => {
      if (chainId !== 'all' && t.chainId !== chainId) return false;
      if (!q) return true;
      return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    });
  }, [tokens, query, chainId]);

  const visible = useMemo(() => filtered.slice(0, CRYPTO_TAPE_SIZE), [filtered]);
  const erc20Visible = useMemo(() => visible.filter((t) => !t.native), [visible]);
  const nativeVisible = visible.find((t) => t.native);

  const balanceContracts = useMemo(
    () =>
      mainnet && address
        ? erc20Visible.map((t) => ({
            address: t.address,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [address] as const,
            chainId: t.chainId,
          }))
        : [],
    [mainnet, address, erc20Visible],
  );

  const balances = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: balanceContracts.length > 0 },
  });
  const nativeBal = useBalance({
    address,
    chainId: nativeVisible?.chainId,
    query: { enabled: Boolean(mainnet && address && nativeVisible) },
  });

  const holdings = useMemo(() => {
    if (!mainnet || !address) return [];
    const rows: { token: CryptoToken; balance: bigint; usd: number }[] = [];
    erc20Visible.forEach((t, i) => {
      const result = balances.data?.[i];
      if (!result || result.status !== 'success') return;
      const balance = result.result as bigint;
      if (balance <= 0n) return;
      const amount = Number(formatUnits(balance, t.decimals));
      if (!Number.isFinite(amount) || amount <= 0) return;
      rows.push({ token: t, balance, usd: amount * t.priceUsd });
    });
    if (nativeVisible && nativeBal.data && nativeBal.data.value > 0n) {
      const amount = Number(formatUnits(nativeBal.data.value, nativeVisible.decimals));
      if (Number.isFinite(amount) && amount > 0) {
        rows.push({
          token: nativeVisible,
          balance: nativeBal.data.value,
          usd: amount * nativeVisible.priceUsd,
        });
      }
    }
    return rows;
  }, [mainnet, address, erc20Visible, balances.data, nativeVisible, nativeBal.data]);

  const holdingUsd = holdings.reduce((sum, h) => sum + h.usd, 0);

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col gap-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          Spot crypto
        </p>
        <h2 className="text-lg font-medium">Live tape via LI.FI</h2>
        <p className="text-sm text-ink/50 mt-1 max-w-2xl leading-relaxed">
          Largest coins by CoinGecko market cap that LI.FI can route against USDC, sorted by 24h
          change. That order is live market data — not a recommendation, and nothing here is
          featured. Stables are omitted. Prices are LI.FI last marks; 24h % is CoinGecko. You sign
          every swap. Openhand never holds the tokens.
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

      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by ticker or name"
          className="w-full bg-transparent border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          <Pill active={chainId === 'all'} onClick={() => setChainId('all')}>
            All chains
          </Pill>
          {STOCK_CHAIN_IDS.map((id) => (
            <Pill key={id} active={chainId === id} onClick={() => setChainId(id)}>
              {STOCK_CHAIN_LABELS[id]}
            </Pill>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-ink/50 text-sm">Loading LI.FI catalog…</div>}
      {isError && (
        <div className="text-danger text-sm">Couldn&apos;t load spot crypto. Try again.</div>
      )}
      {!isLoading && !isError && tokens.length === 0 && (
        <div className="text-ink/50 text-sm">
          No parseable CoinGecko / LI.FI overlap right now. Nothing is guessed.
        </div>
      )}
      {!isLoading && !isError && tokens.length > 0 && filtered.length === 0 && (
        <div className="text-ink/50 text-sm">No rows match that search.</div>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/80">
          {visible.map((t) => (
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
                  {t.name} · {stockChainLabel(t.chainId)}
                </div>
              </div>
              <div className="text-right shrink-0 min-w-[5.5rem]">
                <div className="font-mono text-sm">{formatUsd(t.priceUsd)}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink/35">
                  Cap {formatMarketCap(t.marketCapUsd)}
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

      {visible.length > 0 && (
        <p className="text-xs text-ink/40">
          Sorted by 24h change among CoinGecko&apos;s largest coins LI.FI can route. Not a
          recommendation.
        </p>
      )}

      {!mainnet && (
        <p className="text-xs text-warn/90 border border-warn/20 bg-warn/5 rounded-lg px-4 py-3 leading-relaxed">
          Practice mode. The tape is live; buying or selling requires mainnet.
        </p>
      )}

      {active && (
        <CryptoSwapModal
          token={active.token}
          initialSide={active.side}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
}
