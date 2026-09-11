/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @defiant/core ships its TypeScript source directly (package.json "main"
  // points at src/index.ts, not a compiled dist/) — transpilePackages tells
  // Next to run its own transform over that workspace package instead of
  // treating it like ordinary pre-built node_modules content.
  transpilePackages: ['@privy-io/react-auth', '@privy-io/wagmi', '@defiant/core'],
  async redirects() {
    return [
      { source: '/opportunities', destination: '/', permanent: false },
      // URLs Transak / counsel type by habit. Permanent so crawlers keep one canonical.
      { source: '/tos', destination: '/terms', permanent: true },
      { source: '/terms-of-service', destination: '/terms', permanent: true },
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/refund', destination: '/refunds', permanent: true },
      { source: '/refund-policy', destination: '/refunds', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
    ];
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
