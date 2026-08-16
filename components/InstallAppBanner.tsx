'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIosHint(isIos && !standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed) return null;

  if (deferred) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-ink/80">Install Openhand on your home screen</span>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-ink/50 text-xs px-2"
          >
            Later
          </button>
          <button
            type="button"
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
              setDismissed(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-accent text-paper text-xs font-medium"
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  if (iosHint) {
    return (
      <div className="rounded-xl border border-border bg-white/[0.03] px-4 py-3 text-sm text-ink/65">
        <span className="font-medium text-ink/80">Add to Home Screen: </span>
        tap Share → Add to Home Screen in Safari.
      </div>
    );
  }

  return null;
}
