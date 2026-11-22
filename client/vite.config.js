import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // Keep the service worker from ever answering API requests with index.html
      workbox: {
        navigateFallbackDenylist: [/^\/api/]
      },
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html'
      },
      manifest: {
        name: 'MediRescue Emergency',
        short_name: 'MediRescue',
        description: 'Emergency Medical Response System',
        theme_color: '#10243a',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/?source=pwa',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  // Dev only: connects the frontend to the local backend.
  // This does not exist in production, which is why VITE_API_ORIGIN is needed there.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})