import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import FloatingActionButton from './FloatingActionButton';
import AddEditModal from './AddEditModal';
import PinDetailsDrawer from './PinDetailsDrawer';
import MapView from './MapView';
import type { User as NewUser, ForagingSpot, ForagingType, Coordinates } from '../lib/types';
import FilterButton from './FilterButton';
import FilterDialog from './FilterDialog';
import SpotListView from './SpotListView';
import { getAllForagingTypesSet, getTotalForagingTypes } from '../utils/foragingTypes';
import { useUpdateSpot } from '../hooks/useForagingSpots';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

interface MainMapScreenProps {
  user: NewUser;
  foragingSpots: ForagingSpot[];
  onSignOut: () => void;
  onAddSpot: (spot: Omit<ForagingSpot, 'id' | 'user' | 'created' | 'updated' | 'images'> & { images: File[] }) => void;
  onUpdateSpot: (spotId: string, updates: Partial<Omit<ForagingSpot, 'images'>> & { images?: File[]; existingImageFilenames?: string[] }) => void;
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
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<ForagingType>>(getAllForagingTypesSet());
  const [centerOnSpot, setCenterOnSpot] = useState<ForagingSpot | null>(null);
  
  // TanStack Query hooks for optimistic updates
  const queryClient = useQueryClient();
  const updateSpotMutation = useUpdateSpot();
  
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

