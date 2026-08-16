'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const PublicChrome = dynamic(
  () => import('@/components/PublicChrome').then((m) => m.PublicChrome),
  { ssr: false },
);

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }
  return <PublicChrome>{children}</PublicChrome>;
}
