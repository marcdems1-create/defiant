'use client';

import { useState } from 'react';
import type { InvestmentPreferences } from '@/lib/preferences';

type Draft = Partial<InvestmentPreferences>;

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
  const [draft, setDraft] = useState<Draft>({});

  const allAnswered = QUESTIONS.every((q) => draft[q.key] !== undefined);

  function select(key: keyof InvestmentPreferences, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function submit() {
    if (!allAnswered) return;
    onComplete(draft as InvestmentPreferences);
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

      <div className="flex gap-3 mt-6">
        <button
          onClick={submit}
          disabled={!allAnswered}
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
