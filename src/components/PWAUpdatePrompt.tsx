import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { RefreshCw, Download } from 'lucide-react'

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setRegistration(reg)
          
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available
                  setShowUpdatePrompt(true)
                }
              })
            }
          })

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
              setShowUpdatePrompt(true)
            }
          })

          // Check if there's already a waiting service worker
          if (reg.waiting) {
            setShowUpdatePrompt(true)
          }
        }
      })
    }
  }, [])

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      if (registration && registration.waiting) {
        // Tell the waiting service worker to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        
        // Listen for the controlling service worker change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      } else {
        // Fallback: just reload the page
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating service worker:', error)
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setShowUpdatePrompt(false)
  }

  // Manual update check
  const checkForUpdates = async () => {
    if (registration) {
      try {
        await registration.update()
      } catch (error) {
        console.error('Error checking for updates:', error)
      }
    }
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-lg border-2 border-green-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Download className="h-5 w-5" />
            Opdatering tilgængelig
          </CardTitle>
          <CardDescription>
            En ny version af Skovens Skatte er tilgængelig med forbedringer og fejlrettelser.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Opdaterer...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Opdater nu
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="flex-1"
            >
              Senere
            </Button>
          </div>
          <div className="mt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={checkForUpdates}
              className="w-full text-xs"
            >
              Tjek for opdateringer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
