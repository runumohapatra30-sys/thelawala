import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      filename: 'sw.js',
      outDir: 'dist/client',
      manifest: false,
      includeAssets: ['favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      devOptions: { enabled: false },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: null,
        importScripts: ['/push-worker.js'],
        globPatterns: ['assets/**/*.{js,css,png,jpg,jpeg,svg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/src/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'thelawala-build-assets',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: () => true,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
