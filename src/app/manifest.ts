import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Merca+',
    short_name: 'Merca+',
    description: 'Organiza las compras de tu hogar de forma simple y colaborativa.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F7F8F5',
    theme_color: '#16A34A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
