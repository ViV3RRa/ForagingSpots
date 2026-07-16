import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const benefitIconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const BENEFITS = [
  {
    label: ['Åbner', 'lynhurtigt'],
    icon: (
      <svg {...benefitIconProps} strokeWidth={1.6}>
        <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
      </svg>
    ),
  },
  {
    label: ['Virker', 'offline'],
    icon: (
      <svg {...benefitIconProps} strokeWidth={1.6}>
        <path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z" />
      </svg>
    ),
  },
  {
    label: ['Fuld', 'skærm'],
    icon: (
      <svg {...benefitIconProps} strokeWidth={1.7}>
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
    ),
  },
];

/* The final app icon from the design ("App Icon - Skovens Skatte": Spectral "S"
   monogram on terracotta) — full ladder lives in public/app-icon/, which subtask 3.5
   wires into the manifest. */
function AppIconTile() {
  return (
    <img
      src="/app-icon/icon-192.png"
      alt=""
      width={64}
      height={64}
      decoding="async"
      className="h-[64px] w-[64px] shrink-0 rounded-[16px] shadow-[0_6px_16px_-4px_var(--shadow)]"
    />
  );
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSPWA = 'standalone' in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || isIOSPWA) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS has no beforeinstallprompt, and localhost (dev) rarely fires it —
    // both show the sheet after a delay instead
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let timer: number | undefined;
    if ((isIOS && !isIOSPWA) || isLocalhost) {
      timer = window.setTimeout(() => {
        if (!sessionStorage.getItem('pwa-install-dismissed')) {
          setShowInstallPrompt(true);
        }
      }, 2000);
    }

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Hide for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    } else {
      // Declining the native prompt consumes the event, so the CTA can't fire again
      handleDismiss();
    }

    setDeferredPrompt(null);
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <Sheet
      open={showInstallPrompt}
      onOpenChange={(open) => {
        if (!open) handleDismiss();
      }}
    >
      <SheetContent side="bottom" className="bg-bg sm:mx-auto sm:max-w-[520px]">
        {/* Padding lives here, not on SheetContent, so the primitive's .safe-area-bottom
            padding (0 without insets) doesn't cancel the 30px bottom spacing */}
        <div className="px-[26px] pb-[30px]">
          {/* Header: app-icon tile + title + domain */}
          <div className="flex items-center gap-[16px] pt-[10px]">
            <AppIconTile />
            <div className="flex-1">
              <SheetTitle className="text-[21px] leading-tight text-ink">
                Føj til hjemmeskærm
              </SheetTitle>
              <p className="mt-[3px] font-mono text-[11px] text-mono">
                {window.location.hostname}
              </p>
            </div>
          </div>

          {/* Benefit cards */}
          <div className="my-[22px] flex gap-[10px]">
            {BENEFITS.map(({ label, icon }) => (
              <div
                key={label[0]}
                className="flex-1 rounded-[14px] border border-line bg-surface px-[10px] py-[14px] text-center"
              >
                <div className="mb-[7px] flex justify-center text-brand">{icon}</div>
                <div className="text-[11.5px] leading-[1.3] text-ink2">
                  {label[0]}
                  <br />
                  {label[1]}
                </div>
              </div>
            ))}
          </div>

          {isIOS ? (
            /* iOS Safari can't trigger install — show the manual instruction row */
            <>
              <div className="mb-[14px] flex items-center gap-[12px]">
                <div className="h-px flex-1 bg-line2" />
                <span className="font-serif text-[13px] italic text-muted">på iPhone</span>
                <div className="h-px flex-1 bg-line2" />
              </div>
              <div className="flex items-center justify-center gap-[8px] text-center text-[13.5px] leading-[1.5] text-ink2">
                <span>Tryk</span>
                <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-line bg-surface text-brand">
                  <svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 15V4M8.5 7.5L12 4l3.5 3.5M6 12v7h12v-7" />
                  </svg>
                </span>
                <span>
                  og vælg <b className="font-semibold text-ink">Føj til hjemmeskærm</b>
                </span>
              </div>
            </>
          ) : (
            /* Android/Chrome: native install via the captured beforeinstallprompt */
            <Button size="lg" className="w-full" onClick={handleInstallClick}>
              Installér app
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
