import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'FMIS - Financial Management & Intelligence System',
        short_name: 'FMIS',
        description: 'Financial Management & Intelligence System',
        theme_color: '#3B82F6',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Only cache GET requests — POST/PUT/DELETE must never be intercepted
            // by the Service Worker as the Cache API only stores GET responses,
            // causing a 405 "Method Not Allowed" on mutation endpoints.
            urlPattern: ({ request, url }) =>
              request.method === 'GET' && /\/api\/v1\//.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fmis-api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend.test',
        changeOrigin: true,
      },
    },
  },
})
