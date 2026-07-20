import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // woff2 covers the self-hosted fonts; the .woff fallbacks are legacy-only and not precached
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Let PWAUpdatePrompt control when updates activate
        clientsClaim: true,
        runtimeCaching: [
          {
            // Covers style JSON (/styles/v1), sprites, glyphs (/fonts/v1) and
            // vector tiles (/v4) — one map load needs style + sprite + ~dozens
            // of glyph ranges + tiles, hence the generous entry cap
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 365 * 2 // <== 2 years
              }
            }
          },
          {
            // Spot image thumbs (32px blur-up placeholders + 600px gallery
            // tiles). PocketBase appends a random suffix to every uploaded
            // filename, so a file URL is immutable and CacheFirst can never
            // serve stale content. Full-size originals (no ?thumb=) are
            // deliberately excluded — they run to several hundred KB each.
            // Host-agnostic match so dev (127.0.0.1:8090) and prod
            // (foraging.viverra.dk) both hit the same route.
            urlPattern: ({ url }) => url.pathname.includes('/api/files/') && url.searchParams.has('thumb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pb-thumbs',
              expiration: {
                maxEntries: 1500,
                maxAgeSeconds: 60 * 60 * 24 * 365 * 2 // <== 2 years
              }
            }
          }
        ]
      },
      includeAssets: [
        'app-icon/icon-40.png',
        'app-icon/icon-120.png',
        'app-icon/icon-152.png',
        'app-icon/icon-180.png'
      ],
      manifest: {
        name: 'Skovens Skatte',
        short_name: 'Skovens Skatte',
        description: 'Markér og genfind dine svampe- og bærsteder',
        lang: 'da',
        // Matches the light-theme --bg chrome (src/styles/tokens.css); the
        // ThemeContext keeps the in-app theme-color meta in sync after boot
        theme_color: '#f4efe3',
        background_color: '#f4efe3',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'app-icon/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'app-icon/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            // Full-bleed terracotta; the monogram sits well inside the
            // maskable safe zone, so the same asset serves both purposes
            src: 'app-icon/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  css: {
    postcss: './postcss.config.cjs',
  },
})
