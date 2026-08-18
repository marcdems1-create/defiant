'use client';

import { useEffect, useState } from 'react';
import {
  INSTALL_DISMISS_KEY,
  installPromptIsSnoozed,
  isIosSafari,
  isStandaloneDisplay,
  snoozeInstallPrompt,
} from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandaloneDisplay() || installPromptIsSnoozed()) {
      setHidden(true);
      return;
    }

    setIosHint(isIosSafari());
    setHidden(false);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setIosHint(false);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const onInstalled = () => {
      try {
        window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      setDeferred(null);
      setHidden(true);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    snoozeInstallPrompt();
    setHidden(true);
    setDeferred(null);
  }

  if (hidden) return null;
  if (!deferred && !iosHint) return null;

  return (
    <div
      className="fixed inset-x-3 z-[60] rounded-2xl border border-accent/30 bg-paper/95 backdrop-blur-md px-4 py-3 flex items-start justify-between gap-3 text-sm shadow-lg shadow-black/40 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-4 md:max-w-md md:left-auto md:right-4"
      role="dialog"
      aria-label="Install Openhand"
    >
      <div className="min-w-0">
        <p className="font-medium text-ink">Install Openhand</p>
        <p className="text-ink/60 text-xs mt-0.5 leading-relaxed">
          {deferred
            ? 'Add it to your home screen. Same non-custodial app — your wallet still signs every move.'
            : 'In Safari, tap Share, then Add to Home Screen.'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {deferred && (
          <button
            type="button"
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
              dismiss();
            }}
            className="px-3 py-1.5 rounded-lg bg-accent text-paper text-xs font-medium"
          >
            Install
          </button>
        )}
        <button type="button" onClick={dismiss} className="text-ink/50 text-xs px-2 py-1">
          Later
        </button>
      </div>
    </div>
  );
}
