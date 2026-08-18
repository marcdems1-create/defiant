import { SwapCard } from '@/components/SwapCard';

export const metadata = {
  title: 'Swap',
  description:
    'Convert tokens on one chain in your own wallet. To move USDC across Ethereum, Base, and Arbitrum, use Move.',
};

export default function SwapPage() {
  return <SwapCard />;
}
