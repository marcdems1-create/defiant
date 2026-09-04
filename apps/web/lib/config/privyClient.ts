import type { PrivyClientConfig } from '@privy-io/react-auth';
import { chains } from '@/lib/wagmi';
import { SITE_NAME } from '@/lib/config/site';

/**
 * Client-only Privy modal config. Do not import this from server modules.
 * Coinbase / Base Account are omitted from the wallet list on purpose.
 */
export function getPrivyClientConfig(): PrivyClientConfig {
  return {
    loginMethods: ['email', 'passkey', 'wallet'],
    appearance: {
      theme: 'dark',
      accentColor: '#3ecf8e',
      landingHeader: `Connect to ${SITE_NAME}`,
      loginMessage: 'New here? Email or a passkey creates a wallet. We never hold your key.',
      showWalletLoginFirst: false,
      walletList: [
        'detected_ethereum_wallets',
        'metamask',
        'rainbow',
        'rabby_wallet',
        'wallet_connect',
      ],
      walletChainType: 'ethereum-only',
    },
    embeddedWallets: {
      ethereum: { createOnLogin: 'users-without-wallets' },
      solana: { createOnLogin: 'off' },
    },
    walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    supportedChains: [...chains],
    defaultChain: chains[0],
  };
}
