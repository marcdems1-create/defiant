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
    question: 'How soon might you need this money back?',
    options: [
      { value: 'immediate', label: 'Could need it anytime', hint: 'Only show opportunities you can withdraw instantly.' },
      { value: 'flexible', label: "Fine waiting a few days if needed", hint: 'Include options with a withdrawal queue, like Lido.' },
    ],
  },
  {
    key: 'riskComfort',
    question: 'How do you feel about protocol maturity?',
    options: [
      { value: 'established', label: 'Stick to the most established protocols', hint: 'Only long-track-record protocols (Aave, Lido).' },
      { value: 'open', label: 'Open to newer, more complex protocols', hint: 'Include everything, including Yearn’s vault strategies.' },
    ],
  },
  {
    key: 'priority',
    question: "What matters most when you're comparing options?",
    options: [
      { value: 'yield', label: 'Highest yield first', hint: 'Sort by APY, highest first.' },
      { value: 'risk', label: 'Lower risk first, yield second', hint: 'Sort established + instant-withdrawal options first.' },
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
      <h2 className="text-lg font-medium mb-1">A few questions before you browse</h2>
      <p className="text-xs text-ink/50 mb-5 leading-relaxed">
        This only changes which opportunities are shown and in what order — it is not
        financial advice, it does not assess your finances, and nothing here is a
        recommendation. Every option carries real risk regardless of your answers. You can
        change these anytime, or skip and see everything.
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
              Save my answers, linked to my connected wallet address, so Defiant can improve
              my experience and may contact me about relevant updates. Requires signing a
              free message with my wallet — no transaction, no gas. I can withdraw consent by
              not checking this box on future visits.
            </span>
          </label>
        ) : (
          <div className="text-xs text-ink/40">
            Connect your wallet to optionally save your answers for future updates. Your
            local filter still works either way.
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
            Couldn&apos;t save your answers, but the filter below is still applied.
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={submit}
          disabled={!allAnswered || saveStatus === 'signing' || saveStatus === 'saving'}
          className="px-4 py-2 rounded-md bg-accent text-paper text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Apply
        </button>
        <button onClick={onSkip} className="px-4 py-2 rounded-md text-sm text-ink/60 hover:text-ink">
          Skip — show everything
        </button>
      </div>
    </div>
  );
}
