import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
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
import App from './App.tsx'

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('SW registered: ', registration)
        
        // Check for updates immediately
        registration.update()
        
        // Then check for updates every 60 seconds
        setInterval(() => {
          registration.update()
        }, 60000)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
