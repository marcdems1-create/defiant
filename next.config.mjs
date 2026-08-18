/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@privy-io/react-auth', '@privy-io/wagmi'],
  async redirects() {
    return [{ source: '/opportunities', destination: '/', permanent: false }];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/offline.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ];
  },
  webpack: (config) => {
    // pino-pretty/lokijs/encoding: optional WalletConnect logger deps.
    // @x402/*: optional Coinbase Smart Wallet payment-protocol deps pulled in
    // transitively by wagmi's baseAccount connector; unused unless that
    // specific x402 payment flow is exercised.
    config.externals.push(
      'pino-pretty',
      'lokijs',
      'encoding',
      '@x402/core/client',
      '@x402/evm',
      '@x402/evm/upto/client',
      '@x402/evm/exact/client',
      '@x402/svm/exact/client',
    );
    return config;
  },
};

export default nextConfig;
