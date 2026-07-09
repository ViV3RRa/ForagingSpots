import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
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
import App from './App.tsx'

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
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
