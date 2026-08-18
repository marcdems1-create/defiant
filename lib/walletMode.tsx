'use client';

import { createContext, useContext } from 'react';
import { privyAppId } from '@/lib/config/privy';

/** Which wallet UI is actually mounted. Privy can fail at runtime (origin
 *  allowlist) even when NEXT_PUBLIC_PRIVY_APP_ID is set — the connect button
 *  must follow this, not the env flag alone. */
export type WalletMode = 'privy' | 'rainbow';

export const WalletModeContext = createContext<WalletMode>(
  privyAppId() ? 'privy' : 'rainbow',
);

export function useWalletMode(): WalletMode {
  return useContext(WalletModeContext);
}
