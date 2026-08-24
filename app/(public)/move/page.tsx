import { WalletOnly } from '@/components/WalletOnly';
import { CctpMove } from '@/components/CctpMove';

export const metadata = {
  title: 'Move USDC',
  description:
    'Move native USDC across Ethereum, Base, and Arbitrum via Circle CCTP. You sign; Openhand never holds the tokens.',
};

export default function MovePage() {
  return (
    <WalletOnly
      fallback={
        <div className="flex flex-col gap-4 max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono">
            Circle CCTP
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Move USDC</h1>
          <p className="text-ink/55 text-sm leading-relaxed">
            Move native USDC across Ethereum, Base, and Arbitrum. You sign every burn and mint.
            Openhand never holds the tokens.
          </p>
        </div>
      }
    >
      <CctpMove />
    </WalletOnly>
  );
}
