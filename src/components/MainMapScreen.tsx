import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import FloatingActionButton from './FloatingActionButton';
import AddEditModal from './AddEditModal';
import PinDetailsDrawer from './PinDetailsDrawer';
import MapView from './MapView';
import type{ User, ForagingSpot, ForagingType, Coordinates } from './types';

interface MainMapScreenProps {
  user: User;
  foragingSpots: ForagingSpot[];
  onSignOut: () => void;
  onAddSpot: (spot: Omit<ForagingSpot, 'id' | 'userId' | 'timestamp'>) => void;
  onUpdateSpot: (spotId: string, updates: Partial<ForagingSpot>) => void;
  onDeleteSpot: (spotId: string) => void;
}

export default function MainMapScreen({ 
  user, 
  foragingSpots, 
  onSignOut, 
  onAddSpot, 
  onUpdateSpot, 
  onDeleteSpot 
}: MainMapScreenProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ForagingSpot | null>(null);
  const [editingSpot, setEditingSpot] = useState<ForagingSpot | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);

  // Get real GPS position
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          setCurrentPosition(null); // No location available
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      console.warn('Geolocation is not supported by this browser');
      setCurrentPosition(null);
    }
  }, []);

  const handleAddSpot = (type: ForagingType, notes: string) => {
    if (!currentPosition) {
      console.warn('Cannot add spot: location not available');
      return;
    }
    
    onAddSpot({
      type,
      coordinates: currentPosition,
      notes,
      sharedWith: []
    });
    setShowAddModal(false);
  };

  const handleEditSpot = (spot: ForagingSpot, type: ForagingType, notes: string) => {
    onUpdateSpot(spot.id, { type, notes });
    setEditingSpot(null);
  };

  const handlePinClick = (spot: ForagingSpot) => {
    setSelectedSpot(spot);
  };

  const handleShare = (spotId: string, email: string) => {
    const spot = foragingSpots.find(s => s.id === spotId);
    if (spot) {
      const updatedSharedWith = [...spot.sharedWith, email];
      onUpdateSpot(spotId, { sharedWith: updatedSharedWith });
    }
  };

  const handleUnshare = (spotId: string, email: string) => {
    const spot = foragingSpots.find(s => s.id === spotId);
    if (spot) {
      const updatedSharedWith = spot.sharedWith.filter(e => e !== email);
      onUpdateSpot(spotId, { sharedWith: updatedSharedWith });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar user={user} onSignOut={onSignOut} />
      
      <div className="flex-1 relative">
        <MapView 
          foragingSpots={foragingSpots}
          currentPosition={currentPosition}
          onPinClick={handlePinClick}
        />
        
        <FloatingActionButton onClick={() => setShowAddModal(true)} />
      </div>

      {showAddModal && currentPosition && (
        <AddEditModal
          coordinates={currentPosition}
          onSave={handleAddSpot}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingSpot && (
        <AddEditModal
          spot={editingSpot}
          coordinates={editingSpot.coordinates}
          onSave={(type, notes) => handleEditSpot(editingSpot, type, notes)}
          onClose={() => setEditingSpot(null)}
        />
      )}

      {selectedSpot && (
        <PinDetailsDrawer
          spot={selectedSpot}
          currentUser={user}
          onClose={() => setSelectedSpot(null)}
          onEdit={() => {
            setEditingSpot(selectedSpot);
            setSelectedSpot(null);
          }}
          onDelete={() => {
            onDeleteSpot(selectedSpot.id);
            setSelectedSpot(null);
          }}
          onShare={handleShare}
          onUnshare={handleUnshare}
        />
      )}
    </div>
  );
}
