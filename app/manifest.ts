import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Us',
    short_name: 'Us',
    description: 'Our private space',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fdf2f4',
    theme_color: '#f43f5e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}