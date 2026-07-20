import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import BootSplash from './components/BootSplash';
import WelcomeScreen from './components/WelcomeScreen';
import SignInScreen from './components/SignInScreen';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import LocationPermissionScreen from './components/LocationPermissionScreen';
import ProfileSheet from './components/ProfileSheet';
import { useForagingSpots, useCreateSpot, useUpdateSpot, useDeleteSpot } from './hooks/useForagingSpots';
import { queryGeolocationPermission, startUserLocation } from './hooks/useUserLocation';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { usePendingSpots } from './hooks/usePendingSpots';
import { usePreloadSpotPlaceholders } from './hooks/usePreloadSpotPlaceholders';
import type { ForagingSpot } from './lib/types';
import './styles/tokens.css'
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './lib/queryClient';

// Dev-only living style reference (master plan 1.3) — lazy so it stays out of
// the production chunk; reached via the commented-out 'icons' screen below.
const IconShowcase = lazy(() => import('./components/IconShowcase'));

// The map screen drags in mapbox-gl/react-map-gl — by far the heaviest chunks —
// so it must not block first paint of the welcome/sign-in screens. The module-
// level import() still starts the download immediately (parallel with boot),
// so signed-in users on a cold cache don't get a request waterfall.
const mainMapScreenImport = import('./components/MainMapScreen');
const MainMapScreen = lazy(() => mainMapScreenImport);

// Set once either priming action is taken, so the screen never nags again.
const LOCATION_ASKED_KEY = 'ss-location-asked';

function hasBeenAskedForLocation(): boolean {
  try {
    return localStorage.getItem(LOCATION_ASKED_KEY) !== null;
  } catch {
    return true; // No storage → we could never remember the answer; don't nag.
  }
}

function AppContent() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'signin' | 'map' | 'icons'>('welcome');
  const [showLocationPriming, setShowLocationPriming] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const queryClient = useQueryClient();

  // TanStack Query hooks for data management
  const { data: foragingSpots = [], isLoading: spotsLoading } = useForagingSpots(isAuthenticated);
  const createSpotMutation = useCreateSpot();
  // Warm the drawer's 32px blur-up placeholders while the map is idle, so
  // opening a spot on a slow connection never shimmers over an empty tile
  usePreloadSpotPlaceholders(foragingSpots);
  const updateSpotMutation = useUpdateSpot();
  const deleteSpotMutation = useDeleteSpot();

  // Offline sync management
  const { sync: syncPendingSpots, pendingSpots } = usePendingSpots();

  // Sync pending spots when coming back online
  const handleOnline = useCallback(async () => {
    if (pendingSpots.length > 0 && isAuthenticated) {
      await syncPendingSpots();
      // Refresh the spots list after sync
      queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
    }
  }, [pendingSpots.length, isAuthenticated, syncPendingSpots, queryClient]);

  // Listen for online events
  useNetworkStatus(handleOnline);

  // Also sync on app load if online and authenticated
  useEffect(() => {
    if (navigator.onLine && isAuthenticated && pendingSpots.length > 0) {
      syncPendingSpots().then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
      });
    }
  }, [isAuthenticated, pendingSpots.length, syncPendingSpots, queryClient]);

  // Location permission priming (subtask 3.1): once after sign-in, while the
  // permission state is still 'prompt' and the user was never asked before,
  // show the priming screen over the map. Any failure just lands on the map.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShowLocationPriming(false);
      return;
    }
    if (hasBeenAskedForLocation()) return;

    let cancelled = false;
    queryGeolocationPermission()
      .then((permission) => {
        if (!cancelled && permission === 'prompt') setShowLocationPriming(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const dismissLocationPriming = (allow: boolean) => {
    try {
      localStorage.setItem(LOCATION_ASKED_KEY, '1');
    } catch {
      // Storage unavailable — worst case the screen shows again next session.
    }
    // Opening the location gate is what fires the browser's native prompt;
    // the map shows regardless of what the user answers there.
    if (allow) startUserLocation();
    setShowLocationPriming(false);
  };

  // Update screen based on authentication state
  useEffect(() => {
    if (isAuthenticated && user) {
      setCurrentScreen('map');
    } else if (!isLoading) {
      setCurrentScreen('welcome');
      // setCurrentScreen('icons');
    }
  }, [isAuthenticated, user, isLoading]);

  const handleSignIn = async (email: string, password: string): Promise<boolean> => {
    const success = await signIn(email, password);
    if (success) {
      setCurrentScreen('map');
    }
    return success;
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentScreen('welcome');
  };

  // Entry point for the "Rediger profil" sheet (issues/004), reached from the
  // avatar popover's profile row (issues/003) on both map and list views.
  const handleOpenProfile = () => setProfileOpen(true);

  // TanStack Query mutation functions
  const addForagingSpot = (spot: Omit<ForagingSpot, 'id' | 'user' | 'created' | 'updated' | 'images'> & { images: File[] }) => {
    if (!user) return;
    createSpotMutation.mutate(spot);
  };

  const updateForagingSpot = (spotId: string, updates: Partial<Omit<ForagingSpot, 'images'>> & { images?: File[]; existingImageFilenames?: string[] }) => {
    updateSpotMutation.mutate({ id: spotId, data: updates });
  };

  const deleteForagingSpot = (spotId: string) => {
    deleteSpotMutation.mutate(spotId);
  };

  // Branded boot splash while restoring auth or loading the first spots
  if (isLoading || (isAuthenticated && spotsLoading)) {
    return <BootSplash />;
  }

  if (currentScreen === 'icons') {
    return (
      <Suspense fallback={null}>
        <IconShowcase />
      </Suspense>
    );
  }

  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen 
        onSignIn={() => setCurrentScreen('signin')}
      />
    );
  }

  if (currentScreen === 'signin') {
    return (
      <SignInScreen 
        onSignIn={handleSignIn}
        onBack={() => setCurrentScreen('welcome')}
      />
    );
  }

  // Show map screen if authenticated. The Suspense fallback matches the
  // auth/spots boot state above, so a cold-cache load stays on the splash
  // until the (usually already downloaded) map chunk is ready.
  if (isAuthenticated && user) {
    return (
      <>
        <Suspense fallback={<BootSplash />}>
          <MainMapScreen
            user={user}
            foragingSpots={foragingSpots}
            onSignOut={handleSignOut}
            onOpenProfile={handleOpenProfile}
            onAddSpot={addForagingSpot}
            onUpdateSpot={updateForagingSpot}
            onDeleteSpot={deleteForagingSpot}
          />
        </Suspense>
        <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
        {showLocationPriming && (
          <LocationPermissionScreen
            onAllow={() => dismissLocationPriming(true)}
            onSkip={() => dismissLocationPriming(false)}
          />
        )}
      </>
    );
  }

  // Fallback to welcome screen
  return (
    <WelcomeScreen 
      onSignIn={() => setCurrentScreen('signin')}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      {/* No safe-area padding here: #root is the fixed app frame (tokens.css) and
          every screen/overlay handles its own env() insets. A padded wrapper would
          double-pad and push the 100%-tall screens past the viewport (issues/001). */}
      <div className="h-full">
        <AuthProvider>
          <AppContent />
          <PWAUpdatePrompt />
        </AuthProvider>
        {/* Inside ThemeProvider so the toast cards follow the app's useTheme */}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
