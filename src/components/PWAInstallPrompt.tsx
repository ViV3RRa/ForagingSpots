import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Download, X, Share, Plus } from 'lucide-react';
import { getForagingIcon } from './icons';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
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
    // Debug logging for iOS detection
    console.log('PWA Install Prompt - Debug Info:', {
      isIOS,
      isIOSPWA,
      userAgent: navigator.userAgent,
      standalone: 'standalone' in window.navigator ? (window.navigator as Navigator & { standalone?: boolean }).standalone : 'not available',
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || isIOSPWA) {
      console.log('PWA Install Prompt - App already installed, hiding prompt');
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

    // For iOS: Show install prompt after delay since beforeinstallprompt doesn't exist
    if (isIOS && !isIOSPWA) {
      console.log('PWA Install Prompt - Setting iOS timer for 3 seconds');
      const timer = setTimeout(() => {
        console.log('PWA Install Prompt - iOS timer fired, checking session storage');
        if (!sessionStorage.getItem('pwa-install-dismissed')) {
          console.log('PWA Install Prompt - Showing iOS install prompt');
          setShowInstallPrompt(true);
        } else {
          console.log('PWA Install Prompt - iOS prompt dismissed in session storage');
        }
      }, 3000); // Show after 3 seconds on iOS
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    // For development: show install prompt after 3 seconds if on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const timer = setTimeout(() => {
        if (!sessionStorage.getItem('pwa-install-dismissed')) {
          setShowInstallPrompt(true);
        }
      }, 3000);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Hide for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || !showInstallPrompt || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className="shadow-lg border-forest-green border-2">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-2xl">{getForagingIcon('chanterelle', { size: 24 })}</div>
              <div>
                <h3 className="font-semibold text-sm">Installér Skovens Skatte</h3>
                <p className="text-xs text-gray-600">Få nem adgang fra din hjemmeskærm</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {isIOS ? (
            // iOS-specific installation instructions
            <div className="space-y-3">
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Share className="h-3 w-3" />
                  <span>Træk på Del-knappen i Safari</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="h-3 w-3" />
                  <span>Vælg "Føj til hjemmeskærm"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getForagingIcon('chanterelle', { size: 24 })}</span>
                  <span>Tryk "Tilføj" for at installere Skovens Skatte</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="w-full"
              >
                Det er forstået!
              </Button>
            </div>
          ) : (
            // Android/Chrome installation
            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="flex-1 bg-forest-green hover:bg-forest-dark text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Installér App
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="px-3"
              >
                Senere
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
