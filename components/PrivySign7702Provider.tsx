'use client';

import { useSign7702Authorization } from '@privy-io/react-auth';
import { Sign7702Provider } from '@/lib/tx/sign7702Context';

/** Only mount under PrivyProvider — the hook throws otherwise. */
export function PrivySign7702Provider({ children }: { children: React.ReactNode }) {
  const { signAuthorization } = useSign7702Authorization();
  return <Sign7702Provider value={signAuthorization}>{children}</Sign7702Provider>;
}
