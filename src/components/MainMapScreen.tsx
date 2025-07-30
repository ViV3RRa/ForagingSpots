import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import FloatingActionButton from './FloatingActionButton';
import AddEditModal from './AddEditModal';
import PinDetailsDrawer from './PinDetailsDrawer';
import MapView from './MapView';
import type { User as NewUser, ForagingSpot as NewForagingSpot, ForagingType, Coordinates } from '../lib/types';
import type { ForagingSpot as OldForagingSpot } from './types';
import { newSpotsToOld, newUserToOld } from '../lib/compatibility';
import FilterButton from './FilterButton';
import FilterDialog from './FilterDialog';
import SpotListView from './SpotListView';

interface MainMapScreenProps {
  user: NewUser;
  foragingSpots: NewForagingSpot[];
  onSignOut: () => void;
  onAddSpot: (spot: Omit<NewForagingSpot, 'id' | 'user' | 'created' | 'updated'>) => void;
  onUpdateSpot: (spotId: string, updates: Partial<NewForagingSpot>) => void;
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
  const [selectedSpot, setSelectedSpot] = useState<OldForagingSpot | null>(null);
  const [editingSpot, setEditingSpot] = useState<OldForagingSpot | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<ForagingType>>(
    new Set(['chanterelle', 'blueberry', 'lingonberry', 'cloudberry', 'other'])
  );
  const [centerOnSpot, setCenterOnSpot] = useState<OldForagingSpot | null>(null);
  
  // Denmark center coordinates for when no location is available
  const denmarkCenter = { lat: 56.0, lng: 10.0 };
  const denmarkZoom = 6;
  
  // Persistent map view state
  const [mapViewState, setMapViewState] = useState({
    longitude: denmarkCenter.lng,
    latitude: denmarkCenter.lat,
    zoom: denmarkZoom
  });
  
  // Track if we've initialized the map position with user's location
  const [hasInitializedUserPosition, setHasInitializedUserPosition] = useState(false);

  // Get real GPS position and initialize map position once
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentPosition(userPosition);
          
          // Only set initial map position if we haven't done so yet
          if (!hasInitializedUserPosition) {
            setMapViewState({
              longitude: userPosition.lng,
              latitude: userPosition.lat,
              zoom: 12 // Use a reasonable zoom level for user location
            });
            setHasInitializedUserPosition(true);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          setCurrentPosition(null); // No location available
          setHasInitializedUserPosition(true); // Mark as initialized even if failed
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
      setHasInitializedUserPosition(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  const handleAddSpot = (type: ForagingType, notes: string) => {
    if (!currentPosition) {
      console.warn('Cannot add spot: location not available');
      return;
    }
    
    onAddSpot({
      type,
      coordinates: currentPosition,
      notes
    });
    setShowAddModal(false);
  };

  const handleEditSpot = (spot: OldForagingSpot, type: ForagingType, notes: string) => {
    onUpdateSpot(spot.id, { type, notes });
    setEditingSpot(null);
  };

  // const handlePinClick = (spot: OldForagingSpot) => {
  //   setSelectedSpot(spot);
  // };

  const handleSpotClick = (spot: OldForagingSpot) => {
    setSelectedSpot(spot);
  };

  // Sharing functionality temporarily disabled - will be implemented with shared_spots collection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleShare = (_spotId: string, _email: string) => {
    console.log('Sharing functionality will be implemented in step 5 with TanStack Query');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUnshare = (_spotId: string, _email: string) => {
    console.log('Unsharing functionality will be implemented in step 5 with TanStack Query');
  };

  const handleApplyFilters = (filters: Set<ForagingType>) => {
    setActiveFilters(filters);
  };

  const handleViewOnMap = (spot: OldForagingSpot) => {
    setViewMode('map');
    // Add a small delay to ensure the map component has mounted before setting centerOnSpot
    setTimeout(() => {
      setCenterOnSpot(spot);
      // Clear the centerOnSpot after the map has had time to center
      setTimeout(() => setCenterOnSpot(null), 3000);
    }, 100);
  };

  const handleMapViewStateChange = (newViewState: { longitude: number; latitude: number; zoom: number }) => {
    setMapViewState(newViewState);
  };

  const filteredSpots = foragingSpots.filter(spot => activeFilters.has(spot.type));
  
  // Convert new types to old types for compatibility with existing components
  const oldUser = newUserToOld(user);
  const oldSpots = newSpotsToOld(foragingSpots);
  const oldFilteredSpots = newSpotsToOld(filteredSpots);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar 
        user={oldUser} 
        onSignOut={onSignOut}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          <>
            <MapView 
              foragingSpots={oldFilteredSpots}
              currentPosition={currentPosition}
              onPinClick={handleSpotClick}
              centerOnSpot={centerOnSpot}
              initialViewState={mapViewState}
              onViewStateChange={handleMapViewStateChange}
            />
            
            <FilterButton
              onClick={() => setShowFilterDialog(true)}
              activeFilters={activeFilters}
              totalTypes={5}
            />
          </>
        ) : (
          <SpotListView
            foragingSpots={oldSpots}
            activeFilters={activeFilters}
            onSpotClick={handleSpotClick}
            onEdit={(spot) => setEditingSpot(spot)}
            onDelete={onDeleteSpot}
            onShare={handleSpotClick}
            onViewOnMap={handleViewOnMap}
            onFilterClick={() => setShowFilterDialog(true)}
            totalTypes={5}
          />
        )}
        
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
          currentUser={oldUser}
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

      <FilterDialog
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
        activeFilters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}
