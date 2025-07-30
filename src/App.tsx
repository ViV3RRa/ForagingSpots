import { useState, useEffect, useMemo } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import SignInScreen from './components/SignInScreen';
import SignUpScreen from './components/SignUpScreen';
import MainMapScreen from './components/MainMapScreen';
import type{ ForagingSpot, User } from './components/types';
import './styles/tokens.css'

// Mock users database
const mockUsers: User[] = [
  { id: '1', email: 'demo@forager.com', name: 'Demo User', password: 'demo123' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'signin' | 'signup' | 'map'>('welcome');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [foragingSpots, setForagingSpots] = useState<ForagingSpot[]>([]);

  navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => console.log('Geolocation permission status:', permissionStatus.state));

  // Mock foraging spots for demo user
  const mockSpots: ForagingSpot[] = useMemo(() => [
    {
      id: '1',
      userId: '1',
      type: 'chanterelle',
      coordinates: { lat: 60.1695, lng: 24.9354 },
      notes: 'Found near old oak trees, good size specimens',
      timestamp: new Date('2024-07-15T10:30:00'),
      sharedWith: []
    },
    {
      id: '2',
      userId: '1',
      type: 'blueberry',
      coordinates: { lat: 60.1705, lng: 24.9374 },
      notes: 'Small patch but very sweet berries',
      timestamp: new Date('2024-07-20T15:45:00'),
      sharedWith: []
    }
  ], []);

  useEffect(() => {
    // Initialize with mock data if demo user is signed in
    if (currentUser?.id === '1') {
      setForagingSpots(mockSpots);
    }
  }, [currentUser, mockSpots]);

  const handleSignIn = (email: string, password: string): boolean => {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      setCurrentScreen('map');
      return true;
    }
    return false;
  };

  const handleSignUp = (name: string, email: string, password: string): boolean => {
    // In a real app, this would create a new user account
    const newUser: User = {
      id: Math.random().toString(36),
      email,
      name,
      password
    };
    setCurrentUser(newUser);
    setCurrentScreen('map');
    return true;
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setForagingSpots([]);
    setCurrentScreen('welcome');
  };

  const addForagingSpot = (spot: Omit<ForagingSpot, 'id' | 'userId' | 'timestamp'>) => {
    if (!currentUser) return;
    
    const newSpot: ForagingSpot = {
      ...spot,
      id: Math.random().toString(36),
      userId: currentUser.id,
      timestamp: new Date()
    };
    
    setForagingSpots(prev => [...prev, newSpot]);
  };

  const updateForagingSpot = (spotId: string, updates: Partial<ForagingSpot>) => {
    setForagingSpots(prev => 
      prev.map(spot => 
        spot.id === spotId ? { ...spot, ...updates } : spot
      )
    );
  };

  const deleteForagingSpot = (spotId: string) => {
    setForagingSpots(prev => prev.filter(spot => spot.id !== spotId));
  };

  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen 
        onSignIn={() => setCurrentScreen('signin')}
        onSignUp={() => setCurrentScreen('signup')}
      />
    );
  }

  if (currentScreen === 'signin') {
    return (
      <SignInScreen 
        onSignIn={handleSignIn}
        onBack={() => setCurrentScreen('welcome')}
        onSignUp={() => setCurrentScreen('signup')}
      />
    );
  }

  if (currentScreen === 'signup') {
    return (
      <SignUpScreen 
        onSignUp={handleSignUp}
        onBack={() => setCurrentScreen('welcome')}
        onSignIn={() => setCurrentScreen('signin')}
      />
    );
  }

  return (
    <MainMapScreen 
      user={currentUser!}
      foragingSpots={foragingSpots}
      onSignOut={handleSignOut}
      onAddSpot={addForagingSpot}
      onUpdateSpot={updateForagingSpot}
      onDeleteSpot={deleteForagingSpot}
    />
  );
}