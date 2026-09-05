'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { stockChainLabel } from '@/lib/config/lifi';

interface UnmatchedRow {
  id: string;
  symbol: string;
  name: string;
  chainId: number;
  address: string;
  issuer: string;
  priceUsd: number;
}

interface UncoveredCoingeckoRow {
  cgeckoId: string;
  symbol: string;
  marketCapUsd: number;
}

interface DivergentRow {
  id: string;
  symbol: string;
  chainId: number;
  priceUsd: number;
  divergencePct: number;
}

interface Data {
  error?: string;
  totalClassified: number;
  matched: number;
  unmatched: UnmatchedRow[];
  uncoveredCoingeckoStocks: UncoveredCoingeckoRow[];
  divergent: DivergentRow[];
  divergenceThresholdPct: number;
}

function formatUsd(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function AdminStocksPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/admin/stocks-unmatched');
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const json = (await res.json()) as Data;
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || 'Could not load unmatched rows');
        return;
      }
      setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          Internal
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Tokenized-stock data coverage</h1>
        <p className="text-sm text-ink/50 mt-2 max-w-2xl leading-relaxed">
          Rows the tape is currently blind to (BUILD_SPEC Phase 1). The public tape shows
          &ldquo;No cap data&rdquo; instead of dropping these rows, but visibility here is
          what tells you whether the mapping table needs a fix.
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!data && !error && <div className="text-sm text-ink/50">Loading…</div>}

      {data && (
        <>
          <section className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
                LI.FI rows classified
              </div>
              <div className="text-2xl font-mono text-accent leading-tight">
                {data.totalClassified}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
                Matched to a cap
              </div>
              <div className="text-2xl font-mono text-accent leading-tight">{data.matched}</div>
            </div>
            <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-mono">
                Unmatched
              </div>
              <div className="text-2xl font-mono text-warn leading-tight">
                {data.unmatched.length}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
            <h2 className="text-sm font-medium mb-1">
              LI.FI tokens with no CoinGecko cap match
            </h2>
            <p className="text-xs text-ink/45 mb-4">
              Classified as a stock/ETF from LI.FI&apos;s catalog naming, but CoinGecko has no
              contract address on this chain for the matching id.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/40">
                    <th className="pb-2 pr-4">Symbol</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Issuer</th>
                    <th className="pb-2 pr-4">Chain</th>
                    <th className="pb-2 pr-4">Address</th>
                    <th className="pb-2">Price</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {data.unmatched.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="py-2 pr-4">{row.symbol}</td>
                      <td className="py-2 pr-4 font-sans truncate max-w-[16rem]">{row.name}</td>
                      <td className="py-2 pr-4">{row.issuer}</td>
                      <td className="py-2 pr-4">{stockChainLabel(row.chainId)}</td>
                      <td className="py-2 pr-4 truncate max-w-[10rem]">{row.address}</td>
                      <td className="py-2">{formatUsd(row.priceUsd)}</td>
                    </tr>
                  ))}
                  {data.unmatched.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-ink/45 font-sans">
                        Every classified row currently has a cap match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
            <h2 className="text-sm font-medium mb-1">
              CoinGecko tokenized stocks with no address on a tracked chain
            </h2>
            <p className="text-xs text-ink/45 mb-4">
              CoinGecko lists these under the tokenized-stock category, but their
              <code className="font-mono text-accent"> platforms</code> field has no address on
              Ethereum, Base, or Arbitrum — so LI.FI matching can never reach them from this
              side either. Likely non-EVM issuance (e.g. Solana-only) or a category tag with no
              on-chain address on file.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/40">
                    <th className="pb-2 pr-4">CoinGecko ID</th>
                    <th className="pb-2 pr-4">Symbol</th>
                    <th className="pb-2">Market cap</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {data.uncoveredCoingeckoStocks.map((row) => (
                    <tr key={row.cgeckoId} className="border-t border-border/60">
                      <td className="py-2 pr-4">{row.cgeckoId}</td>
                      <td className="py-2 pr-4 uppercase">{row.symbol}</td>
                      <td className="py-2">{formatUsd(row.marketCapUsd)}</td>
                    </tr>
                  ))}
                  {data.uncoveredCoingeckoStocks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-ink/45 font-sans">
                        No coverage gaps from the CoinGecko side right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white/[0.02] p-6">
            <h2 className="text-sm font-medium mb-1">
              Matched rows with the largest LI.FI vs CoinGecko divergence
            </h2>
            <p className="text-xs text-ink/45 mb-4">
              LI.FI&apos;s priceUSD vs CoinGecko&apos;s spot price for the same matched coin,
              flagged above {data.divergenceThresholdPct}% (Phase 1 P1). A few large rows is
              normal (thin markets, closed-hours pricing). Many rows diverging by a similar
              amount instead suggests the join itself is wrong — e.g. a platform id resolved
              to the wrong chain — not that every token individually mispriced.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/40">
                    <th className="pb-2 pr-4">Symbol</th>
                    <th className="pb-2 pr-4">Chain</th>
                    <th className="pb-2 pr-4">LI.FI price</th>
                    <th className="pb-2">Divergence</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {data.divergent.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="py-2 pr-4">{row.symbol}</td>
                      <td className="py-2 pr-4">{stockChainLabel(row.chainId)}</td>
                      <td className="py-2 pr-4">{formatUsd(row.priceUsd)}</td>
                      <td className="py-2">
                        {row.divergencePct > 0 ? '+' : ''}
                        {row.divergencePct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {data.divergent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-ink/45 font-sans">
                        No matched row currently diverges past the threshold.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
