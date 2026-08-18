import { AnalyticsBeacon } from '@/components/AnalyticsBeacon';
import { PublicChrome } from '@/components/PublicChrome';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20 md:pb-0">
      <AnalyticsBeacon />
      <PublicChrome>{children}</PublicChrome>
    </div>
  );
}