  // Continuously track user's GPS position
  useEffect(() => {
    if ('geolocation' in navigator) {
      // Get initial position
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
              zoom: 18 // Use a reasonable zoom level for user location
            });
            setHasInitializedUserPosition(true);
          }
        },
        (error) => {
          console.warn('Initial geolocation error:', error.message);
          setCurrentPosition(null);
          setHasInitializedUserPosition(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // 1 minute
        }
      );

      // Set up continuous location tracking
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const userPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentPosition(userPosition);
        },
        (error) => {
          console.warn('Location tracking error:', error.message);
          // Don't set position to null on watch errors, keep the last known position
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000 // 30 seconds
        }
      );

      // Cleanup function to stop watching location
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      console.warn('Geolocation is not supported by this browser');
      setCurrentPosition(null);
      setHasInitializedUserPosition(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddSpot = (type: ForagingType, notes: string, coordinates: Coordinates, images: File[], _existingImageFilenames?: string[]) => {
    // For new spots, existingImageFilenames should be undefined/empty (unused for new spots)
    onAddSpot({
      type,
      coordinates,
      notes,
      images,
      sharedWith: []
    });
    setShowAddModal(false);
  };

  const handleEditSpot = (spot: ForagingSpot, type: ForagingType, notes: string, coordinates: Coordinates, images: File[], existingImageFilenames?: string[]) => {
    onUpdateSpot(spot.id, { type, notes, coordinates, images, existingImageFilenames });
    setEditingSpot(null);
  };

  // const handlePinClick = (spot: OldForagingSpot) => {
  //   setSelectedSpot(spot);
  // };

  const handleSpotClick = (spot: ForagingSpot) => {
    setSelectedSpot(spot);
  };

  // Simple sharing functions with optimistic updates
  const handleShare = (spotId: string, username: string) => {
    const spot = foragingSpots.find(s => s.id === spotId);
    if (spot && !spot.sharedWith?.includes(username)) {
      const updatedSharedWith = [...(spot.sharedWith || []), username];
      const updatedSpot = { ...spot, sharedWith: updatedSharedWith };
      
      // Optimistically update the cache
      queryClient.setQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(s => 
          s.id === spotId 
            ? updatedSpot
            : s
        );
      });
      
      // Update the selected spot state if it's the same spot
      if (selectedSpot?.id === spotId) {
        setSelectedSpot(updatedSpot);
      }
      
      // Update via mutation and invalidate
      updateSpotMutation.mutate(
        { id: spotId, data: { sharedWith: updatedSharedWith } },
        {
          onSettled: () => {
            // Invalidate to refetch from backend
            queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
          }
        }
      );
    }
  };

  const handleUnshare = (spotId: string, username: string) => {
    const spot = foragingSpots.find(s => s.id === spotId);
    if (spot && spot.sharedWith?.includes(username)) {
      const updatedSharedWith = spot.sharedWith.filter(u => u !== username);
      const updatedSpot = { ...spot, sharedWith: updatedSharedWith };
      
      // Optimistically update the cache
      queryClient.setQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(s => 
          s.id === spotId 
            ? updatedSpot
            : s
        );
      });
      
      // Update the selected spot state if it's the same spot
      if (selectedSpot?.id === spotId) {
        setSelectedSpot(updatedSpot);
      }
      
      // Update via mutation and invalidate
      updateSpotMutation.mutate(
        { id: spotId, data: { sharedWith: updatedSharedWith } },
        {
          onSettled: () => {
            // Invalidate to refetch from backend
            queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
          }
        }
      );
    }
  };

  const handleApplyFilters = (filters: Set<ForagingType>) => {
    setActiveFilters(filters);
  };

  const handleViewOnMap = (spot: ForagingSpot) => {
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

  const handleCenterOnUserLocation = () => {
    if (currentPosition) {
      setMapViewState({
        longitude: currentPosition.lng,
        latitude: currentPosition.lat,
        zoom: 18 // Zoom in closer when user manually centers
      });
    }
  };

  const filteredSpots = foragingSpots.filter(spot => activeFilters.has(spot.type));

  return (
    <div className="h-screen flex flex-col bg-gray-50 safe-area-x">
      <TopBar 
        user={user} 
        onSignOut={onSignOut}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          <>
            <MapView 
              foragingSpots={filteredSpots}
              currentPosition={currentPosition}
              onPinClick={setSelectedSpot}
              centerOnSpot={centerOnSpot ? foragingSpots.find(s => s.id === centerOnSpot.id) ?? null : null}
              initialViewState={mapViewState}
              onViewStateChange={handleMapViewStateChange}
              onCenterOnUserLocation={handleCenterOnUserLocation}
            />
            
            <FilterButton
              onClick={() => setShowFilterDialog(true)}
              activeFilters={activeFilters}
              totalTypes={getTotalForagingTypes()}
            />
          </>
        ) : (
          <SpotListView
            foragingSpots={filteredSpots}
            activeFilters={activeFilters}
            onSpotClick={handleSpotClick}
            onEdit={(spot) => setEditingSpot(spot)}
            onDelete={onDeleteSpot}
            onShare={handleSpotClick}
            onViewOnMap={handleViewOnMap}
            onFilterClick={() => setShowFilterDialog(true)}
            totalTypes={getTotalForagingTypes()}
          />
        )}
        
        <FloatingActionButton onClick={() => setShowAddModal(true)} />
      </div>

      {showAddModal && currentPosition && (
        <AddEditModal
          coordinates={currentPosition}
          onSave={(type, notes, coordinates, images, existingImageFilenames) => handleAddSpot(type, notes, coordinates, images, existingImageFilenames)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingSpot && (
        <AddEditModal
          spot={editingSpot}
          coordinates={editingSpot.coordinates}
          onSave={(type, notes, coordinates, images, existingImageFilenames) => handleEditSpot(editingSpot, type, notes, coordinates, images, existingImageFilenames)}
          onClose={() => setEditingSpot(null)}
        />
      )}

      {/* {selectedSpot && ( */}
        <PinDetailsDrawer
          spot={selectedSpot}
          currentUser={user}
          onClose={() => setSelectedSpot(null)}
          onEdit={() => {
            setEditingSpot(selectedSpot);
            setSelectedSpot(null);
          }}
          onDelete={() => {
            if (!selectedSpot) return;
            onDeleteSpot(selectedSpot.id);
            setSelectedSpot(null);
          }}
          onShare={handleShare}
          onUnshare={handleUnshare}
        />
      {/* )} */}

      <FilterDialog
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
        activeFilters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}
