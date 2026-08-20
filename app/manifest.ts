import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Openhand',
    short_name: 'Openhand',
    description:
      'Cash, yield, and price upside. Connect your wallet. You sign every move. Openhand never holds your funds.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0e11',
    theme_color: '#0b0e11',
    lang: 'en',
    categories: ['finance'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Collection',
        short_name: 'Collection',
        description: 'Browse live yield cards',
        url: '/',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Cash, gold, stocks, crypto, and yield positions',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
