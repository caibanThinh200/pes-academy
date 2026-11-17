import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PES Academy',
    short_name: 'PES Academy',
    description: 'Weekly football academy management, pitch-side check-ins, and AI video tracking.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#282327',
    theme_color: '#43A1D5',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
