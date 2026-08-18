import { CctpMove } from '@/components/CctpMove';

export const metadata = {
  title: 'Move USDC',
  description: 'Move native USDC across Ethereum, Base, and Arbitrum via Circle CCTP. You sign; Openhand never holds the tokens.',
};

export default function MovePage() {
  return <CctpMove />;
}
