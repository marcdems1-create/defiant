'use client';

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * Reown AppKit connect button. `<appkit-button>` is a web component registered
 * by createAppKit() (see lib/wagmi.ts), so there's nothing to import here — it
 * just needs AppKit to have initialized, which the ssr:false Providers tree
 * guarantees before this ever renders. Keeping zero @reown/appkit imports in
 * this module is deliberate: it means no page's static import graph can pull
 * the wallet stack into a server-evaluated chunk.
 *
 * The props mirror the old RainbowKit wrapper so callers don't change; only
 * `showBalance` is meaningful for AppKit (it maps to the `balance` attribute).
 */
export function ConnectButtonClient(props: {
  showBalance?: boolean;
  chainStatus?: 'icon' | 'full' | 'none';
}) {
  return <appkit-button balance={props.showBalance ? 'show' : 'hide'} />;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & { balance?: string; size?: string; label?: string },
        HTMLElement
      >;
    }
  }
}
