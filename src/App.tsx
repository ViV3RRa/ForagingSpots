import { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import SignInScreen from './components/SignInScreen';
import MainMapScreen from './components/MainMapScreen';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useForagingSpots, useCreateSpot, useUpdateSpot, useDeleteSpot } from './hooks/useForagingSpots';
import type { ForagingSpot } from './lib/types';
import './styles/tokens.css'

function AppContent() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'signin' | 'map'>('welcome');
  
  // TanStack Query hooks for data management
  const { data: foragingSpots = [], isLoading: spotsLoading } = useForagingSpots();
  const createSpotMutation = useCreateSpot();
  const updateSpotMutation = useUpdateSpot();
  const deleteSpotMutation = useDeleteSpot();

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
  const addForagingSpot = (spot: Omit<ForagingSpot, 'id' | 'user' | 'created' | 'updated'>) => {
    if (!user) return;
    createSpotMutation.mutate(spot);
  };

  const updateForagingSpot = (spotId: string, updates: Partial<ForagingSpot>) => {
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
