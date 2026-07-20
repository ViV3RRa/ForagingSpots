import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { queryPersister, PERSIST_BUSTER, PERSIST_MAX_AGE } from './lib/queryPersister'
// Self-hosted fonts (offline PWA — no Google Fonts CDN). Latin subset covers Danish (æ/ø/å).
// Weights match the design's font link: Spectral 400/500/600/700 + italic 400/500,
// Work Sans 400/500/600, Space Mono 400/700.
import '@fontsource/spectral/latin-400.css'
import '@fontsource/spectral/latin-400-italic.css'
import '@fontsource/spectral/latin-500.css'
import '@fontsource/spectral/latin-500-italic.css'
import '@fontsource/spectral/latin-600.css'
import '@fontsource/spectral/latin-700.css'
import '@fontsource/work-sans/latin-400.css'
import '@fontsource/work-sans/latin-500.css'
import '@fontsource/work-sans/latin-600.css'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/space-mono/latin-700.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import './styles/tokens.css'
import { registerSW } from 'virtual:pwa-register'
import { initAppHeight } from './utils/appHeight'
import { initHistoryLayers } from './lib/historyLayers'
import App from './App.tsx'

// Measure the real viewport into --app-height before first paint — the app
// shell's size depends on it (tokens.css #root; issues/002).
initAppHeight()

// Native back navigation closes open sheets/overlays instead of leaving the
// app, with the Android double-back exit guard (lib/historyLayers).
initHistoryLayers()

// Register service worker for PWA functionality. The virtual module resolves
// the correct SW URL per environment (/dev-sw.js?dev-sw in dev, /sw.js in prod);
// the update UX itself is handled by PWAUpdatePrompt.
registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update()
      }, 60000)
    }
  },
  onRegisterError(error) {
    console.log('SW registration failed: ', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
        dehydrateOptions: {
          // Risk #1: persist ONLY the all-spots list (['foraging-spots'], length
          // 1). pendingSpotsQueryKey (['pendingSpots']) mirrors Dexie — the real
          // source of truth — so persisting it would freeze a second copy that
          // drifts into ghost pins. Filtered lists / details extend the key and
          // are excluded too. Never persist a non-success snapshot.
          shouldDehydrateQuery: (query) =>
            query.queryKey.length === 1 &&
            query.queryKey[0] === 'foraging-spots' &&
            query.state.status === 'success',
          // Risk #2: don't persist mutations at all — the background refetch
          // reconciles instead.
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  </StrictMode>
)
