import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import FloatingActionButton from './FloatingActionButton';
import AddEditModal from './AddEditModal';
import PinDetailsDrawer from './PinDetailsDrawer';
import MapView from './MapView';
import type { User as NewUser, ForagingSpot, ForagingType, Coordinates } from '../lib/types';
import FilterDialog from './FilterDialog';
import SpotListView from './SpotListView';
import { OfflineBanner } from './OfflineBanner';
import { getAllForagingTypesSet, getTotalForagingTypes } from '../utils/foragingTypes';
import { getForagingSpotConfig } from './icons';
import { useUserLocation } from '../hooks/useUserLocation';
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
  const { position: currentPosition } = useUserLocation();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Center the map on the user the first time a GPS fix arrives (position
  // tracking itself lives in the shared useUserLocation hook)
  useEffect(() => {
    if (currentPosition && !hasInitializedUserPosition) {
      setMapViewState({
        longitude: currentPosition.lng,
        latitude: currentPosition.lat,
        zoom: 18 // Use a reasonable zoom level for user location
      });
      setHasInitializedUserPosition(true);
    }
  }, [currentPosition, hasInitializedUserPosition]);

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

  // Search (driven by the floating top bar) filters both map pins and list rows
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSpots = foragingSpots.filter(spot => {
    if (!activeFilters.has(spot.type)) return false;
    if (normalizedSearch === '') return true;
    return (
      (spot.notes ?? '').toLowerCase().includes(normalizedSearch) ||
      getForagingSpotConfig(spot.type).label.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="relative h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0">
        {viewMode === 'map' ? (
          <MapView
            foragingSpots={filteredSpots}
            onPinClick={setSelectedSpot}
            centerOnSpot={centerOnSpot ? foragingSpots.find(s => s.id === centerOnSpot.id) ?? null : null}
            initialViewState={mapViewState}
            onViewStateChange={handleMapViewStateChange}
          />
        ) : (
          <SpotListView
            foragingSpots={filteredSpots}
            activeFilters={activeFilters}
            searchQuery={searchQuery}
            totalSpots={foragingSpots.length}
            onSpotClick={handleSpotClick}
            onEdit={(spot) => setEditingSpot(spot)}
            onDelete={onDeleteSpot}
            onShare={handleSpotClick}
            onViewOnMap={handleViewOnMap}
            onFilterClick={() => setShowFilterDialog(true)}
            onAddClick={() => setShowAddModal(true)}
            totalTypes={getTotalForagingTypes()}
          />
        )}
      </div>

      <TopBar
        user={user}
        onSignOut={onSignOut}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => setShowFilterDialog(true)}
        hasActiveFilters={activeFilters.size < getTotalForagingTypes()}
      />

      {/* Floats below the top bar instead of pushing content (restyled in subtask 3.2) */}
      <div className="absolute inset-x-0 top-[calc(max(14px,env(safe-area-inset-top))+62px)] z-10">
        <OfflineBanner />
      </div>

      {viewMode === 'map' && currentPosition && <LocationChip position={currentPosition} />}

      <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

      <FloatingActionButton onClick={() => setShowAddModal(true)} />

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

interface ViewToggleProps {
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;
}

// Bottom-centered Kort/Liste pill; active tab is ink-filled in light, gold in dark
function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] left-1/2 z-10 flex -translate-x-1/2 rounded-[16px] border border-line bg-surface p-[5px] shadow-[0_6px_18px_var(--shadow)]">
      {([['map', 'Kort'], ['list', 'Liste']] as const).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewModeChange(mode)}
          className={`rounded-[12px] px-[24px] py-[9px] font-serif text-[14px] font-semibold transition-colors ${
            viewMode === mode
              ? 'bg-ink text-bg dark:bg-accent dark:text-accent-ink'
              : 'text-ink2'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// The design shows a reverse-geocoded locality name ("Silkeborg Skov") here; the
// app has no reverse geocoding, so we show the user's coarse coordinates instead.
function LocationChip({ position }: { position: Coordinates }) {
  const label = `${Math.abs(position.lat).toFixed(3)}° ${position.lat >= 0 ? 'N' : 'S'}, ${Math.abs(position.lng).toFixed(3)}° ${position.lng >= 0 ? 'Ø' : 'V'}`;

  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] left-[max(18px,env(safe-area-inset-left))] z-10 flex items-center gap-[8px] rounded-[12px] border border-line bg-surface px-[13px] py-[8px] shadow-[0_3px_10px_var(--shadow)]">
      <span className="size-[9px] shrink-0 rounded-full bg-brand" />
      <span className="font-mono text-[11px] text-ink2">{label}</span>
    </div>
  );
}
