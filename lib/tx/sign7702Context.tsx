'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Sign7702Fn } from '@/lib/tx/sign7702';

const Sign7702Context = createContext<Sign7702Fn | undefined>(undefined);

export function Sign7702Provider({
  value,
  children,
}: {
  value: Sign7702Fn | undefined;
  children: ReactNode;
}) {
  return <Sign7702Context.Provider value={value}>{children}</Sign7702Context.Provider>;
}

export function useSign7702Fn(): Sign7702Fn | undefined {
  return useContext(Sign7702Context);
}
