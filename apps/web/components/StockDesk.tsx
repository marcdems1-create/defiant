'use client';

import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useReadContracts } from 'wagmi';
import { erc20Abi } from '@/lib/abi/erc20';
import {
  STOCK_CHAIN_IDS,
  STOCK_CHAIN_LABELS,
  stockChainLabel,
  type StockChainId,
} from '@/lib/config/lifi';
import { formatTokenAmount } from '@/lib/format';
import { useStockCatalog } from '@/lib/hooks/useStockCatalog';
import {
  STOCK_ISSUER_LABEL,
  STOCK_TAPE_SIZE,
  compareStockTape,
  preferOneChainPerSymbol,
  type StockIssuer,
  type StockToken,
} from '@/lib/lifi/stocks';
import { NETWORK_MODE } from '@/lib/wagmi';
import { StockSwapModal } from './StockSwapModal';

const PAGE_SIZE = STOCK_TAPE_SIZE;

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

export function StockDesk() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, isError } = useStockCatalog();
  const tokens = useMemo(() => data ?? [], [data]);
  const mainnet = NETWORK_MODE === 'mainnet';

  const [query, setQuery] = useState('');
  const [issuer, setIssuer] = useState<StockIssuer | 'all'>('all');
  const [chainId, setChainId] = useState<StockChainId | 'all'>('all');
  const [active, setActive] = useState<{ token: StockToken; side: 'buy' | 'sell' } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scoped = preferOneChainPerSymbol(tokens, chainId).filter((t) => {
      if (issuer !== 'all' && t.issuer !== issuer) return false;
      if (!q) return t.marketCapUsd !== undefined;
      return (
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        STOCK_ISSUER_LABEL[t.issuer].toLowerCase().includes(q)
      );
    });
    return [...scoped].sort(compareStockTape);
  }, [tokens, query, issuer, chainId]);

  const visible = useMemo(() => filtered.slice(0, PAGE_SIZE), [filtered]);

  const balanceContracts = useMemo(
    () =>
      mainnet && address
        ? visible.map((t) => ({
            address: t.address,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [address] as const,
            chainId: t.chainId,
          }))
        : [],
    [mainnet, address, visible],
  );

  const balances = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: balanceContracts.length > 0 },
  });

  const holdings = useMemo(() => {
    if (!mainnet || !address) return [];
    const rows: { token: StockToken; balance: bigint; usd: number }[] = [];
    visible.forEach((t, i) => {
      const result = balances.data?.[i];
      if (!result || result.status !== 'success') return;
      const balance = result.result as bigint;
      if (balance <= 0n) return;
      const amount = Number(formatUnits(balance, t.decimals));
      if (!Number.isFinite(amount) || amount <= 0) return;
      rows.push({ token: t, balance, usd: amount * t.priceUsd });
    });
    return rows;
  }, [mainnet, address, visible, balances.data]);

  const holdingUsd = holdings.reduce((sum, h) => sum + h.usd, 0);

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col gap-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          Tokenized stocks
        </p>
        <h2 className="text-lg font-medium">Live tape via LI.FI</h2>
        <p className="text-sm text-ink/50 mt-1 max-w-2xl leading-relaxed">
          Browse tokenized stocks and ETFs routed by LI.FI (xStocks, Ondo, Backed). This tape
          is not Transak, not a broker, and not the listed share. Transak is only used for
          USDC buy and cash out. The tape lists the top {STOCK_TAPE_SIZE} by CoinGecko token
          market cap — not the listed company&apos;s equity cap, not a recommendation. Prices
          are LI.FI last marks; 24h % is CoinGecko. A row is skipped when price or cap cannot
          be parsed. You sign every swap. Openhand never holds the tokens. Availability
          varies by issuer and jurisdiction.
        </p>
      </div>

      {isConnected && mainnet && holdings.length > 0 && (
        <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="text-sm font-medium">In this wallet</h3>
            <span className="text-xs font-mono text-accent">≈ {formatUsd(holdingUsd)}</span>
          </div>
          <p className="text-[11px] text-ink/45 mb-3">
            Approximate, using LI.FI last price on the rows currently in view. Search to check a
            holding that is not in the top {STOCK_TAPE_SIZE}.
          </p>
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
          <Pill active={issuer === 'all'} onClick={() => setIssuer('all')}>
            All issuers
          </Pill>
          {(['xstocks', 'ondo', 'backed'] as StockIssuer[]).map((id) => (
            <Pill key={id} active={issuer === id} onClick={() => setIssuer(id)}>
              {STOCK_ISSUER_LABEL[id]}
            </Pill>
          ))}
        </div>
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
        <div className="text-danger text-sm">Couldn&apos;t load tokenized stocks. Try again.</div>
      )}
      {!isLoading && !isError && tokens.length === 0 && (
        <div className="text-ink/50 text-sm">
          LI.FI did not return a parseable stock catalog right now. Nothing is guessed.
        </div>
      )}
      {!isLoading && !isError && tokens.length > 0 && filtered.length === 0 && (
        <div className="text-ink/50 text-sm">
          {query.trim()
            ? 'No rows match that search. Try another ticker.'
            : 'CoinGecko did not return parseable token market caps right now, so nothing is ranked. Search a ticker — we will not guess a cap.'}
        </div>
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
                  {t.name} · {STOCK_ISSUER_LABEL[t.issuer]} · {stockChainLabel(t.chainId)}
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

      {filtered.length > 0 && (
        <p className="text-xs text-ink/40">
          {query.trim()
            ? `Showing ${visible.length} of ${filtered.length} matches, market-cap first when a cap parsed.`
            : `Top ${visible.length} by CoinGecko token market cap. Search to find names outside this list. Not a recommendation.`}
        </p>
      )}

      {!mainnet && (
        <p className="text-xs text-warn/90 border border-warn/20 bg-warn/5 rounded-lg px-4 py-3 leading-relaxed">
          Practice mode. The tape is live from LI.FI; buying or selling tokenized stocks requires
          mainnet.
        </p>
      )}

      {active && (
        <StockSwapModal
          token={active.token}
          initialSide={active.side}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
}
