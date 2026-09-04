'use client';

import { useEffect } from 'react';

/**
 * Registers the installability / offline-shell worker.
 * Production only — a SW in `next dev` caches hashed chunks and fights HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const url = '/sw.js';
    void navigator.serviceWorker.register(url, { scope: '/' }).catch(() => {
      /* SW failure must never break wallet connect or deposits */
    });
  }, []);

  return null;
}
