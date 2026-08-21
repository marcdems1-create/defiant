import { CctpMove } from '@/components/CctpMove';
import { pageMetadata } from '@/lib/config/seo';

export const metadata = pageMetadata({
  title: 'Move USDC',
  description:
    'Move native USDC across Ethereum, Base, and Arbitrum via Circle CCTP. You sign; Openhand never holds the tokens.',
  path: '/move',
});

export default function MovePage() {
  return <CctpMove />;
}
