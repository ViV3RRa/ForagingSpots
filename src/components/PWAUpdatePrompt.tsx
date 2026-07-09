import { useState, useEffect, useRef } from 'react'

// Horizontal swipe distance (px) past which releasing dismisses the toast
const SWIPE_DISMISS_PX = 48

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const dragStartX = useRef(0)

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLeaving) return
    dragStartX.current = e.clientX
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isLeaving) return
    const delta = e.clientX - dragStartX.current
    // Capture only once it's clearly a drag, so taps on the button still click
    if (Math.abs(delta) > 6 && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDragX(delta)
  }

  const handlePointerEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (Math.abs(dragX) > SWIPE_DISMISS_PX) {
      // Fly out toward the swipe direction, then unmount after the transition
      setIsLeaving(true)
      setDragX(Math.sign(dragX) * window.innerWidth)
      window.setTimeout(() => {
        setShowUpdatePrompt(false)
        setIsLeaving(false)
        setDragX(0)
      }, 200)
    } else {
      setDragX(0)
    }
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    // Toast pinned under the safe area (design top 60px ≈ status bar + 16px),
    // above all app chrome (design z 68)
    <div className="fixed inset-x-0 top-[calc(max(14px,env(safe-area-inset-top))+16px)] z-[68] animate-ss-fade px-[16px]">
      {/* Card is a hardcoded deep brand green in the design (not var(--brand)),
          so it stays dark — and the light text readable — in both themes */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          opacity: Math.max(0, 1 - Math.abs(dragX) / 240),
          transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
        }}
        className="mx-auto flex max-w-[430px] touch-none select-none items-center gap-[13px] rounded-[16px] bg-[#2f4a32] px-[16px] py-[14px] shadow-[0_14px_34px_-8px_rgba(0,0,0,.5)]"
      >
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-[#e9c98a]/20 text-[#f4efe3]">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isUpdating ? 'animate-ss-spin' : undefined}
            aria-hidden
          >
            <path d="M20 11a8 8 0 0 0-14-4M4 5v3h3M4 13a8 8 0 0 0 14 4M20 19v-3h-3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[15px] font-semibold leading-[1.3] text-[#f4efe3]">
            Ny version tilgængelig
          </div>
          <div className="mt-[1px] text-[12px] leading-[1.4] text-[#f4efe3]/70">
            Genindlæs for de nyeste kort.
          </div>
        </div>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="shrink-0 rounded-[11px] bg-accent px-[14px] py-[8px] font-serif text-[13.5px] font-semibold text-accent-ink disabled:opacity-60"
        >
          {isUpdating ? 'Opdaterer…' : 'Opdatér'}
        </button>
      </div>
    </div>
  )
}
