'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import type { InvestmentPreferences } from '@/lib/preferences';
import { CONSENT_MESSAGE } from '@/lib/preferences';

type Draft = Partial<InvestmentPreferences>;
type SaveStatus = 'idle' | 'signing' | 'saving' | 'saved' | 'error';

const QUESTIONS: {
  key: keyof InvestmentPreferences;
  question: string;
  options: { value: string; label: string; hint: string }[];
}[] = [
  {
    key: 'liquidityNeed',
    question: 'Filter by withdrawal speed',
    options: [
      { value: 'immediate', label: 'Instant only', hint: 'Exclude opportunities with withdrawal queues.' },
      { value: 'flexible', label: 'Include delayed withdrawal', hint: 'Show instant and queued options (e.g. Lido).' },
    ],
  },
  {
    key: 'riskComfort',
    question: 'Filter by protocol maturity',
    options: [
      { value: 'established', label: 'Established protocols only', hint: 'Aave, Lido, and similar long-track-record options.' },
      { value: 'open', label: 'Include newer protocols', hint: 'Also show vault strategies and newer integrations.' },
    ],
  },
  {
    key: 'priority',
    question: 'Sort by',
    options: [
      { value: 'yield', label: 'APY (highest first)', hint: 'Rank by current yield.' },
      { value: 'risk', label: 'Stability first', hint: 'Established + instant withdrawal first, then APY.' },
    ],
  },
];

export function InvestmentStyleQuestionnaire({
  onComplete,
  onSkip,
}: {
  onComplete: (prefs: InvestmentPreferences) => void;
  onSkip: () => void;
}) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [draft, setDraft] = useState<Draft>({});
  const [consent, setConsent] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const allAnswered = QUESTIONS.every((q) => draft[q.key] !== undefined);

  function select(key: keyof InvestmentPreferences, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit() {
    if (!allAnswered) return;
    const prefs = draft as InvestmentPreferences;

    // Local filter/sort applies regardless of consent — that part of the
    // questionnaire never touches the network.
    onComplete(prefs);

    if (!consent || !address) return;

    setSaveStatus('signing');
    try {
      const signature = await signMessageAsync({ message: CONSENT_MESSAGE });
      setSaveStatus('saving');
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature, ...prefs }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch {
      // Signature rejected, or the request failed — the local filter is
      // already applied above, so this only affects whether it's saved.
      setSaveStatus('error');
    }
  }

  return (
    <div className="border border-border rounded-lg p-6 mb-8">
      <h2 className="text-lg font-medium mb-1">Browse filters</h2>
      <p className="text-xs text-ink/50 mb-5 leading-relaxed">
        Adjust which opportunities appear and how they&apos;re ordered. Display filter
        only — not financial advice, not a suitability check, and not a product
        recommendation. All options carry smart-contract, market, and liquidity risk.
        Skip to see the full list, or change filters anytime.
      </p>

      <div className="flex flex-col gap-5">
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <div className="text-sm mb-2">{q.question}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => select(q.key, opt.value)}
                  className={`text-left border rounded-md px-3 py-2 text-sm transition-colors ${
                    draft[q.key] === opt.value
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-ink/30'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-xs text-ink/40 mt-0.5">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        {address ? (
          <label className="flex items-start gap-2 text-xs text-ink/60 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Save these filter settings to the connected wallet address so Defiant can
              improve the product and may send relevant updates. Requires a free wallet
              signature — no transaction, no gas. Leave unchecked to apply filters locally
              only.
            </span>
          </label>
        ) : (
          <div className="text-xs text-ink/40">
            Connect a wallet to optionally save filter settings. Filters apply locally either
            way.
          </div>
        )}

        {saveStatus === 'signing' && (
          <div className="text-xs text-ink/50 mt-2">Waiting for signature…</div>
        )}
        {saveStatus === 'saving' && <div className="text-xs text-ink/50 mt-2">Saving…</div>}
        {saveStatus === 'saved' && (
          <div className="text-xs text-accent mt-2">Saved. Filter applied below.</div>
        )}
        {saveStatus === 'error' && (
          <div className="text-xs text-danger mt-2">
            Couldn&apos;t save filter settings, but the list below is still filtered.
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={submit}
          disabled={!allAnswered || saveStatus === 'signing' || saveStatus === 'saving'}
          className="px-4 py-2 rounded-md bg-accent text-paper text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Apply filters
        </button>
        <button onClick={onSkip} className="px-4 py-2 rounded-md text-sm text-ink/60 hover:text-ink">
          Show all — no filters
        </button>
      </div>
    </div>
  );
}
