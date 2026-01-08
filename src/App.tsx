import { useState, useEffect, useCallback } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import SignInScreen from './components/SignInScreen';
import MainMapScreen from './components/MainMapScreen';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useForagingSpots, useCreateSpot, useUpdateSpot, useDeleteSpot } from './hooks/useForagingSpots';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { usePendingSpots } from './hooks/usePendingSpots';
import type { ForagingSpot } from './lib/types';
import './styles/tokens.css'
import IconShowcase from './components/IconShowcase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './lib/queryClient';

function AppContent() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'signin' | 'map' | 'icons'>('welcome');
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

  // Check geolocation permission
  useEffect(() => {
    navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) =>
      console.log('Geolocation permission status:', permissionStatus.state)
    );
  }, []);

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

  // Show loading screen while initializing auth or loading spots
  if (isLoading || (isAuthenticated && spotsLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : 'Loading foraging spots...'}
          </p>
        </div>
      </div>
    );
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
      <MainMapScreen 
        user={user}
        foragingSpots={foragingSpots}
        onSignOut={handleSignOut}
        onAddSpot={addForagingSpot}
        onUpdateSpot={updateForagingSpot}
        onDeleteSpot={deleteForagingSpot}
      />
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
    <div className="safe-area-all">
      <AuthProvider>
        <AppContent />
        <PWAUpdatePrompt />
      </AuthProvider>
    </div>
  );
}
