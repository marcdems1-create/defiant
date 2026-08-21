import { CollectionPage } from '@/components/CollectionPage';
import { homeMetadata } from '@/lib/config/seo';

export const metadata = homeMetadata();

export default function HomePage() {
  return <CollectionPage />;
}
