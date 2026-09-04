export function HowItWorks({ className = '' }: { className?: string }) {
  return (
    <section className={`flex flex-col gap-4 ${className}`} aria-labelledby="how-it-works-heading">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          How it works
        </p>
        <h2 id="how-it-works-heading" className="text-xl font-medium tracking-tight">
          Wallet, USDC, then a transaction you sign
        </h2>
      </div>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Step
          n={1}
          title="Connect a wallet"
          body="Email or a passkey creates a wallet via Privy. You can also connect MetaMask, Rainbow, or WalletConnect. Openhand does not store keys."
        />
        <Step
          n={2}
          title="Add USDC"
          body="Buy with CAD through Transak (their checkout, their identity checks) or send USDC you already hold. Funds arrive in your wallet, not ours."
        />
        <Step
          n={3}
          title="Deposit on-chain"
          body="Browse live rates and pick any card. Your wallet signs the protocol transaction. There is no featured pick and no pooled Openhand vault."
        />
      </ol>
    </section>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-border bg-white/[0.02] p-4 flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-accent/80 font-mono">
        Step {n}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-ink/55 leading-relaxed">{body}</p>
    </li>
  );
}
