import { useState, useEffect, useCallback } from 'react';
import BootSplash from './components/BootSplash';
import WelcomeScreen from './components/WelcomeScreen';
import SignInScreen from './components/SignInScreen';
import MainMapScreen from './components/MainMapScreen';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import LocationPermissionScreen from './components/LocationPermissionScreen';
import { useForagingSpots, useCreateSpot, useUpdateSpot, useDeleteSpot } from './hooks/useForagingSpots';
import { queryGeolocationPermission, startUserLocation } from './hooks/useUserLocation';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { usePendingSpots } from './hooks/usePendingSpots';
import type { ForagingSpot } from './lib/types';
import './styles/tokens.css'
import IconShowcase from './components/IconShowcase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './lib/queryClient';

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
  const queryClient = useQueryClient();

  // TanStack Query hooks for data management
  const { data: foragingSpots = [], isLoading: spotsLoading } = useForagingSpots(isAuthenticated);
  const createSpotMutation = useCreateSpot();
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
    return <IconShowcase />;
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

  // Show map screen if authenticated
  if (isAuthenticated && user) {
    return (
      <>
        <MainMapScreen
          user={user}
          foragingSpots={foragingSpots}
          onSignOut={handleSignOut}
          onAddSpot={addForagingSpot}
          onUpdateSpot={updateForagingSpot}
          onDeleteSpot={deleteForagingSpot}
        />
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
      <div className="safe-area-all">
        <AuthProvider>
          <AppContent />
          <PWAUpdatePrompt />
        </AuthProvider>
      </div>
    </ThemeProvider>
  );
}
