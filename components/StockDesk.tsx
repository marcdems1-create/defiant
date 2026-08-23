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
import { formatTokenAmount, formatUsd } from '@/lib/format';
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
import { TapeFilterRow, TapePill, TapeRow, tapeSearchClassName } from './TapeRow';

const PAGE_SIZE = STOCK_TAPE_SIZE;

export function StockDesk() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, isError } = useStockCatalog();
  const tokens = useMemo(() => data ?? [], [data]);
  const mainnet = NETWORK_MODE === 'mainnet';

  const [query, setQuery] = useState('');
  const [issuer, setIssuer] = useState<StockIssuer | 'all'>('all');
  const [chainId, setChainId] = useState<StockChainId | 'all'>('all');
  const [about, setAbout] = useState(false);
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
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-ink/45 leading-relaxed">
          LI.FI last marks · CoinGecko 24h. Not a broker. Tap a row to trade.
        </p>
        <button
          type="button"
          onClick={() => setAbout((v) => !v)}
          className="shrink-0 text-xs text-accent touch-manipulation"
          aria-expanded={about}
        >
          {about ? 'Hide' : 'About'}
        </button>
      </div>
      {about && (
        <p className="text-xs text-ink/50 leading-relaxed">
          Tokenized stocks and ETFs routed by LI.FI (xStocks, Ondo, Backed). This tape is not
          Transak, not a broker, and not the listed share. Transak is only used for USDC buy
          and cash out. Top {STOCK_TAPE_SIZE} by CoinGecko token market cap — not the listed
          company&apos;s equity cap, not a recommendation. A row is skipped when price or cap
          cannot be parsed. You sign every swap. Openhand never holds the tokens. Availability
          varies by issuer and jurisdiction.
        </p>
      )}

      {isConnected && mainnet && holdings.length > 0 && (
        <div className="rounded-xl bg-accent/5 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
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
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs tabular-nums">
                    {formatTokenAmount(h.balance, h.token.decimals)} · {formatUsd(h.usd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActive({ token: h.token, side: 'sell' })}
                    className="min-h-9 px-2 text-sm text-accent touch-manipulation"
                  >
                    Sell
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sticky top-[4.75rem] z-20 -mx-4 px-4 py-2 bg-paper/95 backdrop-blur-md md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none flex flex-col gap-2.5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or name"
          className={tapeSearchClassName}
        />
        <TapeFilterRow>
          <TapePill active={issuer === 'all'} onClick={() => setIssuer('all')}>
            All issuers
          </TapePill>
          {(['xstocks', 'ondo', 'backed'] as StockIssuer[]).map((id) => (
            <TapePill key={id} active={issuer === id} onClick={() => setIssuer(id)}>
              {STOCK_ISSUER_LABEL[id]}
            </TapePill>
          ))}
          <TapePill active={chainId === 'all'} onClick={() => setChainId('all')}>
            All
          </TapePill>
          {STOCK_CHAIN_IDS.map((id) => (
            <TapePill key={id} active={chainId === id} onClick={() => setChainId(id)}>
              {STOCK_CHAIN_LABELS[id]}
            </TapePill>
          ))}
        </TapeFilterRow>
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
        <ul className="-mx-4 md:mx-0 flex flex-col divide-y divide-border/80">
          {visible.map((t) => (
            <TapeRow
              key={t.id}
              logoURI={t.logoURI}
              symbol={t.symbol}
              name={t.name}
              detail={`${STOCK_ISSUER_LABEL[t.issuer]} · ${stockChainLabel(t.chainId)}`}
              priceUsd={t.priceUsd}
              marketCapUsd={t.marketCapUsd}
              marketCapLabel={t.marketCapUsd === undefined ? 'LI.FI last' : undefined}
              changePct24h={t.changePct24h}
              onOpen={() => setActive({ token: t, side: 'buy' })}
            />
          ))}
        </ul>
      )}

      {!mainnet && (
        <p className="text-xs text-warn/90">Practice mode. Buying or selling needs mainnet.</p>
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
